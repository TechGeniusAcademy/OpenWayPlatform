import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useWebSocket } from '../../context/WebSocketContext';
import api, { BASE_URL } from '../../utils/api';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './Chat.css';
import '../../styles/UsernameStyles.css';
import '../../styles/MessageColors.css';

function Chat() {
  const { user } = useAuth();
  const { loadUnreadCount } = useNotifications();
  const { getSocket } = useWebSocket();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState('text');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false); // Загрузка сообщений при переключении чата
  const [allUsers, setAllUsers] = useState([]);
  const [typingUser, setTypingUser] = useState(null); // Кто печатает
  const [onlineUsers, setOnlineUsers] = useState(new Set()); // Онлайн пользователи
  const [frameImages, setFrameImages] = useState({}); // Кэш изображений рамок
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768); // Мобильный режим
  const [showSidebar, setShowSidebar] = useState(true); // Показ сайдбара
  
  const socketRef = useRef();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeChatRef = useRef(activeChat); // Ref для отслеживания активного чата

  // Обновляем ref при изменении activeChat
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Отслеживание размера окна
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setShowSidebar(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadChats();
    loadAllUsers();
    loadFrameImages();
    
    const socket = getSocket();
    if (!socket) return;

    // Сохраняем ссылку на сокет
    socketRef.current = socket;

    // Обработчик новых сообщений
    const handleNewMessage = (message) => {
      // Добавляем сообщение только если это активный чат
      if (activeChatRef.current?.id === message.chat_id) {
        setMessages(prev => [...prev, message]);
      }
      
      // Обновляем список чатов для обновления последнего сообщения
      setChats(prevChats => {
        return prevChats.map(chat => {
          if (chat.id === message.chat_id) {
            // Увеличиваем unread_count только если:
            // 1. Сообщение НЕ от текущего пользователя
            // 2. Это НЕ активный чат
            const isFromMe = message.sender_id === user.id;
            const isActiveChat = activeChatRef.current?.id === message.chat_id;
            const shouldIncreaseUnread = !isFromMe && !isActiveChat;
            
            return {
              ...chat,
              last_message: {
                content: message.content,
                message_type: message.message_type,
                sender_id: message.sender_id,
                created_at: message.created_at
              },
              unread_count: shouldIncreaseUnread ? (chat.unread_count || 0) + 1 : (isActiveChat ? 0 : chat.unread_count || 0)
            };
          }
          return chat;
        });
      });
    };

    const handleChatListUpdate = () => {
      loadChats();
    };

    const handleMessagesRead = (data) => {
      if (data.userId !== user.id) {
        setChats(prevChats => 
          prevChats.map(chat => 
            chat.id === data.chatId ? { ...chat, unread_count: 0 } : chat
          )
        );
      }
    };

    const handleUserTyping = (data) => {
      if (data.userId !== user.id && data.chatId === activeChatRef.current?.id) {
        setTypingUser(data.userName);
      }
    };

    const handleUserStopTyping = (data) => {
      if (data.userId !== user.id) {
        setTypingUser(null);
      }
    };

    const handleUserOnline = (data) => {
      setOnlineUsers(prev => new Set([...prev, data.userId]));
    };

    const handleUserOffline = (data) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    };

    // Подписываемся на события
    socket.on('new-message', handleNewMessage);
    socket.on('chat-list-update', handleChatListUpdate);
    socket.on('messages-read', handleMessagesRead);
    socket.on('user-typing', handleUserTyping);
    socket.on('user-stop-typing', handleUserStopTyping);
    socket.on('user-online', handleUserOnline);
    socket.on('user-offline', handleUserOffline);

    return () => {
      // Отписываемся от событий (но НЕ отключаем сокет)
      socket.off('new-message', handleNewMessage);
      socket.off('chat-list-update', handleChatListUpdate);
      socket.off('messages-read', handleMessagesRead);
      socket.off('user-typing', handleUserTyping);
      socket.off('user-stop-typing', handleUserStopTyping);
      socket.off('user-online', handleUserOnline);
      socket.off('user-offline', handleUserOffline);
    };
  }, [user.id, getSocket]); // Убрали activeChat из зависимостей

  useEffect(() => {
    if (activeChat) {
      // Сохраняем активный чат в sessionStorage для контекста уведомлений
      sessionStorage.setItem('activeChatId', activeChat.id);
      
      // Устанавливаем загрузку
      setLoadingMessages(true);
      
      // Очищаем сообщения перед загрузкой новых
      setMessages([]);
      setPinnedMessages([]);
      
      // Загружаем сообщения
      const loadData = async () => {
        await Promise.all([
          loadMessages(activeChat.id),
          loadPinnedMessages(activeChat.id)
        ]);
        setLoadingMessages(false);
      };
      
      loadData();
      
      const socket = socketRef.current;
      if (socket) {
        socket.emit('join-chat', activeChat.id);
      }
      
      // Отмечаем сообщения как прочитанные
      markAsRead(activeChat.id);
      
      // Обнуляем счетчик непрочитанных сообщений локально
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === activeChat.id ? { ...chat, unread_count: 0 } : chat
        )
      );
    }

    return () => {
      if (activeChat && socketRef.current) {
        socketRef.current.emit('leave-chat', activeChat.id);
      }
      // Очищаем активный чат при размонтировании
      sessionStorage.removeItem('activeChatId');
    };
  }, [activeChat?.id]); // Используем только ID для сравнения

  // Автоскролл только при изменении сообщений, НЕ при изменении typingUser
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/chat');
      setChats(response.data.chats);
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await api.get('/users');
      // Фильтруем только учеников из той же группы (кроме себя)
      setAllUsers(response.data.users.filter(u => 
        u.id !== user.id && 
        u.role === 'student' && 
        u.group_id === user.group_id
      ));
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    }
  };

  const loadFrameImages = async () => {
    try {
      const response = await api.get('/shop/items?type=frame');
      const frames = {};
      response.data.items.forEach(item => {
        if (item.image_url) {
          frames[item.item_key] = item.image_url;
        }
      });
      setFrameImages(frames);
    } catch (error) {
      console.error('Ошибка загрузки рамок:', error);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      const response = await api.get(`/chat/${chatId}/messages`);
      console.log('Loaded messages:', response.data.messages);
      if (response.data.messages.length > 0) {
        console.log('First message sender_message_color:', response.data.messages[0].sender_message_color);
      }
      setMessages(response.data.messages);
      scrollToBottom();
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    }
  };

  const loadPinnedMessages = async (chatId) => {
    try {
      const response = await api.get(`/chat/${chatId}/pinned`);
      setPinnedMessages(response.data);
    } catch (error) {
      console.error('Ошибка загрузки закрепленных сообщений:', error);
    }
  };

  const markAsRead = async (chatId) => {
    try {
      await api.put(`/chat/${chatId}/mark-read`);
      // Уведомляем сервер через WebSocket для обновления других клиентов
      const socket = socketRef.current || getSocket();
      if (socket) {
        socket.emit('mark-read', chatId);
      }
      // Обновляем общий счетчик уведомлений
      loadUnreadCount();
    } catch (error) {
      console.error('Ошибка при пометке сообщений как прочитанные:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const createPrivateChat = async (userId) => {
    try {
      const response = await api.post('/chat/private', { userId });
      await loadChats();
      const newChat = chats.find(c => c.id === response.data.chat.id) || response.data.chat;
      setActiveChat(newChat);
    } catch (error) {
      console.error('Ошибка создания чата:', error);
      alert('Не удалось создать чат');
    }
  };

  const openGroupChat = async () => {
    if (!user.group_id) {
      alert('Вы не состоите в группе');
      return;
    }

    try {
      const response = await api.post('/chat/group', { groupId: user.group_id });
      await loadChats();
      const groupChat = chats.find(c => c.id === response.data.chat.id) || response.data.chat;
      setActiveChat(groupChat);
    } catch (error) {
      console.error('Ошибка открытия группового чата:', error);
      alert('Не удалось открыть групповой чат');
    }
  };

  // Обработка ввода текста (индикатор печати)
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    const socket = socketRef.current;
    if (!activeChat || !socket) return;
    
    // Отправляем событие "начал печатать"
    if (e.target.value.length > 0) {
      socket.emit('typing-start', {
        chatId: activeChat.id,
        userName: user.full_name || user.username
      });
      
      // Очищаем предыдущий таймер
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Через 2 секунды без ввода отправляем "перестал печатать"
      typingTimeoutRef.current = setTimeout(() => {
        if (socket) {
          socket.emit('typing-stop', {
            chatId: activeChat.id
          });
        }
      }, 2000);
    } else {
      // Если поле пустое, сразу отправляем "перестал печатать"
      socket.emit('typing-stop', {
        chatId: activeChat.id
      });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() && !selectedFile) return;
    
    const socket = socketRef.current;
    
    // Отправляем "перестал печатать" при отправке сообщения
    if (socket) {
      socket.emit('typing-stop', {
        chatId: activeChat.id
      });
    }

    try {
      if (selectedFile) {
        // Отправка файла
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('caption', newMessage);

        const response = await api.post(`/chat/${activeChat.id}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const messageWithSender = {
          ...response.data.message,
          sender_full_name: user.full_name,
          sender_username: user.username
        };

        if (socket) {
          socket.emit('send-message', {
            chatId: activeChat.id,
            message: messageWithSender
          });
        }

        // Сообщение добавится через WebSocket событие 'new-message'
        setSelectedFile(null);
      } else {
        // Отправка текста или кода
        const response = await api.post(`/chat/${activeChat.id}/messages`, {
          content: newMessage,
          messageType,
          codeLanguage: messageType === 'code' ? codeLanguage : null
        });

        const messageWithSender = {
          ...response.data.message,
          sender_full_name: user.full_name,
          sender_username: user.username
        };

        if (socket) {
          socket.emit('send-message', {
            chatId: activeChat.id,
            message: messageWithSender
          });
        }

        // Сообщение добавится через WebSocket событие 'new-message'
      }

      setNewMessage('');
      setMessageType('text');
      // scrollToBottom вызовется автоматически через useEffect
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      alert('Не удалось отправить сообщение');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер: 100MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const togglePinChat = async (chatId) => {
    try {
      await api.put(`/chat/${chatId}/pin`);
      loadChats();
    } catch (error) {
      console.error('Ошибка закрепления чата:', error);
    }
  };

  const togglePinMessage = async (messageId) => {
    if (user.role !== 'admin') {
      alert('Только администраторы могут закреплять сообщения');
      return;
    }

    try {
      await api.put(`/chat/messages/${messageId}/pin`);
      loadMessages(activeChat.id);
      loadPinnedMessages(activeChat.id);
    } catch (error) {
      console.error('Ошибка закрепления сообщения:', error);
      alert('Не удалось закрепить сообщение');
    }
  };

  const renderMessage = (message) => {
    const isOwnMessage = message.sender_id === user.id;
    
    // Отладочное логирование
    console.log('Rendering message:', {
      id: message.id,
      sender_message_color: message.sender_message_color,
      isOwnMessage: isOwnMessage,
      content: message.content?.substring(0, 20)
    });

    return (
      <div key={message.id} className={`message ${isOwnMessage ? 'own' : 'other'}`}>
        {!isOwnMessage && (
          <div className="message-avatar-wrapper">
            <div className="message-avatar">
              {message.sender_avatar_url ? (
                <img src={`${BASE_URL}${message.sender_avatar_url}`} alt="" className="avatar-img" />
              ) : (
                <span className="avatar-icon">{(message.sender_full_name || message.sender_username)?.[0]}</span>
              )}
            </div>
            {message.sender_avatar_frame && message.sender_avatar_frame !== 'none' && frameImages[message.sender_avatar_frame] && (
              <img 
                src={`${BASE_URL}${frameImages[message.sender_avatar_frame]}`}
                alt="Frame"
                className="message-avatar-frame"
              />
            )}
          </div>
        )}
        <div className="message-bubble">
          <div className="message-header">
            <span className={`message-sender styled-username ${message.sender_username_style || 'username-none'}`}>
              {message.sender_full_name || message.sender_username}
            </span>
            <span className="message-time">{new Date(message.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {message.message_type === 'code' ? (
            <div className="message-code">
              <div className="code-header">
                <span>{message.code_language}</span>
              </div>
              <SyntaxHighlighter language={message.code_language} style={vscDarkPlus}>
                {message.content}
              </SyntaxHighlighter>
            </div>
          ) : message.message_type === 'file' ? (
            <div className="message-file">
              <span className="file-icon">📎</span>
              <div className="file-info">
                <div className="file-name">{message.file_name}</div>
                <div className="file-size">{(message.file_size / 1024 / 1024).toFixed(2)} MB</div>
                <a 
                  href={`${BASE_URL}/api/chat/files${message.file_path}`} 
                  download={message.file_name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="file-download"
                >
                  Скачать
                </a>
              </div>
              {message.content && <div className="file-caption">{message.content}</div>}
            </div>
          ) : (
            <div className={`message-content ${message.sender_message_color || 'message-none'}`}>{message.content}</div>
          )}

          {user.role === 'admin' && activeChat?.type === 'group' && (
            <button 
              className="pin-message-btn"
              onClick={() => togglePinMessage(message.id)}
              title={message.is_pinned ? 'Открепить' : 'Закрепить'}
            >
              📌
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="chat-loading">Загрузка чатов...</div>;
  }

  return (
    <div className="chat-container">
      {/* Сайдбар с чатами */}
      <div className={`chats-sidebar ${!showSidebar && isMobile ? 'hidden' : ''}`}>
        <div className="sidebar-header">
          <h3>Чаты</h3>
          <div className="sidebar-actions">
            {user.group_id && (
              <button 
                className="btn-group-chat"
                onClick={openGroupChat}
                title="Групповой чат"
              >
                👥
              </button>
            )}
          </div>
        </div>

        {/* Список учеников из группы */}
        {allUsers.length > 0 && (
          <div className="students-section">
            <div className="students-header">
              <h4>Ученики группы</h4>
            </div>
            <div className="students-list">
              {allUsers.map(u => (
                <div 
                  key={u.id} 
                  className="student-item"
                  onClick={() => {
                    createPrivateChat(u.id);
                    if (isMobile) {
                      setShowSidebar(false);
                    }
                  }}
                >
                  <div className="student-avatar-wrapper">
                    <div className="student-avatar">
                      {u.avatar_url ? (
                        <img src={`${BASE_URL}${u.avatar_url}`} alt="" className="avatar-img" />
                      ) : (
                        <span className="avatar-icon">{(u.full_name || u.username)[0]}</span>
                      )}
                    </div>
                    {u.avatar_frame && u.avatar_frame !== 'none' && frameImages[u.avatar_frame] && (
                      <img 
                        src={`${BASE_URL}${frameImages[u.avatar_frame]}`}
                        alt="Frame"
                        className="student-avatar-frame"
                      />
                    )}
                  </div>
                  <div className="student-info">
                    <div className={`student-name styled-username ${u.username_style || 'username-none'}`}>
                      {u.full_name || u.username}
                    </div>
                    <span className={`student-status ${onlineUsers.has(u.id) ? 'online' : 'offline'}`}>
                      {onlineUsers.has(u.id) ? 'Онлайн' : 'Оффлайн'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="chats-section-header">
          <h4>Активные чаты</h4>
        </div>

        <div className="chats-list">
          {chats.length === 0 ? (
            <div className="no-chats">
              <p>Нет чатов</p>
              <small>Создайте новый чат или откройте групповой</small>
            </div>
          ) : (
            chats.map(chat => (
              <div 
                key={chat.id} 
                className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveChat(chat);
                  if (isMobile) {
                    setShowSidebar(false);
                  }
                }}
              >
                <div className="chat-avatar-wrapper">
                  <div className="chat-avatar">
                    {chat.type === 'group' ? (
                      <span className="avatar-icon">👥</span>
                    ) : chat.other_user?.avatar_url ? (
                      <img src={`${BASE_URL}${chat.other_user.avatar_url}`} alt="" className="avatar-img" />
                    ) : (
                      <span className="avatar-icon">{(chat.other_user?.full_name || chat.other_user?.username)?.[0]}</span>
                    )}
                  </div>
                  {chat.type === 'private' && chat.other_user?.avatar_frame && chat.other_user.avatar_frame !== 'none' && frameImages[chat.other_user.avatar_frame] && (
                    <img 
                      src={`${BASE_URL}${frameImages[chat.other_user.avatar_frame]}`}
                      alt="Frame"
                      className="chat-avatar-frame"
                    />
                  )}
                  {chat.type === 'private' && chat.other_user && onlineUsers.has(chat.other_user.id) && (
                    <div className="online-indicator"></div>
                  )}
                </div>
                <div className="chat-info">
                  <div className="chat-name-row">
                    <div className={`chat-name ${chat.type === 'private' && chat.other_user?.username_style ? `styled-username ${chat.other_user.username_style}` : ''}`}>
                      {chat.type === 'group' ? chat.name : (chat.other_user?.full_name || chat.other_user?.username)}
                    </div>
                    {chat.type === 'private' && chat.other_user && (
                      <span className={`online-status ${onlineUsers.has(chat.other_user.id) ? 'online' : 'offline'}`}>
                        {onlineUsers.has(chat.other_user.id) ? 'Онлайн' : 'Оффлайн'}
                      </span>
                    )}
                  </div>
                  {chat.last_message && (
                    <div className="chat-last-message">
                      {chat.last_message.message_type === 'file' ? '📎 Файл' : 
                       chat.last_message.message_type === 'code' ? '💻 Код' : 
                       chat.last_message.content?.substring(0, 30)}
                    </div>
                  )}
                </div>
                <button 
                  className={`pin-chat-btn ${chat.is_pinned ? 'pinned' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePinChat(chat.id);
                  }}
                  title={chat.is_pinned ? 'Открепить' : 'Закрепить'}
                >
                  📌
                </button>
                {chat.unread_count > 0 && (
                  <div className="unread-badge">{chat.unread_count}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Область сообщений */}
      <div className={`messages-area ${showSidebar && isMobile ? 'hidden' : ''} ${loadingMessages ? 'loading' : ''}`}>
        {activeChat ? (
          <>
            <div className="messages-header">
              <div className="chat-title">
                {isMobile && (
                  <button 
                    className="back-button" 
                    onClick={() => setShowSidebar(true)}
                    title="Назад к списку чатов"
                  >
                    ←
                  </button>
                )}
                {activeChat.type === 'group' ? activeChat.name : (activeChat.other_user?.full_name || activeChat.other_user?.username)}
              </div>
            </div>

            {pinnedMessages.length > 0 && (
              <div className="pinned-messages">
                <h4>📌 Закрепленные сообщения</h4>
                {pinnedMessages.map(msg => (
                  <div key={msg.id} className="pinned-message-item">
                    <strong>{msg.sender_full_name}:</strong> {msg.content?.substring(0, 50)}...
                  </div>
                ))}
              </div>
            )}

            <div className="messages-list">
              {messages.map(renderMessage)}
              <div ref={messagesEndRef} />
            </div>

            <form className="message-input-area" onSubmit={handleSendMessage}>
              <div className="input-controls">
                <select 
                  value={messageType} 
                  onChange={(e) => setMessageType(e.target.value)}
                  className="message-type-select"
                >
                  <option value="text">Текст</option>
                  <option value="code">Код</option>
                </select>

                {messageType === 'code' && (
                  <select 
                    value={codeLanguage} 
                    onChange={(e) => setCodeLanguage(e.target.value)}
                    className="code-language-select"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="csharp">C#</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="sql">SQL</option>
                  </select>
                )}

                <button 
                  type="button" 
                  className="btn-file"
                  onClick={() => fileInputRef.current?.click()}
                  title="Прикрепить файл"
                >
                  📎
                </button>
                
                {typingUser && (
                  <div className="typing-indicator">
                    <span className="typing-user">{typingUser}</span> печатает
                    <span className="typing-dots">
                      <span>.</span><span>.</span><span>.</span>
                    </span>
                  </div>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>

              {selectedFile && (
                <div className="selected-file">
                  <span>📎 {selectedFile.name}</span>
                  <button type="button" onClick={() => setSelectedFile(null)}>✕</button>
                </div>
              )}

              <div className="input-row">
                <textarea
                  value={newMessage}
                  onChange={handleTyping}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder={messageType === 'code' ? 'Введите код...' : 'Введите сообщение...'}
                  className="message-input"
                  rows={messageType === 'code' ? 5 : 2}
                />
                <button type="submit" className="btn-send">
                  Отправить
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <h3>Выберите чат для начала общения</h3>
            <p>Или создайте новый приватный чат или откройте групповой</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
