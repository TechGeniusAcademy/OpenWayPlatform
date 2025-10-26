import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import api, { BASE_URL } from '../utils/api';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import '../pages/student/Chat.css';

function AdminChat() {
  const { user } = useAuth();
  const { getSocket } = useWebSocket();
  const [allChats, setAllChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState('text');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all', 'private', 'group'
  const [typingUser, setTypingUser] = useState(null); // Кто печатает
  const [onlineUsers, setOnlineUsers] = useState(new Set()); // Онлайн пользователи
  const [replyTo, setReplyTo] = useState(null); // Сообщение для ответа
  const [editingMessage, setEditingMessage] = useState(null); // Редактируемое сообщение
  const [searchQuery, setSearchQuery] = useState(''); // Поиск по сообщениям
  const [allUsers, setAllUsers] = useState([]); // Все пользователи для создания чатов
  const [showCreateChat, setShowCreateChat] = useState(false); // Модал создания чата
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    loadAllChats();
    loadAllUsers();
    
    // Используем глобальный WebSocket
    const socket = getSocket();
    if (!socket) return;
    
    socket.on('new-message', (message) => {
      setMessages(prev => [...prev, message]);
      // scrollToBottom теперь вызывается автоматически через useEffect при изменении messages
      
      // Обновляем список чатов для обновления последнего сообщения
      setAllChats(prevChats => {
        return prevChats.map(chat => {
          if (chat.id === message.chat_id) {
            return {
              ...chat,
              last_message: {
                content: message.content,
                message_type: message.message_type,
                sender_id: message.sender_id,
                created_at: message.created_at
              },
              unread_count: activeChat?.id === message.chat_id ? 0 : (chat.unread_count || 0) + 1
            };
          }
          return chat;
        });
      });
    });

    socket.on('messages-read', (data) => {
      // Если кто-то прочитал сообщения, обновляем список чатов
      if (data.userId !== user.id) {
        loadAllChats();
      }
    });

    // Индикатор печати
    socket.on('user-typing', (data) => {
      if (data.userId !== user.id && data.chatId === activeChat?.id) {
        setTypingUser(data.userName);
      }
    });

    socket.on('user-stop-typing', (data) => {
      if (data.userId !== user.id) {
        setTypingUser(null);
      }
    });

    // Онлайн статус
    socket.on('user-online', (data) => {
      setOnlineUsers(prev => new Set([...prev, data.userId]));
    });

    socket.on('user-offline', (data) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    return () => {
      // Отписываемся от событий
      socket.off('new-message');
      socket.off('messages-read');
      socket.off('user-typing');
      socket.off('user-stop-typing');
      socket.off('user-online');
      socket.off('user-offline');
    };
  }, [user.id, activeChat]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !activeChat) return;
    
    loadMessages(activeChat.id);
    loadPinnedMessages(activeChat.id);
    socket.emit('join-chat', activeChat.id);
      
    // Отмечаем сообщения как прочитанные
    markAsRead(activeChat.id);
      
    // Обнуляем счетчик непрочитанных сообщений локально
    setAllChats(prevChats => 
      prevChats.map(chat => 
        chat.id === activeChat.id ? { ...chat, unread_count: 0 } : chat
      )
    );

    return () => {
      if (activeChat && socket) {
        socket.emit('leave-chat', activeChat.id);
      }
    };
  }, [activeChat]);

  // Автоскролл только при изменении сообщений, НЕ при изменении typingUser
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadAllChats = async () => {
    try {
      setLoading(true);
      // Для админа получаем все чаты через специальный endpoint
      const response = await api.get('/chat/admin/all');
      setAllChats(response.data.chats);
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await api.get('/users');
      setAllUsers(response.data.users || response.data);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    }
  };

  const createPrivateChat = async (userId) => {
    try {
      const response = await api.post('/chat/private', { userId });
      setActiveChat(response.data.chat);
      setShowCreateChat(false);
      loadAllChats();
    } catch (error) {
      console.error('Ошибка создания чата:', error);
      alert('Не удалось создать чат');
    }
  };

  const loadMessages = async (chatId) => {
    try {
      const response = await api.get(`/chat/${chatId}/messages`);
      setMessages(response.data.messages);
      scrollToBottom();
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    }
  };

  const loadPinnedMessages = async (chatId) => {
    try {
      const response = await api.get(`/chat/${chatId}/pinned`);
      setPinnedMessages(response.data.messages);
    } catch (error) {
      console.error('Ошибка загрузки закрепленных сообщений:', error);
    }
  };

  const markAsRead = async (chatId) => {
    try {
      await api.put(`/chat/${chatId}/mark-read`);
      // Уведомляем сервер через WebSocket для обновления других клиентов
      const socket = getSocket();
      if (socket) {
        socket.emit('mark-read', chatId);
      }
    } catch (error) {
      console.error('Ошибка при пометке сообщений как прочитанные:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Обработка ввода текста (индикатор печати)
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    const socket = getSocket();
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
        socket.emit('typing-stop', {
          chatId: activeChat.id
        });
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

    const socket = getSocket();
    if (!socket) return;

    // Отправляем "перестал печатать" при отправке сообщения
    socket.emit('typing-stop', {
      chatId: activeChat.id
    });

    try {
      if (editingMessage) {
        // Редактирование существующего сообщения
        await handleEditMessage(editingMessage.id, newMessage);
        setNewMessage('');
        setEditingMessage(null);
        return;
      }

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('caption', newMessage);
        if (replyTo) {
          formData.append('replyTo', replyTo.id);
        }

        const response = await api.post(`/chat/${activeChat.id}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const messageWithSender = {
          ...response.data.message,
          sender_full_name: user.full_name,
          sender_username: user.username
        };

        socket.emit('send-message', {
          chatId: activeChat.id,
          message: messageWithSender
        });

        setSelectedFile(null);
      } else {
        const response = await api.post(`/chat/${activeChat.id}/messages`, {
          content: newMessage,
          messageType,
          codeLanguage: messageType === 'code' ? codeLanguage : null,
          replyTo: replyTo?.id
        });

        const messageWithSender = {
          ...response.data.message,
          sender_full_name: user.full_name,
          sender_username: user.username
        };

        socket.emit('send-message', {
          chatId: activeChat.id,
          message: messageWithSender
        });
      }

      setNewMessage('');
      setMessageType('text');
      setReplyTo(null);
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

  const togglePinMessage = async (messageId) => {
    try {
      await api.put(`/chat/messages/${messageId}/pin`);
      loadMessages(activeChat.id);
      loadPinnedMessages(activeChat.id);
    } catch (error) {
      console.error('Ошибка закрепления сообщения:', error);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      await api.post(`/chat/messages/${messageId}/reaction`, { emoji });
      loadMessages(activeChat.id);
    } catch (error) {
      console.error('Ошибка добавления реакции:', error);
    }
  };

  const handleEditMessage = async (messageId, newContent) => {
    try {
      await api.put(`/chat/messages/${messageId}`, { content: newContent });
      loadMessages(activeChat.id);
      setEditingMessage(null);
    } catch (error) {
      console.error('Ошибка редактирования сообщения:', error);
      alert('Не удалось отредактировать сообщение');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Удалить сообщение?')) return;
    
    try {
      await api.delete(`/chat/messages/${messageId}`);
      loadMessages(activeChat.id);
    } catch (error) {
      console.error('Ошибка удаления сообщения:', error);
      alert('Не удалось удалить сообщение');
    }
  };

  const handleReply = (message) => {
    setReplyTo(message);
  };

  const renderMessage = (message) => {
    const isOwnMessage = message.sender_id === user.id;

    // Если сообщение редактируется
    if (editingMessage?.id === message.id) {
      return (
        <div key={message.id} className={`message ${isOwnMessage ? 'own' : 'other'} editing`}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleEditMessage(message.id, newMessage);
              }
            }}
            className="edit-message-input"
            autoFocus
          />
          <div className="edit-actions">
            <button onClick={() => handleEditMessage(message.id, newMessage)}>✓</button>
            <button onClick={() => { setEditingMessage(null); setNewMessage(''); }}>✕</button>
          </div>
        </div>
      );
    }

    return (
      <div key={message.id} className={`message ${isOwnMessage ? 'own' : 'other'}`}>
        {message.reply_to_id && (
          <div className="message-reply">
            <div className="reply-indicator">↩️</div>
            <div className="reply-content">
              {message.reply_to_content?.substring(0, 50)}...
            </div>
          </div>
        )}

        <div className="message-header">
          <span className="message-sender">{message.sender_full_name || message.sender_username}</span>
          <span className="message-time">
            {new Date(message.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            {message.is_edited && <span className="edited-badge"> (изменено)</span>}
          </span>
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
          <div className="message-content">{message.content}</div>
        )}

        {/* Реакции */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="message-reactions">
            {message.reactions.map((reaction, idx) => (
              <span key={idx} className="reaction" title={reaction.user_name}>
                {reaction.emoji} {reaction.count > 1 && reaction.count}
              </span>
            ))}
          </div>
        )}

        {/* Действия с сообщением */}
        <div className="message-actions">
          <button 
            className="message-action-btn"
            onClick={() => handleReply(message)}
            title="Ответить"
          >
            ↩️
          </button>
          <button 
            className="message-action-btn"
            onClick={() => togglePinMessage(message.id)}
            title={message.is_pinned ? 'Открепить' : 'Закрепить'}
          >
            📌
          </button>
          <button 
            className="message-action-btn"
            onClick={() => handleReaction(message.id, '👍')}
            title="Лайк"
          >
            👍
          </button>
          <button 
            className="message-action-btn"
            onClick={() => handleReaction(message.id, '❤️')}
            title="Сердце"
          >
            ❤️
          </button>
          {isOwnMessage && (
            <>
              <button 
                className="message-action-btn"
                onClick={() => {
                  setEditingMessage(message);
                  setNewMessage(message.content);
                }}
                title="Редактировать"
              >
                ✏️
              </button>
              <button 
                className="message-action-btn"
                onClick={() => handleDeleteMessage(message.id)}
                title="Удалить"
              >
                🗑️
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const filteredChats = allChats.filter(chat => {
    if (filterType === 'all') return true;
    return chat.type === filterType;
  });

  const filteredMessages = messages.filter(msg => {
    if (!searchQuery) return true;
    return msg.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           msg.sender_full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           msg.sender_username?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return <div className="chat-loading">Загрузка чатов...</div>;
  }

  return (
    <div className="chat-container">
      {/* Сайдбар с чатами */}
      <div className="chats-sidebar">
        <div className="sidebar-header">
          <h3>Все чаты</h3>
          <button 
            className="create-chat-btn"
            onClick={() => setShowCreateChat(true)}
            title="Создать приватный чат"
          >
            ➕
          </button>
        </div>

        <div className="chat-filters">
          <button 
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            Все
          </button>
          <button 
            className={`filter-btn ${filterType === 'private' ? 'active' : ''}`}
            onClick={() => setFilterType('private')}
          >
            Приватные
          </button>
          <button 
            className={`filter-btn ${filterType === 'group' ? 'active' : ''}`}
            onClick={() => setFilterType('group')}
          >
            Групповые
          </button>
        </div>

        <div className="chats-list">
          {filteredChats.length === 0 ? (
            <div className="no-chats">
              <p>Нет чатов</p>
            </div>
          ) : (
            filteredChats.map(chat => (
              <div 
                key={chat.id} 
                className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''}`}
                onClick={() => setActiveChat(chat)}
              >
                <div className="chat-avatar">
                  {chat.type === 'group' ? '👥' : '💬'}
                </div>
                <div className="chat-info">
                  <div className="chat-name">
                    {chat.name || `Чат #${chat.id}`}
                  </div>
                  <div className="chat-type-badge">
                    {chat.type === 'group' ? 'Групповой' : 'Приватный'}
                  </div>
                  {chat.last_message && (
                    <div className="chat-last-message">
                      {chat.last_message.message_type === 'file' ? '📎 Файл' : 
                       chat.last_message.message_type === 'code' ? '💻 Код' : 
                       chat.last_message.content?.substring(0, 30)}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Область сообщений */}
      <div className="messages-area">
        {activeChat ? (
          <>
            <div className="messages-header">
              <div className="chat-title">
                {activeChat.name || `Чат #${activeChat.id}`}
                <span className="chat-type-tag">
                  {activeChat.type === 'group' ? '👥 Групповой' : '💬 Приватный'}
                </span>
              </div>
              <div className="chat-search">
                <input
                  type="text"
                  placeholder="🔍 Поиск по сообщениям..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
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
              {filteredMessages.map(renderMessage)}
              {typingUser && (
                <div className="typing-indicator">
                  <span className="typing-user">{typingUser}</span> печатает
                  <span className="typing-dots">
                    <span>.</span><span>.</span><span>.</span>
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="message-input-area" onSubmit={handleSendMessage}>
              {replyTo && (
                <div className="reply-preview">
                  <div className="reply-preview-content">
                    <strong>Ответ на:</strong> {replyTo.content?.substring(0, 50)}...
                  </div>
                  <button type="button" onClick={() => setReplyTo(null)}>✕</button>
                </div>
              )}

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
            <h3>Выберите чат для просмотра</h3>
            <p>Вы можете просматривать и управлять всеми чатами в системе</p>
          </div>
        )}
      </div>

      {/* Модал создания чата */}
      {showCreateChat && (
        <div className="modal-overlay" onClick={() => setShowCreateChat(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Создать приватный чат</h3>
              <button onClick={() => setShowCreateChat(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="users-list">
                {allUsers.filter(u => u.id !== user.id).map(u => (
                  <div 
                    key={u.id} 
                    className="user-item"
                    onClick={() => createPrivateChat(u.id)}
                  >
                    <div className="user-avatar">
                      {u.avatar_url ? (
                        <img src={`${BASE_URL}${u.avatar_url}`} alt="" />
                      ) : (
                        <div className="avatar-placeholder">
                          {(u.full_name || u.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{u.full_name || u.username}</div>
                      <div className="user-role">{u.role === 'admin' ? 'Админ' : u.role === 'teacher' ? 'Учитель' : 'Студент'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminChat;
