import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import io from 'socket.io-client';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import '../pages/student/Chat.css';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function AdminChat() {
  const { user } = useAuth();
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
  
  const socketRef = useRef();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    loadAllChats();
    
    // Подключение к WebSocket
    socketRef.current = io(SOCKET_URL);
    
    socketRef.current.on('connect', () => {
      console.log('WebSocket подключен (Админ)');
      socketRef.current.emit('register', user.id);
    });

    socketRef.current.on('new-message', (message) => {
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

    socketRef.current.on('messages-read', (data) => {
      // Если кто-то прочитал сообщения, обновляем список чатов
      if (data.userId !== user.id) {
        loadAllChats();
      }
    });

    // Индикатор печати
    socketRef.current.on('user-typing', (data) => {
      if (data.userId !== user.id && data.chatId === activeChat?.id) {
        setTypingUser(data.userName);
      }
    });

    socketRef.current.on('user-stop-typing', (data) => {
      if (data.userId !== user.id) {
        setTypingUser(null);
      }
    });

    // Онлайн статус
    socketRef.current.on('user-online', (data) => {
      setOnlineUsers(prev => new Set([...prev, data.userId]));
    });

    socketRef.current.on('user-offline', (data) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user.id, activeChat]);

  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat.id);
      loadPinnedMessages(activeChat.id);
      socketRef.current.emit('join-chat', activeChat.id);
      
      // Отмечаем сообщения как прочитанные
      markAsRead(activeChat.id);
      
      // Обнуляем счетчик непрочитанных сообщений локально
      setAllChats(prevChats => 
        prevChats.map(chat => 
          chat.id === activeChat.id ? { ...chat, unread_count: 0 } : chat
        )
      );
    }

    return () => {
      if (activeChat && socketRef.current) {
        socketRef.current.emit('leave-chat', activeChat.id);
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
      socketRef.current.emit('mark-read', chatId);
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
    
    if (!activeChat || !socketRef.current) return;
    
    // Отправляем событие "начал печатать"
    if (e.target.value.length > 0) {
      socketRef.current.emit('typing-start', {
        chatId: activeChat.id,
        userName: user.full_name || user.username
      });
      
      // Очищаем предыдущий таймер
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Через 2 секунды без ввода отправляем "перестал печатать"
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('typing-stop', {
          chatId: activeChat.id
        });
      }, 2000);
    } else {
      // Если поле пустое, сразу отправляем "перестал печатать"
      socketRef.current.emit('typing-stop', {
        chatId: activeChat.id
      });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() && !selectedFile) return;

    // Отправляем "перестал печатать" при отправке сообщения
    socketRef.current.emit('typing-stop', {
      chatId: activeChat.id
    });

    try {
      if (selectedFile) {
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

        socketRef.current.emit('send-message', {
          chatId: activeChat.id,
          message: messageWithSender
        });

        setSelectedFile(null);
      } else {
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

        socketRef.current.emit('send-message', {
          chatId: activeChat.id,
          message: messageWithSender
        });
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

  const togglePinMessage = async (messageId) => {
    try {
      await api.put(`/chat/messages/${messageId}/pin`);
      loadMessages(activeChat.id);
      loadPinnedMessages(activeChat.id);
    } catch (error) {
      console.error('Ошибка закрепления сообщения:', error);
    }
  };

  const renderMessage = (message) => {
    const isOwnMessage = message.sender_id === user.id;

    return (
      <div key={message.id} className={`message ${isOwnMessage ? 'own' : 'other'}`}>
        <div className="message-header">
          <span className="message-sender">{message.sender_full_name || message.sender_username}</span>
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
                href={`${SOCKET_URL}/api/chat/files${message.file_path}`} 
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

        <button 
          className="pin-message-btn"
          onClick={() => togglePinMessage(message.id)}
          title={message.is_pinned ? 'Открепить' : 'Закрепить'}
        >
          📌
        </button>
      </div>
    );
  };

  const filteredChats = allChats.filter(chat => {
    if (filterType === 'all') return true;
    return chat.type === filterType;
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
    </div>
  );
}

export default AdminChat;
