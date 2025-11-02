import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useWebSocket } from '../../context/WebSocketContext';
import api, { BASE_URL } from '../../utils/api';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  BsPeopleFill, BsPencil, BsTrash, BsSearch, BsPlus, BsX, 
  BsReply, BsEmojiSmile, BsCheck2All, BsCheck, BsPaperclip,
  BsImage, BsFileEarmarkText, BsDownload, BsThreeDots
} from 'react-icons/bs';
import './ChatClean.css';

/**
 * ЧИСТАЯ СИСТЕМА ЧАТА
 * 
 * Принципы:
 * - Только WebSocket (нет polling)
 * - Сервер = источник правды (нет оптимистических обновлений)
 * - Простая дедупликация (Set с ID)
 * - Моментальное отображение через WebSocket
 */

function Chat() {
  const { user } = useAuth();
  const { loadUnreadCount } = useNotifications();
  const { getSocket } = useWebSocket();

  // State
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState('text');
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUser, setTypingUser] = useState(null);
  
  // Новые состояния
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  // Refs
  const socketRef = useRef(null);
  const activeChatIdRef = useRef(null);
  const messagesEndRef = useRef(null);
  const processedIds = useRef(new Set());

  // ============================================================
  // INITIALIZATION
  // ============================================================

  useEffect(() => {
    init();
    return cleanup;
  }, [user?.id]);

  const init = async () => {
    try {
      setLoading(true);
      
      // Загружаем данные
      await Promise.all([
        loadChats(),
        loadOnlineUsers()
      ]);

      // Подключаем WebSocket
      const socket = getSocket();
      if (socket) {
        socketRef.current = socket;
        socket.on('new-message', onNewMessage);
        socket.on('messages-read', onMessagesRead);
        socket.on('user-online', onUserOnline);
        socket.on('user-offline', onUserOffline);
        socket.on('user-typing', onUserTyping);
        socket.on('user-stop-typing', onUserStopTyping);
      }

      setLoading(false);
    } catch (error) {
      console.error('Ошибка инициализации:', error);
      setLoading(false);
    }
  };

  const cleanup = () => {
    const socket = socketRef.current;
    if (socket) {
      socket.off('new-message', onNewMessage);
      socket.off('messages-read', onMessagesRead);
      socket.off('user-online', onUserOnline);
      socket.off('user-offline', onUserOffline);
      socket.off('user-typing', onUserTyping);
      socket.off('user-stop-typing', onUserStopTyping);
    }
  };

  // ============================================================
  // WEBSOCKET HANDLERS
  // ============================================================

  const onNewMessage = (msg) => {
    // Дедупликация
    if (processedIds.current.has(msg.id)) return;
    processedIds.current.add(msg.id);

    // Добавляем в активный чат
    if (activeChatIdRef.current === msg.chat_id) {
      setMessages(prev => [...prev, msg]);
      scrollToBottom();
    }

    // Обновляем список чатов
    loadChats();
  };

  const onMessagesRead = ({ chatId }) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, unread_count: 0 } : c));
  };

  const onUserOnline = ({ userId }) => {
    setOnlineUsers(prev => new Set([...prev, userId]));
  };

  const onUserOffline = ({ userId }) => {
    setOnlineUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  };

  const onUserTyping = ({ userId, userName, chatId }) => {
    if (userId !== user.id && chatId === activeChatIdRef.current) {
      setTypingUser(userName);
    }
  };

  const onUserStopTyping = ({ userId }) => {
    if (userId !== user.id) {
      setTypingUser(null);
    }
  };

  // ============================================================
  // DATA LOADING
  // ============================================================

  const loadChats = async () => {
    try {
      const res = await api.get('/chat');
      setChats(res.data.chats);
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      const res = await api.get(`/chat/${chatId}/messages`);
      setMessages(res.data.messages);
      
      // Обновляем processedIds
      processedIds.current.clear();
      res.data.messages.forEach(m => processedIds.current.add(m.id));
      
      scrollToBottom();
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const res = await api.get('/users/online');
      setOnlineUsers(new Set(res.data.users.map(u => u.id)));
    } catch (error) {
      console.error('Ошибка загрузки онлайн:', error);
    }
  };

  // ============================================================
  // ACTIONS
  // ============================================================

  const selectChat = async (chat) => {
    // Покидаем старый чат
    if (activeChatIdRef.current && socketRef.current) {
      socketRef.current.emit('leave-chat', activeChatIdRef.current);
    }

    // Устанавливаем новый
    setActiveChat(chat);
    activeChatIdRef.current = chat.id;
    setMessages([]);

    // Присоединяемся
    if (socketRef.current) {
      socketRef.current.emit('join-chat', chat.id);
    }

    // Загружаем сообщения
    await loadMessages(chat.id);

    // Отмечаем прочитанным
    await markAsRead(chat.id);
  };

  const markAsRead = async (chatId) => {
    try {
      await api.put(`/chat/${chatId}/mark-read`);
      
      if (socketRef.current) {
        socketRef.current.emit('mark-read', chatId);
      }
      
      loadUnreadCount();
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, unread_count: 0 } : c));
    } catch (error) {
      console.error('Ошибка mark-read:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !activeChat) return;

    try {
      await api.post(`/chat/${activeChat.id}/messages`, {
        content: newMessage,
        messageType: messageType
      });

      // Очищаем форму
      setNewMessage('');
      setMessageType('text');

      // Сообщение придет через WebSocket автоматически
    } catch (error) {
      console.error('Ошибка отправки:', error);
      alert('Не удалось отправить');
    }
  };

  const deleteMessage = async (msgId) => {
    if (!confirm('Удалить?')) return;
    
    try {
      await api.delete(`/chat/messages/${msgId}`);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (error) {
      console.error('Ошибка удаления:', error);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!socketRef.current || !activeChat) return;
    
    if (e.target.value.length > 0) {
      socketRef.current.emit('typing-start', {
        chatId: activeChat.id,
        userName: user.full_name || user.username
      });
    } else {
      socketRef.current.emit('typing-stop', { chatId: activeChat.id });
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // ============================================================
  // NEW FEATURES
  // ============================================================

  // Поиск по чатам
  const filteredChats = chats.filter(chat => {
    const name = chat.type === 'group' 
      ? chat.name 
      : (chat.other_user?.full_name || chat.other_user?.username || '');
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Загрузка файла
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Файл слишком большой (макс. 10MB)');
        return;
      }
      setSelectedFile(file);
    }
  };

  // Отправка файла
  const uploadFile = async () => {
    if (!selectedFile || !activeChat) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('messageType', 'file');

    try {
      await api.post(`/chat/${activeChat.id}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSelectedFile(null);
    } catch (error) {
      console.error('Ошибка загрузки файла:', error);
      alert('Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  // Редактирование сообщения
  const editMessage = async (msgId, newContent) => {
    try {
      await api.put(`/chat/messages/${msgId}`, { content: newContent });
      setMessages(prev => prev.map(m => 
        m.id === msgId ? { ...m, content: newContent, edited: true } : m
      ));
      setEditingMessage(null);
    } catch (error) {
      console.error('Ошибка редактирования:', error);
    }
  };

  // Ответ на сообщение
  const replyToMessage = (msg) => {
    setReplyingTo(msg);
    document.querySelector('.message-input input')?.focus();
  };

  // Добавить эмодзи
  const addEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Контекстное меню
  const showContextMenu = (e, msg) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      message: msg
    });
  };

  // Закрыть контекстное меню при клике вне
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return <div className="chat-page"><div className="loading">Загрузка...</div></div>;
  }

  return (
    <div className="chat-page">
      {/* SIDEBAR */}
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h2>Чаты</h2>
          <button 
            className="btn-icon" 
            onClick={() => setShowNewChatModal(true)}
            title="Новый чат"
          >
            <BsPlus size={24} />
          </button>
        </div>

        {/* Поиск */}
        <div className="search-box">
          <BsSearch />
          <input
            type="text"
            placeholder="Поиск чатов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <BsX size={20} />
            </button>
          )}
        </div>

        <div className="chat-list">
          {filteredChats.length === 0 ? (
            <div className="no-chats">
              <p>Чаты не найдены</p>
            </div>
          ) : (
            filteredChats.map(chat => (
              <div
                key={chat.id}
                className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''}`}
                onClick={() => selectChat(chat)}
              >
                {/* Аватар */}
                <div className="chat-avatar">
                  {chat.type === 'group' ? (
                    <div className="avatar-group">
                      <BsPeopleFill size={20} />
                    </div>
                  ) : (
                    <div 
                      className="avatar-single"
                      style={{
                        backgroundImage: chat.other_user?.avatar_url 
                          ? `url(${BASE_URL}${chat.other_user.avatar_url})` 
                          : 'none',
                        backgroundColor: chat.other_user?.avatar_url ? 'transparent' : '#1da1f2'
                      }}
                    >
                      {!chat.other_user?.avatar_url && (
                        (chat.other_user?.full_name?.[0] || chat.other_user?.username?.[0] || '?').toUpperCase()
                      )}
                    </div>
                  )}
                  {chat.type === 'private' && onlineUsers.has(chat.other_user?.id) && (
                    <div className="online-dot"></div>
                  )}
                </div>

                <div className="chat-info">
                  <div className="chat-name">
                    {chat.type === 'group' 
                      ? chat.name 
                      : (chat.other_user?.full_name || chat.other_user?.username)
                    }
                  </div>
                  <div className="chat-last-message">
                    {chat.last_message?.content?.substring(0, 50) || 'Нет сообщений'}
                  </div>
                </div>
                
                <div className="chat-meta">
                  {chat.last_message?.created_at && (
                    <div className="chat-time">
                      {new Date(chat.last_message.created_at).toLocaleDateString() === new Date().toLocaleDateString()
                        ? new Date(chat.last_message.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
                        : new Date(chat.last_message.created_at).toLocaleDateString('ru', { day: 'numeric', month: 'short' })
                      }
                    </div>
                  )}
                  {chat.unread_count > 0 && (
                    <div className="unread-badge">{chat.unread_count}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MAIN CHAT */}
      {activeChat ? (
        <div className="chat-main">
          <div className="chat-header">
            <h3>
              {activeChat.type === 'group' 
                ? activeChat.name 
                : activeChat.other_user?.full_name}
            </h3>
            {typingUser && <div className="typing-indicator">{typingUser} печатает...</div>}
          </div>

          <div className="messages-container">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`message ${msg.sender_id === user.id ? 'own' : 'other'}`}
                onContextMenu={(e) => showContextMenu(e, msg)}
              >
                {/* Аватар для чужих сообщений */}
                {msg.sender_id !== user.id && activeChat?.type === 'group' && (
                  <div 
                    className="message-avatar"
                    style={{
                      backgroundImage: msg.sender?.avatar_url 
                        ? `url(${BASE_URL}${msg.sender.avatar_url})` 
                        : 'none',
                      backgroundColor: msg.sender?.avatar_url ? 'transparent' : '#657786'
                    }}
                  >
                    {!msg.sender?.avatar_url && (msg.sender?.full_name?.[0] || '?').toUpperCase()}
                  </div>
                )}

                <div className="message-bubble">
                  {/* Имя отправителя в группе */}
                  {msg.sender_id !== user.id && activeChat?.type === 'group' && (
                    <div className="message-sender-name">
                      {msg.sender?.full_name || msg.sender?.username}
                    </div>
                  )}

                  {/* Цитата */}
                  {msg.reply_to && (
                    <div className="message-reply">
                      <div className="reply-line"></div>
                      <div className="reply-content">
                        <div className="reply-author">{msg.reply_to.sender?.full_name}</div>
                        <div className="reply-text">{msg.reply_to.content?.substring(0, 50)}</div>
                      </div>
                    </div>
                  )}

                  <div className="message-content">
                    {msg.message_type === 'code' ? (
                      <SyntaxHighlighter language="javascript" style={vscDarkPlus}>
                        {msg.content}
                      </SyntaxHighlighter>
                    ) : msg.message_type === 'file' ? (
                      <div className="message-file">
                        {msg.file_path?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                          <img src={`${BASE_URL}${msg.file_path}`} alt="File" />
                        ) : (
                          <a href={`${BASE_URL}${msg.file_path}`} download className="file-link">
                            <BsFileEarmarkText size={24} />
                            <span>{msg.file_name || 'Файл'}</span>
                            <BsDownload size={16} />
                          </a>
                        )}
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                  
                  <div className="message-meta">
                    <span>{new Date(msg.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}</span>
                    {msg.edited && <span className="edited-label">(изменено)</span>}
                    {msg.sender_id === user.id && (
                      msg.is_read ? <BsCheck2All className="read-status" /> : <BsCheck className="read-status" />
                    )}
                  </div>

                  {/* Быстрые действия */}
                  <div className="message-actions">
                    <button onClick={() => replyToMessage(msg)} title="Ответить">
                      <BsReply />
                    </button>
                    {msg.sender_id === user.id && (
                      <>
                        <button onClick={() => setEditingMessage(msg)} title="Редактировать">
                          <BsPencil />
                        </button>
                        <button onClick={() => deleteMessage(msg.id)} title="Удалить">
                          <BsTrash />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Панель редактирования/ответа */}
          {(replyingTo || editingMessage || selectedFile) && (
            <div className="action-panel">
              {replyingTo && (
                <div className="reply-preview">
                  <BsReply />
                  <div className="reply-info">
                    <strong>Ответ для {replyingTo.sender?.full_name}</strong>
                    <p>{replyingTo.content?.substring(0, 50)}</p>
                  </div>
                  <button onClick={() => setReplyingTo(null)}>
                    <BsX size={20} />
                  </button>
                </div>
              )}
              {editingMessage && (
                <div className="edit-preview">
                  <BsPencil />
                  <div className="edit-info">
                    <strong>Редактирование сообщения</strong>
                    <p>{editingMessage.content?.substring(0, 50)}</p>
                  </div>
                  <button onClick={() => setEditingMessage(null)}>
                    <BsX size={20} />
                  </button>
                </div>
              )}
              {selectedFile && (
                <div className="file-preview">
                  <BsPaperclip />
                  <div className="file-info">
                    <strong>{selectedFile.name}</strong>
                    <p>{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={() => setSelectedFile(null)}>
                    <BsX size={20} />
                  </button>
                </div>
              )}
            </div>
          )}

          <form className="message-input" onSubmit={editingMessage ? (e) => {
            e.preventDefault();
            editMessage(editingMessage.id, newMessage);
            setNewMessage('');
          } : sendMessage}>
            {/* Кнопка файла */}
            <label className="btn-file" title="Прикрепить файл">
              <BsPaperclip size={20} />
              <input
                type="file"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>

            {/* Кнопка эмодзи */}
            <button 
              type="button"
              className="btn-emoji"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Эмодзи"
            >
              <BsEmojiSmile size={20} />
            </button>

            {/* Панель эмодзи */}
            {showEmojiPicker && (
              <div className="emoji-picker">
                {['😊', '😂', '❤️', '👍', '🎉', '🔥', '👏', '🙏', '💯', '✨', '🚀', '💪', '😎', '🤔', '😍'].map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => addEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Выбор типа */}
            <select value={messageType} onChange={e => setMessageType(e.target.value)}>
              <option value="text">💬 Текст</option>
              <option value="code">💻 Код</option>
            </select>
            
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder={editingMessage ? "Редактирование..." : "Введите сообщение..."}
              autoFocus
            />
            
            {selectedFile ? (
              <button 
                type="button" 
                onClick={uploadFile}
                disabled={uploading}
              >
                {uploading ? 'Загрузка...' : 'Отправить файл'}
              </button>
            ) : (
              <button type="submit" disabled={!newMessage.trim()}>
                {editingMessage ? 'Сохранить' : 'Отправить'}
              </button>
            )}
          </form>
        </div>
      ) : (
        <div className="chat-empty">
          <BsPeopleFill size={64} style={{ opacity: 0.3 }} />
          <p>Выберите чат для начала общения</p>
          <button onClick={() => setShowNewChatModal(true)} className="btn-primary">
            <BsPlus size={20} />
            Создать новый чат
          </button>
        </div>
      )}

      {/* Контекстное меню */}
      {contextMenu && (
        <div 
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={() => {
            replyToMessage(contextMenu.message);
            setContextMenu(null);
          }}>
            <BsReply /> Ответить
          </button>
          {contextMenu.message.sender_id === user.id && (
            <>
              <button onClick={() => {
                setEditingMessage(contextMenu.message);
                setNewMessage(contextMenu.message.content);
                setContextMenu(null);
              }}>
                <BsPencil /> Редактировать
              </button>
              <button onClick={() => {
                deleteMessage(contextMenu.message.id);
                setContextMenu(null);
              }}>
                <BsTrash /> Удалить
              </button>
            </>
          )}
        </div>
      )}

      {/* Модальное окно создания чата */}
      {showNewChatModal && (
        <div className="modal-overlay" onClick={() => setShowNewChatModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Новый чат</h3>
              <button onClick={() => setShowNewChatModal(false)}>
                <BsX size={24} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ textAlign: 'center', color: '#657786' }}>
                Функция создания новых чатов будет добавлена в следующей версии
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;
