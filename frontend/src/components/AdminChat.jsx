import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import api, { BASE_URL } from '../utils/api';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FaCommentAlt, FaCode } from 'react-icons/fa';
import { 
  BsReply, 
  BsPinFill,
  BsHeart,
  BsHandThumbsUp,
  BsPencil,
  BsTrash,
  BsCheck,
  BsX,
  BsPlusCircle,
  BsPaperclip,
  BsSearch,
  BsCode,
  BsPeopleFill,
  BsChatDots
} from 'react-icons/bs';
import './AdminChatClean.css';

/**
 * ЧИСТАЯ СИСТЕМА АДМИН-ЧАТА
 * 
 * Принципы (те же что и в Student Chat):
 * - Только WebSocket (нет polling)
 * - Сервер = источник правды (нет оптимистических обновлений)
 * - Простая дедупликация (Set с ID)
 * - Моментальное отображение через WebSocket
 * 
 * Особенности админа:
 * - Видит ВСЕ чаты в системе
 * - Может создавать приватные чаты
 * - Может закреплять/откреплять сообщения
 * - Может добавлять реакции
 * - Может редактировать/удалять сообщения
 */

function AdminChat() {
  const { user } = useAuth();
  const { getSocket } = useWebSocket();

  // State
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState('text');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUser, setTypingUser] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  // Refs
  const socketRef = useRef(null);
  const activeChatIdRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const processedIds = useRef(new Set());
  const typingTimeoutRef = useRef(null);

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
      
      await Promise.all([
        loadChats(),
        loadAllUsers(),
        loadOnlineUsers()
      ]);

      const socket = getSocket();
      if (socket) {
        socketRef.current = socket;
        socket.on('new-message', onNewMessage);
        socket.on('messages-read', onMessagesRead);
        socket.on('message-pinned', onMessagePinned);
        socket.on('reaction-updated', onReactionUpdated);
        socket.on('user-online', onUserOnline);
        socket.on('user-offline', onUserOffline);
        socket.on('user-typing', onUserTyping);
        socket.on('user-stop-typing', onUserStopTyping);
      }

      setLoading(false);
    } catch (error) {
      console.error('Ошибка инициализации AdminChat:', error);
      setLoading(false);
    }
  };

  const cleanup = () => {
    const socket = socketRef.current;
    if (socket) {
      socket.off('new-message', onNewMessage);
      socket.off('messages-read', onMessagesRead);
      socket.off('message-pinned', onMessagePinned);
      socket.off('reaction-updated', onReactionUpdated);
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
    if (processedIds.current.has(msg.id)) return;
    processedIds.current.add(msg.id);

    if (activeChatIdRef.current === msg.chat_id) {
      setMessages(prev => [...prev, msg]);
      scrollToBottom();
    }

    loadChats();
  };

  const onMessagesRead = ({ chatId }) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, unread_count: 0 } : c));
  };

  const onMessagePinned = ({ chatId, messageId, isPinned }) => {
    if (activeChatIdRef.current === chatId) {
      loadPinnedMessages(chatId);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_pinned: isPinned } : m));
    }
  };

  const onReactionUpdated = ({ messageId, reactions }) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
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
      const res = await api.get('/chat/admin/all');
      setChats(res.data.chats);
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      const res = await api.get(`/chat/${chatId}/messages`);
      setMessages(res.data.messages);
      
      processedIds.current.clear();
      res.data.messages.forEach(m => processedIds.current.add(m.id));
      
      scrollToBottom();
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    }
  };

  const loadPinnedMessages = async (chatId) => {
    try {
      const res = await api.get(`/chat/${chatId}/pinned`);
      setPinnedMessages(res.data.messages);
    } catch (error) {
      console.error('Ошибка загрузки закрепленных:', error);
    }
  };

  const loadAllUsers = async () => {
    try {
      const res = await api.get('/users');
      setAllUsers(res.data.users || res.data);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
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
    if (activeChatIdRef.current && socketRef.current) {
      socketRef.current.emit('leave-chat', activeChatIdRef.current);
    }

    setActiveChat(chat);
    activeChatIdRef.current = chat.id;
    setMessages([]);
    setPinnedMessages([]);

    if (socketRef.current) {
      socketRef.current.emit('join-chat', chat.id);
    }

    await Promise.all([
      loadMessages(chat.id),
      loadPinnedMessages(chat.id)
    ]);

    await markAsRead(chat.id);
  };

  const markAsRead = async (chatId) => {
    try {
      await api.put(`/chat/${chatId}/mark-read`);
      
      if (socketRef.current) {
        socketRef.current.emit('mark-read', chatId);
      }
      
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, unread_count: 0 } : c));
    } catch (error) {
      console.error('Ошибка mark-read:', error);
    }
  };

  const createPrivateChat = async (userId) => {
    try {
      const res = await api.post('/chat/private', { userId });
      setActiveChat(res.data.chat);
      setShowCreateChat(false);
      loadChats();
    } catch (error) {
      console.error('Ошибка создания чата:', error);
      alert('Не удалось создать чат');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() && !selectedFile) return;
    if (!activeChat) return;

    // Останавливаем индикатор печати
    if (socketRef.current) {
      socketRef.current.emit('typing-stop', { chatId: activeChat.id });
    }

    try {
      if (editingMessage) {
        await handleEditMessage(editingMessage.id, newMessage);
        setNewMessage('');
        setEditingMessage(null);
        return;
      }

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('caption', newMessage);
        if (replyTo) formData.append('replyTo', replyTo.id);

        await api.post(`/chat/${activeChat.id}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        setSelectedFile(null);
      } else {
        await api.post(`/chat/${activeChat.id}/messages`, {
          content: newMessage,
          messageType,
          codeLanguage: messageType === 'code' ? codeLanguage : null,
          replyTo: replyTo?.id
        });
      }

      setNewMessage('');
      setMessageType('text');
      setReplyTo(null);
    } catch (error) {
      console.error('Ошибка отправки:', error);
      alert('Не удалось отправить');
    }
  };

  const togglePinMessage = async (messageId) => {
    try {
      await api.put(`/chat/messages/${messageId}/pin`);
    } catch (error) {
      console.error('Ошибка закрепления:', error);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      const res = await api.post(`/chat/messages/${messageId}/reaction`, { emoji });
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: res.data.reactions } : m));
    } catch (error) {
      console.error('Ошибка реакции:', error);
    }
  };

  const handleEditMessage = async (messageId, newContent) => {
    try {
      await api.put(`/chat/messages/${messageId}`, { content: newContent });
      loadMessages(activeChat.id);
      setEditingMessage(null);
    } catch (error) {
      console.error('Ошибка редактирования:', error);
      alert('Не удалось отредактировать');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Удалить?')) return;
    
    try {
      await api.delete(`/chat/messages/${messageId}`);
      setMessages(prev => prev.filter(m => m.id !== messageId));
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
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('typing-stop', { chatId: activeChat.id });
      }, 2000);
    } else {
      socketRef.current.emit('typing-stop', { chatId: activeChat.id });
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        alert('Файл слишком большой. Макс: 100MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // ============================================================
  // RENDER
  // ============================================================

  const renderMessage = (msg) => {
    const isOwn = msg.sender_id === user.id;

    if (editingMessage?.id === msg.id) {
      return (
        <div key={msg.id} className={`message ${isOwn ? 'own' : 'other'} editing`}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleEditMessage(msg.id, newMessage);
            }}
            className="edit-input"
            autoFocus
          />
          <div className="edit-actions">
            <button onClick={() => handleEditMessage(msg.id, newMessage)}><BsCheck /></button>
            <button onClick={() => { setEditingMessage(null); setNewMessage(''); }}><BsX /></button>
          </div>
        </div>
      );
    }

    return (
      <div key={msg.id} className={`message ${isOwn ? 'own' : 'other'} ${msg.is_pinned ? 'pinned' : ''}`}>
        {msg.is_pinned && (
          <div className="pinned-indicator">
            <BsPinFill /> Закреплено
          </div>
        )}
        
        {msg.reply_to_id && (
          <div className="message-reply">
            <BsReply /> {msg.reply_to_content?.substring(0, 50)}...
          </div>
        )}

        <div className="message-header">
          <span className="sender">{msg.sender_full_name || msg.sender_username}</span>
          <span className="time">
            {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            {msg.is_edited && <span className="edited"> (изм.)</span>}
          </span>
        </div>

        <div className="message-body">
          {msg.message_type === 'code' ? (
            <div className="code-block">
              <div className="code-lang">{msg.code_language}</div>
              <SyntaxHighlighter language={msg.code_language} style={vscDarkPlus}>
                {msg.content}
              </SyntaxHighlighter>
            </div>
          ) : msg.message_type === 'file' ? (
            <div className="file-block">
              <BsPaperclip />
              <div className="file-info">
                <div className="file-name">{msg.file_name}</div>
                <div className="file-size">{(msg.file_size / 1024 / 1024).toFixed(2)} MB</div>
                <a 
                  href={`${BASE_URL}/api/chat/files${msg.file_path}`} 
                  download={msg.file_name}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Скачать
                </a>
              </div>
              {msg.content && <div className="file-caption">{msg.content}</div>}
            </div>
          ) : (
            <p>{msg.content}</p>
          )}
        </div>

        {msg.reactions && msg.reactions.length > 0 && (
          <div className="reactions">
            {msg.reactions.map((r, i) => (
              <span key={i} className="reaction" title={r.user_name}>
                {r.emoji} {r.count > 1 && r.count}
              </span>
            ))}
          </div>
        )}

        <div className="message-actions">
          <button onClick={() => setReplyTo(msg)} title="Ответить"><BsReply /></button>
          <button onClick={() => togglePinMessage(msg.id)} title={msg.is_pinned ? 'Открепить' : 'Закрепить'}><BsPinFill /></button>
          <button onClick={() => handleReaction(msg.id, '👍')} title="Лайк"><BsHandThumbsUp /></button>
          <button onClick={() => handleReaction(msg.id, '❤️')} title="Сердце"><BsHeart /></button>
          {isOwn && (
            <>
              <button onClick={() => { setEditingMessage(msg); setNewMessage(msg.content); }} title="Редактировать"><BsPencil /></button>
              <button onClick={() => handleDeleteMessage(msg.id)} title="Удалить"><BsTrash /></button>
            </>
          )}
        </div>
      </div>
    );
  };

  const filteredChats = chats.filter(c => {
    if (filterType === 'all') return true;
    return c.type === filterType;
  });

  const filteredMessages = messages.filter(m => {
    if (!searchQuery) return true;
    return m.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           m.sender_full_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return <div className="admin-chat-loading">Загрузка...</div>;
  }

  return (
    <div className="admin-chat">
      {/* SIDEBAR */}
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h3>Все чаты</h3>
          <button className="create-btn" onClick={() => setShowCreateChat(true)} title="Создать чат">
            <BsPlusCircle />
          </button>
        </div>

        <div className="filters">
          <button className={filterType === 'all' ? 'active' : ''} onClick={() => setFilterType('all')}>Все</button>
          <button className={filterType === 'private' ? 'active' : ''} onClick={() => setFilterType('private')}>Приватные</button>
          <button className={filterType === 'group' ? 'active' : ''} onClick={() => setFilterType('group')}>Групповые</button>
        </div>

        <div className="chats-list">
          {filteredChats.map(chat => (
            <div 
              key={chat.id} 
              className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''}`}
              onClick={() => selectChat(chat)}
            >
              <div className="chat-icon">
                {chat.type === 'group' ? <BsPeopleFill /> : <BsChatDots />}
              </div>
              <div className="chat-info">
                <div className="chat-name">{chat.name || `Чат #${chat.id}`}</div>
                <div className="chat-badge">{chat.type === 'group' ? 'Групповой' : 'Приватный'}</div>
                {chat.last_message && (
                  <div className="last-msg">
                    {chat.last_message.message_type === 'file' ? <><BsPaperclip /> Файл</> : 
                     chat.last_message.message_type === 'code' ? <><BsCode /> Код</> : 
                     chat.last_message.content?.substring(0, 30)}
                  </div>
                )}
              </div>
              {chat.unread_count > 0 && (
                <div className="unread">{chat.unread_count}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}
      {activeChat ? (
        <div className="chat-main">
          <div className="chat-header">
            <div className="chat-title">
              {activeChat.name || `Чат #${activeChat.id}`}
              <span className="type-badge">
                {activeChat.type === 'group' ? <><BsPeopleFill /> Групповой</> : <><BsChatDots /> Приватный</>}
              </span>
            </div>
            <div className="search-box">
              <BsSearch />
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="messages-container">
            {pinnedMessages.length > 0 && (
              <div className="pinned-section">
                <h4><BsPinFill /> Закреплено</h4>
                {pinnedMessages.map(m => (
                  <div key={m.id} className="pinned-item">
                    <strong>{m.sender_full_name}:</strong> {m.content?.substring(0, 50)}...
                  </div>
                ))}
              </div>
            )}

            {filteredMessages.map(renderMessage)}
            
            {typingUser && (
              <div className="typing">
                <span>{typingUser}</span> печатает<span className="dots">...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <form className="message-input" onSubmit={sendMessage}>
            {replyTo && (
              <div className="reply-preview">
                <div><strong>Ответ на:</strong> {replyTo.content?.substring(0, 50)}...</div>
                <button type="button" onClick={() => setReplyTo(null)}><BsX /></button>
              </div>
            )}

            <div className="input-controls">
              <select value={messageType} onChange={(e) => setMessageType(e.target.value)}>
                <option value="text"><FaCommentAlt /> Текст</option>
                <option value="code"><FaCode /> Код</option>
              </select>

              {messageType === 'code' && (
                <select value={codeLanguage} onChange={(e) => setCodeLanguage(e.target.value)}>
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

              <button type="button" onClick={() => fileInputRef.current?.click()} title="Файл">
                <BsPaperclip />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
            </div>

            {selectedFile && (
              <div className="selected-file">
                <BsPaperclip /> {selectedFile.name}
                <button type="button" onClick={() => setSelectedFile(null)}><BsX /></button>
              </div>
            )}

            <div className="input-row">
              <textarea
                value={newMessage}
                onChange={handleTyping}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(e);
                  }
                }}
                placeholder={messageType === 'code' ? 'Код...' : 'Сообщение...'}
                rows={messageType === 'code' ? 5 : 2}
              />
              <button type="submit">Отправить</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="chat-empty">
          <h3>Выберите чат</h3>
          <p>Управление всеми чатами в системе</p>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateChat && (
        <div className="modal-overlay" onClick={() => setShowCreateChat(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Создать приватный чат</h3>
              <button onClick={() => setShowCreateChat(false)}><BsX /></button>
            </div>
            <div className="modal-body">
              {allUsers.filter(u => u.id !== user.id).map(u => (
                <div key={u.id} className="user-item" onClick={() => createPrivateChat(u.id)}>
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
                    <div className="user-role">
                      {u.role === 'admin' ? 'Админ' : u.role === 'teacher' ? 'Учитель' : 'Студент'}
                    </div>
                  </div>
                  {onlineUsers.has(u.id) && <div className="online-dot"></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminChat;
