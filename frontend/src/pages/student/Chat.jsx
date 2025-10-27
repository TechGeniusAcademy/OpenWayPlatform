import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useWebSocket } from '../../context/WebSocketContext';
import api, { BASE_URL } from '../../utils/api';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  BsReply, BsPinFill, BsHeart, BsHandThumbsUp, BsPencil, BsTrash, 
  BsCheck, BsX, BsPaperclip, BsCode, BsChatDots, BsPeopleFill 
} from 'react-icons/bs';
import './Chat.css';
import '../../styles/UsernameStyles.css';
import '../../styles/MessageColors.css';

/**
 * НОВАЯ СИСТЕМА ЧАТА - ЧИСТАЯ АРХИТЕКТУРА
 * 
 * Принципы:
 * 1. Только WebSocket для real-time обновлений (нет polling)
 * 2. Один источник правды - сервер (нет оптимистических обновлений)
 * 3. Простая дедупликация через Set с ID сообщений
 * 4. Минимум state, максимум ссылок (refs)
 * 5. Четкое разделение ответственности
 */

const EmojiIcon = ({ emoji }) => {
  if (emoji === '👍') return <BsHandThumbsUp />;
  if (emoji === '❤️') return <BsHeart />;
  return <span>{emoji}</span>;
};

const detectLanguage = (code) => {
  if (code.includes('<?php')) return 'php';
  if (code.includes('<!DOCTYPE') || code.includes('<html')) return 'markup';
  if (code.includes('function') && code.includes('=>')) return 'javascript';
  if (code.includes('def ') || code.includes('import ')) return 'python';
  if (code.includes('SELECT') && code.includes('FROM')) return 'sql';
  return 'javascript';
};

function ChatNew() {
  const { user } = useAuth();
  const { loadUnreadCount } = useNotifications();
  const { getSocket } = useWebSocket();

  // Основные state
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  // UI state
  const [messageType, setMessageType] = useState('text');
  const [selectedFile, setSelectedFile] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Refs для оптимизации
  const socketRef = useRef(null);
  const activeChatIdRef = useRef(null);
  const messagesEndRef = useRef(null);
  const processedMessageIds = useRef(new Set()); // Простая дедупликация по ID
  
  // =============================================================================
  // INITIALIZATION - Загрузка данных при монтировании
  // =============================================================================
  
  useEffect(() => {
    loadInitialData();
    setupSocketListeners();
    
    return () => cleanupSocketListeners();
  }, [user?.id]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadChats(),
        loadOnlineUsers()
      ]);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  // =============================================================================
  // WEBSOCKET SETUP - Настройка слушателей WebSocket
  // =============================================================================
  
  const setupSocketListeners = () => {
    const socket = getSocket();
    if (!socket) {
      console.warn('Socket не готов при монтировании');
      return;
    }
    
    socketRef.current = socket;
    
    // Один обработчик для новых сообщений
    socket.on('new-message', handleNewMessage);
    socket.on('messages-read', handleMessagesRead);
    socket.on('user-online', handleUserOnline);
    socket.on('user-offline', handleUserOffline);
    socket.on('user-typing', handleUserTyping);
    socket.on('user-stop-typing', handleUserStopTyping);
    
    console.log('✅ WebSocket слушатели подключены');
  };

  const cleanupSocketListeners = () => {
    const socket = socketRef.current;
    if (!socket) return;
    
    socket.off('new-message', handleNewMessage);
    socket.off('messages-read', handleMessagesRead);
    socket.off('user-online', handleUserOnline);
    socket.off('user-offline', handleUserOffline);
    socket.off('user-typing', handleUserTyping);
    socket.off('user-stop-typing', handleUserStopTyping);
    
    console.log('🧹 WebSocket слушатели отключены');
  };

  // =============================================================================
  // WEBSOCKET HANDLERS - Обработчики событий
  // =============================================================================
  
  const handleNewMessage = (message) => {
    console.log('📨 Получено новое сообщение:', message.id);
    
    // Дедупликация - пропускаем если уже обработали
    if (processedMessageIds.current.has(message.id)) {
      console.log('⏭️ Сообщение уже обработано, пропускаем');
      return;
    }
    processedMessageIds.current.add(message.id);
    
    // Добавляем в список сообщений если это активный чат
    if (activeChatIdRef.current === message.chat_id) {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    }
    
    // ВСЕГДА перезагружаем список чатов для обновления last_message и unread_count
    loadChats();
  };

  const handleMessagesRead = ({ chatId }) => {
    setChats(prev => 
      prev.map(chat => 
        chat.id === chatId ? { ...chat, unread_count: 0 } : chat
      )
    );
  };

  const handleUserOnline = ({ userId }) => {
    setOnlineUsers(prev => new Set([...prev, userId]));
  };

  const handleUserOffline = ({ userId }) => {
    setOnlineUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  };

  const handleUserTyping = ({ userId, userName, chatId }) => {
    if (userId !== user.id && chatId === activeChatIdRef.current) {
      setTypingUser(userName);
    }
  };

  const handleUserStopTyping = ({ userId }) => {
    if (userId !== user.id) {
      setTypingUser(null);
    }
  };

  // =============================================================================
  // DATA LOADING - Загрузка данных с сервера
  // =============================================================================
  
  const loadChats = async () => {
    try {
      const response = await api.get('/chat');
      setChats(response.data.chats);
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      const response = await api.get(`/chat/${chatId}/messages`);
      setMessages(response.data.messages);
      
      // Очищаем processed IDs для нового чата
      processedMessageIds.current.clear();
      // Добавляем загруженные сообщения в processed
      response.data.messages.forEach(msg => processedMessageIds.current.add(msg.id));
      
      scrollToBottom();
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const response = await api.get('/users/online');
      setOnlineUsers(new Set(response.data.users.map(u => u.id)));
    } catch (error) {
      console.error('Ошибка загрузки онлайн пользователей:', error);
    }
  };

  // =============================================================================
  // CHAT ACTIONS - Действия с чатами
  // =============================================================================
  
  const selectChat = async (chat) => {
    console.log('💬 Выбран чат:', chat.id);
    
    // Покидаем предыдущий чат
    if (activeChatIdRef.current && socketRef.current) {
      socketRef.current.emit('leave-chat', activeChatIdRef.current);
    }
    
    setActiveChat(chat);
    activeChatIdRef.current = chat.id;
    setMessages([]);
    
    // Присоединяемся к новому чату
    if (socketRef.current) {
      socketRef.current.emit('join-chat', chat.id);
    }
    
    // Загружаем сообщения
    await loadMessages(chat.id);
    
    // Отмечаем как прочитанное
    markAsRead(chat.id);
    
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  const markAsRead = async (chatId) => {
    try {
      await api.put(`/chat/${chatId}/mark-read`);
      
      if (socketRef.current) {
        socketRef.current.emit('mark-read', chatId);
      }
      
      // Обновляем счетчик уведомлений
      loadUnreadCount();
      
      // Сбрасываем локально
      setChats(prev => 
        prev.map(chat => 
          chat.id === chatId ? { ...chat, unread_count: 0 } : chat
        )
      );
    } catch (error) {
      console.error('Ошибка отметки как прочитанное:', error);
    }
  };

  // =============================================================================
  // MESSAGE ACTIONS - Отправка и управление сообщениями
  // =============================================================================
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() && !selectedFile) return;
    if (!activeChat) return;
    
    try {
      if (selectedFile) {
        await sendFileMessage();
      } else {
        await sendTextMessage();
      }
      
      // Очищаем форму
      setNewMessage('');
      setMessageType('text');
      setSelectedFile(null);
      setReplyTo(null);
      setEditingMessage(null);
      
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      alert('Не удалось отправить сообщение');
    }
  };

  const sendTextMessage = async () => {
    const response = await api.post(`/chat/${activeChat.id}/messages`, {
      content: newMessage,
      messageType: messageType,
      codeLanguage: messageType === 'code' ? detectLanguage(newMessage) : null,
      replyTo: replyTo?.id
    });
    
    console.log('✅ Сообщение отправлено:', response.data.message.id);
    // НЕ добавляем локально - придет через WebSocket
  };

  const sendFileMessage = async () => {
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('caption', newMessage);
    if (replyTo) formData.append('replyTo', replyTo.id);
    
    const response = await api.post(`/chat/${activeChat.id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    console.log('✅ Файл отправлен:', response.data.message.id);
    // НЕ добавляем локально - придет через WebSocket
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Удалить сообщение?')) return;
    
    try {
      await api.delete(`/chat/messages/${messageId}`);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('Ошибка удаления сообщения:', error);
    }
  };

  const handleEditMessage = async (messageId, content) => {
    try {
      await api.put(`/chat/messages/${messageId}`, { content });
      // Перезагружаем сообщения
      loadMessages(activeChat.id);
      setEditingMessage(null);
    } catch (error) {
      console.error('Ошибка редактирования:', error);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      await api.post(`/chat/messages/${messageId}/reaction`, { emoji });
      // Обновление придет через WebSocket event 'reaction-updated'
    } catch (error) {
      console.error('Ошибка реакции:', error);
    }
  };

  // =============================================================================
  // TYPING INDICATOR - Индикатор печати
  // =============================================================================
  
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

  // =============================================================================
  // UTILITY FUNCTIONS - Вспомогательные функции
  // =============================================================================
  
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const filteredMessages = messages.filter(msg => {
    if (!searchQuery) return true;
    return msg.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           msg.sender_full_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // =============================================================================
  // RENDER
  // =============================================================================
  
  if (loading) {
    return <div className="chat-page"><div className="loading">Загрузка...</div></div>;
  }

  return (
    <div className="chat-page">
      {/* Sidebar с чатами */}
      {(!isMobile || showSidebar) && (
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
                    {chat.last_message?.content?.substring(0, 30)}...
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
      )}

      {/* Область сообщений */}
      {activeChat ? (
        <div className="chat-main">
          <div className="chat-header">
            <h3>
              {activeChat.type === 'group' ? activeChat.name : activeChat.other_user?.full_name}
            </h3>
            {typingUser && <div className="typing-indicator">{typingUser} печатает...</div>}
          </div>

          <div className="messages-container">
            {filteredMessages.map(msg => (
              <div
                key={msg.id}
                className={`message ${msg.sender_id === user.id ? 'own' : 'other'}`}
              >
                <div className="message-content">
                  {msg.message_type === 'code' ? (
                    <SyntaxHighlighter language={msg.code_language || 'javascript'} style={vscDarkPlus}>
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
                      <button onClick={() => setEditingMessage(msg)}><BsPencil /></button>
                      <button onClick={() => handleDeleteMessage(msg.id)}><BsTrash /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form className="message-input" onSubmit={handleSendMessage}>
            <select value={messageType} onChange={e => setMessageType(e.target.value)}>
              <option value="text">💬 Текст</option>
              <option value="code">💻 Код</option>
            </select>
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder="Введите сообщение..."
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

export default ChatNew;
