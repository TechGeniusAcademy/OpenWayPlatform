import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import io from 'socket.io-client';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './Chat.css';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function Chat() {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState('text');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUsersList, setShowUsersList] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  
  const socketRef = useRef();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadChats();
    loadAllUsers();
    
    // Подключение к WebSocket
    socketRef.current = io(SOCKET_URL);
    
    socketRef.current.on('connect', () => {
      console.log('WebSocket подключен');
      socketRef.current.emit('register', user.id);
    });

    socketRef.current.on('new-message', (message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
      
      // Обновляем список чатов для обновления последнего сообщения
      setChats(prevChats => {
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

    socketRef.current.on('chat-list-update', () => {
      // Обновляем список чатов при изменениях
      loadChats();
    });

    socketRef.current.on('messages-read', (data) => {
      // Если кто-то прочитал сообщения, обновляем список чатов
      if (data.userId !== user.id) {
        loadChats();
      }
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
    };
  }, [activeChat]);

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
      setAllUsers(response.data.users.filter(u => u.id !== user.id && u.role === 'student'));
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
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
      setPinnedMessages(response.data);
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

  const createPrivateChat = async (userId) => {
    try {
      const response = await api.post('/chat/private', { userId });
      await loadChats();
      const newChat = chats.find(c => c.id === response.data.chat.id) || response.data.chat;
      setActiveChat(newChat);
      setShowUsersList(false);
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

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() && !selectedFile) return;

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

        socketRef.current.emit('send-message', {
          chatId: activeChat.id,
          message: messageWithSender
        });

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

        socketRef.current.emit('send-message', {
          chatId: activeChat.id,
          message: messageWithSender
        });

        // Сообщение добавится через WebSocket событие 'new-message'
      }

      setNewMessage('');
      setMessageType('text');
      scrollToBottom();
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
                href={`http://localhost:5000/api/chat/files${message.file_path}`} 
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
    );
  };

  if (loading) {
    return <div className="chat-loading">Загрузка чатов...</div>;
  }

  return (
    <div className="chat-container">
      {/* Сайдбар с чатами */}
      <div className="chats-sidebar">
        <div className="sidebar-header">
          <h3>Чаты</h3>
          <div className="sidebar-actions">
            <button 
              className="btn-new-chat"
              onClick={() => setShowUsersList(!showUsersList)}
              title="Новый чат"
            >
              ➕
            </button>
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

        {showUsersList && (
          <div className="users-list">
            <div className="users-list-header">
              <h4>Выберите собеседника</h4>
              <button onClick={() => setShowUsersList(false)}>✕</button>
            </div>
            {allUsers.map(u => (
              <div 
                key={u.id} 
                className="user-item"
                onClick={() => createPrivateChat(u.id)}
              >
                <div className="user-avatar">{(u.full_name || u.username)[0]}</div>
                <div className="user-info">
                  <div className="user-name">{u.full_name || u.username}</div>
                  {u.group_name && <div className="user-group">{u.group_name}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

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
                onClick={() => setActiveChat(chat)}
              >
                <div className="chat-avatar">
                  {chat.type === 'group' ? '👥' : (chat.other_user?.full_name || chat.other_user?.username)?.[0]}
                </div>
                <div className="chat-info">
                  <div className="chat-name">
                    {chat.type === 'group' ? chat.name : (chat.other_user?.full_name || chat.other_user?.username)}
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
      <div className="messages-area">
        {activeChat ? (
          <>
            <div className="messages-header">
              <div className="chat-title">
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
                  onChange={(e) => setNewMessage(e.target.value)}
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
