import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useWebSocket } from '../../context/WebSocketContext';
import api, { BASE_URL } from '../../utils/api';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { BsPeopleFill, BsPencil, BsTrash } from 'react-icons/bs';
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
  // RENDER
  // ============================================================

  if (loading) {
    return <div className="chat-page"><div className="loading">Загрузка...</div></div>;
  }

  return (
    <div className="chat-page">
      {/* SIDEBAR */}
      <div className="chat-sidebar">
        <h2>Чаты</h2>
        <div className="chat-list">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''}`}
              onClick={() => selectChat(chat)}
            >
              <div className="chat-info">
                <div className="chat-name">
                  {chat.type === 'group' ? (
                    <><BsPeopleFill /> {chat.name}</>
                  ) : (
                    chat.other_user?.full_name || chat.other_user?.username
                  )}
                </div>
                <div className="chat-last-message">
                  {chat.last_message?.content?.substring(0, 40) || 'Нет сообщений'}
                </div>
              </div>
              
              {chat.unread_count > 0 && (
                <div className="unread-badge">{chat.unread_count}</div>
              )}
              
              {chat.type === 'private' && onlineUsers.has(chat.other_user?.id) && (
                <div className="online-indicator"></div>
              )}
            </div>
          ))}
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
              >
                <div className="message-content">
                  {msg.message_type === 'code' ? (
                    <SyntaxHighlighter language="javascript" style={vscDarkPlus}>
                      {msg.content}
                    </SyntaxHighlighter>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
                
                <div className="message-meta">
                  <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                  
                  {msg.sender_id === user.id && (
                    <>
                      <button onClick={() => deleteMessage(msg.id)}>
                        <BsTrash />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form className="message-input" onSubmit={sendMessage}>
            <select value={messageType} onChange={e => setMessageType(e.target.value)}>
              <option value="text">💬 Текст</option>
              <option value="code">💻 Код</option>
            </select>
            
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder="Введите сообщение..."
              autoFocus
            />
            
            <button type="submit">Отправить</button>
          </form>
        </div>
      ) : (
        <div className="chat-empty">
          <p>Выберите чат для начала общения</p>
        </div>
      )}
    </div>
  );
}

export default Chat;
