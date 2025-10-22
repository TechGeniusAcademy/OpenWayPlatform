import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import api, { BASE_URL } from '../utils/api';
import { AiOutlineMessage, AiOutlineClose, AiOutlineSend } from 'react-icons/ai';
import { HiUserGroup } from 'react-icons/hi';
import './FloatingChat.css';

function FloatingChat() {
  const { user } = useAuth();
  const { getSocket } = useWebSocket();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatId, setChatId] = useState(null);
  const [frames, setFrames] = useState({});
  const [availableChats, setAvailableChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadFrames();
    if (user?.group_id) {
      loadAvailableChats();
    }
  }, [user?.group_id]);

  useEffect(() => {
    if (isOpen && selectedChat) {
      console.log('FloatingChat: Чат открыт, выбранный чат:', selectedChat);
      if (selectedChat.type === 'group') {
        initializeGroupChat();
      } else {
        initializePrivateChat(selectedChat.userId);
      }
    }
  }, [isOpen, selectedChat]);

  useEffect(() => {
    if (isOpen && chatId) {
      console.log('FloatingChat: Загружаем сообщения для чата:', chatId);
      loadRecentMessages();
      
      // Присоединяемся к чату через WebSocket
      const socket = getSocket();
      if (socket) {
        console.log('FloatingChat: Присоединяемся к чату:', chatId);
        socket.emit('join-chat', chatId);
      } else {
        console.log('FloatingChat: Socket не найден для присоединения к чату');
      }
    }
    
    return () => {
      if (chatId) {
        const socket = getSocket();
        if (socket) {
          console.log('FloatingChat: Покидаем чат:', chatId);
          socket.emit('leave-chat', chatId);
        }
      }
    };
  }, [isOpen, chatId]);

  const loadFrames = async () => {
    try {
      const response = await api.get('/shop/items?type=frame');
      const framesMap = {};
      response.data.items.forEach(frame => {
        framesMap[frame.item_key] = frame.image_url;
      });
      setFrames(framesMap);
    } catch (error) {
      console.error('Ошибка загрузки рамок:', error);
    }
  };

  const loadAvailableChats = async () => {
    try {
      // Загружаем список участников группы
      const groupResponse = await api.get(`/groups/${user.group_id}`);
      console.log('Group response:', groupResponse.data);
      
      const groupData = groupResponse.data.group || groupResponse.data;
      const groupMembers = groupData.members || groupData.students || [];
      
      console.log('Group members:', groupMembers);
      
      // Создаем список чатов: групповой чат + приватные с каждым участником
      const chats = [
        {
          id: 'group',
          type: 'group',
          name: groupData.name || 'Группа',
          avatar_url: null,
          avatar_frame: null,
          isGroup: true
        },
        ...groupMembers
          .filter(member => member.id !== user.id)
          .map(member => ({
            id: `user-${member.id}`,
            type: 'private',
            userId: member.id,
            name: member.full_name || member.username,
            avatar_url: member.avatar_url,
            avatar_frame: member.avatar_frame,
            isGroup: false
          }))
      ];
      
      console.log('Available chats:', chats);
      setAvailableChats(chats);
      // По умолчанию выбираем групповой чат
      setSelectedChat(chats[0]);
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    }
  };

  const initializeGroupChat = async () => {
    try {
      console.log('FloatingChat: Инициализация группового чата для группы:', user.group_id);
      const response = await api.post('/chat/group', {
        groupId: user.group_id
      });
      console.log('FloatingChat: Групповой чат инициализирован, ID:', response.data.chat.id);
      setChatId(response.data.chat.id);
    } catch (error) {
      console.error('Ошибка инициализации группового чата:', error);
    }
  };

  const initializePrivateChat = async (userId) => {
    try {
      console.log('FloatingChat: Инициализация приватного чата с пользователем:', userId);
      const response = await api.post('/chat/private', {
        userId: userId
      });
      console.log('FloatingChat: Приватный чат инициализирован, ID:', response.data.chat.id);
      setChatId(response.data.chat.id);
    } catch (error) {
      console.error('Ошибка инициализации приватного чата:', error);
    }
  };

  const handleChatSelect = (chat) => {
    console.log('FloatingChat: Выбран чат:', chat);
    setSelectedChat(chat);
    setMessages([]);
    setChatId(null);
  };

  useEffect(() => {
    const socket = getSocket();
    console.log('FloatingChat: Получен socket:', socket);
    console.log('FloatingChat: Socket подключен?', socket?.connected);
    
    if (!socket) {
      console.log('FloatingChat: Socket не найден');
      return;
    }

    const handleNewMessage = (message) => {
      console.log('FloatingChat: Получено новое сообщение:', message);
      console.log('FloatingChat: isOpen:', isOpen, 'chatId:', chatId, 'message.chat_id:', message.chat_id);
      
      if (isOpen && chatId && message.chat_id === chatId) {
        setMessages(prev => {
          // Проверяем, нет ли уже этого сообщения
          const exists = prev.some(m => m.id === message.id);
          if (exists) return prev;
          
          const newMessages = [...prev, message];
          console.log('FloatingChat: Добавляем сообщение в UI:', message);
          
          // Сохраняем в localStorage
          const localKey = `floating_chat_messages_${chatId}`;
          localStorage.setItem(localKey, JSON.stringify(newMessages));
          
          return newMessages;
        });
        scrollToBottom();
      } else if (chatId && message.chat_id === chatId) {
        // Увеличиваем счетчик непрочитанных только если чат не открыт
        setUnreadCount(prev => prev + 1);
      }
    };

    console.log('FloatingChat: Подписываемся на new-message события');
    socket.on('new-message', handleNewMessage);

    return () => {
      console.log('FloatingChat: Отписываемся от new-message событий');
      socket.off('new-message', handleNewMessage);
    };
  }, [getSocket, isOpen, chatId, user?.id]);

  const loadRecentMessages = async () => {
    if (!chatId) return;
    
    try {
      setLoading(true);
      console.log('FloatingChat: Загружаем сообщения для чата:', chatId);
      
      // Сначала загружаем из localStorage для мгновенного отображения
      const localKey = `floating_chat_messages_${chatId}`;
      const localMessages = localStorage.getItem(localKey);
      if (localMessages) {
        try {
          const parsed = JSON.parse(localMessages);
          console.log('FloatingChat: Загружены локальные сообщения:', parsed.length);
          setMessages(parsed);
          scrollToBottom();
        } catch (e) {
          console.error('Ошибка парсинга локальных сообщений:', e);
        }
      }

      // Затем загружаем актуальные данные с сервера
      const response = await api.get(`/chat/${chatId}/messages?limit=10`);
      const serverMessages = response.data.messages || [];
      console.log('FloatingChat: Загружены сообщения с сервера:', serverMessages.length);
      setMessages(serverMessages);
      
      // Сохраняем в localStorage
      localStorage.setItem(localKey, JSON.stringify(serverMessages));
      setUnreadCount(0);
      scrollToBottom();
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !chatId) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    console.log('FloatingChat: Отправляем сообщение в чат:', chatId, 'Текст:', messageText);

    try {
      const response = await api.post(`/chat/${chatId}/messages`, {
        message_type: 'text',
        content: messageText
      });

      console.log('FloatingChat: Сообщение отправлено на сервер, ответ:', response.data);

      // Добавляем сообщение локально сразу
      const newMsg = {
        ...response.data.message,
        user_id: user.id,
        username: user.username,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        avatar_frame: user.avatar_frame,
        content: messageText
      };
      
      console.log('FloatingChat: Добавляем сообщение локально:', newMsg);
      
      const newMessages = [...messages, newMsg];
      setMessages(newMessages);
      
      // Сохраняем в localStorage
      const localKey = `floating_chat_messages_${chatId}`;
      localStorage.setItem(localKey, JSON.stringify(newMessages));
      
      scrollToBottom();
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      // Возвращаем текст обратно в случае ошибки
      setNewMessage(messageText);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  const openFullChat = () => {
    navigate('/student/chat');
    setIsOpen(false);
  };

  if (!user?.group_id) return null;

  return (
    <>
      {/* Мини-чат */}
      <div className={`floating-chat-container ${isOpen ? 'open' : ''}`}>
        {/* Сайдбар с чатами */}
        <div className="floating-chat-sidebar">
          {availableChats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-user-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
              onClick={() => handleChatSelect(chat)}
              title={chat.name}
            >
              <div className="chat-user-avatar-wrapper">
                <div className="chat-user-avatar">
                  {chat.isGroup ? (
                    <HiUserGroup className="group-icon" />
                  ) : chat.avatar_url ? (
                    <img src={`${BASE_URL}${chat.avatar_url}`} alt="" />
                  ) : (
                    <div className="avatar-placeholder">
                      {(chat.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {!chat.isGroup && chat.avatar_frame && chat.avatar_frame !== 'none' && frames[chat.avatar_frame] && (
                  <img 
                    src={`${BASE_URL}${frames[chat.avatar_frame]}`}
                    alt="Frame"
                    className="chat-user-frame"
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Основная область чата */}
        <div className="floating-chat-main">
          <div className="floating-chat-header">
            <div className="chat-header-title">
              <AiOutlineMessage />
              <span>{selectedChat?.name || 'Чат'}</span>
            </div>
            <div className="chat-header-actions">
              <button 
                className="expand-btn" 
                onClick={openFullChat}
                title="Открыть полный чат"
              >
                ↗
              </button>
              <button 
                className="close-chat-btn" 
                onClick={toggleChat}
              >
                <AiOutlineClose />
              </button>
            </div>
          </div>

        <div className="floating-chat-messages">
          {loading ? (
            <div className="chat-loading">
              <div className="spinner-small"></div>
              <p>Загрузка...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="chat-empty">
              <AiOutlineMessage className="empty-icon" />
              <p>Нет сообщений</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                // Определяем, чье это сообщение (может быть user_id для локальных или sender_id для серверных)
                const isOwn = (msg.user_id === user.id) || (msg.sender_id === user.id);
                // Используем правильные поля в зависимости от источника
                const avatarUrl = msg.avatar_url || msg.sender_avatar_url;
                const avatarFrame = msg.avatar_frame || msg.sender_avatar_frame;
                const fullName = msg.full_name || msg.sender_full_name;
                const username = msg.username || msg.sender_username;
                
                return (
                  <div 
                    key={msg.id} 
                    className={`mini-message ${isOwn ? 'own' : ''}`}
                  >
                    <div className="message-avatar-wrapper">
                      <div className="message-avatar">
                        {avatarUrl ? (
                          <img src={`${BASE_URL}${avatarUrl}`} alt="" />
                        ) : (
                          <div className="avatar-placeholder">
                            {(fullName || username || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {avatarFrame && avatarFrame !== 'none' && frames[avatarFrame] && (
                        <img 
                          src={`${BASE_URL}${frames[avatarFrame]}`}
                          alt="Frame"
                          className="message-avatar-frame"
                        />
                      )}
                    </div>
                    <div className="message-content">
                      <div className="message-author">{fullName || username}</div>
                      <div className="message-text">{msg.content}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <form className="floating-chat-input" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Сообщение..."
            maxLength={500}
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="send-btn-mini"
          >
            <AiOutlineSend />
          </button>
        </form>
        </div>
      </div>

      {/* Плавающая кнопка */}
      <button 
        className={`floating-chat-button ${isOpen ? 'active' : ''}`}
        onClick={toggleChat}
        title="Открыть чат"
      >
        {isOpen ? (
          <AiOutlineClose />
        ) : (
          <>
            <AiOutlineMessage />
            {unreadCount > 0 && (
              <span className="floating-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </>
        )}
      </button>
    </>
  );
}

export default FloatingChat;
