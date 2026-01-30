import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useWebSocket } from '../../context/WebSocketContext';
import api, { BASE_URL } from '../../utils/api';
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  Sidebar,
  ConversationList,
  Conversation,
  Avatar,
  TypingIndicator,
  MessageSeparator,
  Search
} from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import styles from './Chat.module.css';
import { 
  IoChatbubblesOutline, 
  IoPeopleOutline, 
  IoDocumentTextOutline,
  IoDownloadOutline,
  IoChatbubbleEllipsesOutline,
  IoCodeSlash
} from 'react-icons/io5';
import { HiOutlineUserGroup } from 'react-icons/hi';
import { BsFileEarmarkText, BsChatDots } from 'react-icons/bs';

function Chat() {
  const { user } = useAuth();
  const { loadUnreadCount } = useNotifications();
  const { getSocket } = useWebSocket();

  // State
  const [chats, setChats] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' или 'users'
  
  // Refs
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeChatRef = useRef(null);
  const socketRef = useRef(null);
  const processedIds = useRef(new Set());
  const fileInputRef = useRef(null);
  
  // File upload state
  const [uploading, setUploading] = useState(false);

  // WebSocket handlers
  const onNewMessage = (message) => {
    console.log('WebSocket: new message received', message);
    
    // Проверяем, не обработано ли уже это сообщение
    if (processedIds.current.has(message.id)) return;
    processedIds.current.add(message.id);
    
    const currentChatId = activeChatRef.current?.id;
    
    if (currentChatId && message.chat_id === currentChatId) {
      setMessages(prev => {
        const exists = prev.some(m => m.id === message.id);
        if (exists) return prev;
        return [...prev, transformMessage(message)];
      });
      markAsRead(message.chat_id);
    }
    loadChats();
  };

  const onChatNotification = (message) => {
    console.log('WebSocket: chat notification', message);
    loadChats();
  };

  const onUserOnline = (data) => {
    setOnlineUsers(prev => new Set([...prev, data.userId]));
    setChats(prev => prev.map(c => ({
      ...c,
      isOnline: c.chat_type === 'private' && c.otherUserId === data.userId
    })));
    setUsers(prev => prev.map(u => ({
      ...u,
      isOnline: u.id === data.userId
    })));
  };

  const onUserOffline = (data) => {
    setOnlineUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(data.userId);
      return newSet;
    });
    setChats(prev => prev.map(c => ({
      ...c,
      isOnline: c.chat_type === 'private' && c.otherUserId === data.userId ? false : c.isOnline
    })));
    setUsers(prev => prev.map(u => ({
      ...u,
      isOnline: u.id === data.userId ? false : u.isOnline
    })));
  };

  // Инициализация
  useEffect(() => {
    const init = async () => {
      await Promise.all([
        loadChats(),
        loadUsers()
      ]);
      
      setLoading(false);
    };

    init();
  }, []);

  // WebSocket подключение - отдельный эффект с повторными попытками
  useEffect(() => {
    let retryInterval = null;
    let mounted = true;
    
    const setupSocket = () => {
      const socket = getSocket();
      
      if (!socket) {
        console.log('Chat: Socket not available yet, retrying...');
        return false;
      }
      
      console.log('Chat: Setting up WebSocket listeners, socket connected:', socket.connected);
      socketRef.current = socket;
      
      // Подписываемся на события
      socket.on('new-message', onNewMessage);
      socket.on('chat-message-notification', onChatNotification);
      socket.on('user-online', onUserOnline);
      socket.on('user-offline', onUserOffline);
      
      // Если сокет уже подключен и есть активный чат, присоединяемся к комнате
      if (socket.connected && activeChatRef.current) {
        console.log('Chat: Socket ready, joining chat room', activeChatRef.current.id);
        socket.emit('join-chat', activeChatRef.current.id);
      }
      
      console.log('Chat: Socket setup complete, id:', socket.id);
      return true;
    };
    
    // Пробуем сразу
    if (!setupSocket()) {
      // Если не получилось, пробуем каждые 500ms
      retryInterval = setInterval(() => {
        if (mounted && setupSocket()) {
          clearInterval(retryInterval);
        }
      }, 500);
    }

    return () => {
      mounted = false;
      if (retryInterval) {
        clearInterval(retryInterval);
      }
      const socket = socketRef.current;
      if (socket) {
        console.log('Chat: Cleaning up WebSocket listeners');
        socket.off('new-message', onNewMessage);
        socket.off('chat-message-notification', onChatNotification);
        socket.off('user-online', onUserOnline);
        socket.off('user-offline', onUserOffline);
      }
    };
  }, []);

  // При смене активного чата
  useEffect(() => {
    if (activeChat) {
      // Покидаем предыдущую комнату
      if (activeChatRef.current && socketRef.current) {
        console.log('Chat: Leaving chat room', activeChatRef.current.id);
        socketRef.current.emit('leave-chat', activeChatRef.current.id);
      }
      
      // Обновляем ref
      activeChatRef.current = activeChat;
      
      // Присоединяемся к новой комнате
      if (socketRef.current?.connected) {
        console.log('Chat: Joining chat room', activeChat.id);
        socketRef.current.emit('join-chat', activeChat.id);
      } else {
        console.log('Chat: Cannot join yet - socket not ready, will retry');
        // Повторная попытка через 1 сек если сокет появится
        setTimeout(() => {
          if (socketRef.current?.connected && activeChatRef.current?.id === activeChat.id) {
            console.log('Chat: Retry joining chat room', activeChat.id);
            socketRef.current.emit('join-chat', activeChat.id);
          }
        }, 1000);
      }
      
      // Очищаем обработанные ID и загружаем сообщения
      processedIds.current.clear();
      loadMessages(activeChat.id);
      markAsRead(activeChat.id);
    }
  }, [activeChat]);

  // Привязка обработчика к кнопке прикрепления файлов
  useEffect(() => {
    const attachButton = document.querySelector('.cs-button--attachment');
    if (attachButton) {
      const handleClick = () => {
        console.log('Attachment button clicked via DOM!');
        fileInputRef.current?.click();
      };
      attachButton.addEventListener('click', handleClick);
      return () => attachButton.removeEventListener('click', handleClick);
    }
  }, [activeChat]); // Перепривязываем при смене чата

  // Авто-прокрутка к последнему сообщению
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages]);

  const loadChats = async () => {
    try {
      const response = await api.get('/chat');
      setChats(response.data.chats.map(chat => {
        const isGroup = chat.type === 'group';
        const otherUser = chat.other_user;
        const lastMsg = chat.last_message;
        
        return {
          ...chat,
          chat_type: chat.type,
          name: isGroup ? chat.name : (otherUser?.full_name || 'Пользователь'),
          lastMessage: lastMsg?.content || 'Нет сообщений',
          lastMessageTime: lastMsg?.created_at ? formatTime(lastMsg.created_at) : '',
          unreadCount: chat.unread_count || 0,
          avatarSrc: isGroup 
            ? `${BASE_URL}/uploads/groups/${chat.group_id}.jpg`
            : `${BASE_URL}${otherUser?.avatar_url || '/uploads/avatars/default-avatar.png'}`,
          isOnline: !isGroup && otherUser && onlineUsers.has(otherUser.id),
          otherUserId: otherUser?.id
        };
      }));
      setLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      const onlineResponse = await api.get('/users/online');
      const onlineIds = new Set(onlineResponse.data.users.map(u => u.id));
      
      setUsers(response.data.users
        .filter(u => u.id !== user.id) // Исключаем себя
        .map(u => ({
          id: u.id,
          name: u.full_name,
          username: u.username,
          email: u.email,
          role: u.role,
          avatarSrc: `${BASE_URL}${u.avatar_url || '/uploads/avatars/default-avatar.png'}`,
          isOnline: onlineIds.has(u.id),
          lastSeen: u.last_seen
        })));
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      const response = await api.get(`/chat/${chatId}/messages`);
      const messagesArray = response.data.messages || response.data || [];
      setMessages(messagesArray.map(transformMessage));
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    }
  };

  const transformMessage = (msg) => ({
    id: msg.id,
    message: msg.content,
    sentTime: msg.created_at,
    sender: msg.sender_name,
    senderId: msg.sender_id,
    direction: msg.sender_id === user.id ? 'outgoing' : 'incoming',
    position: 'normal',
    type: msg.message_type === 'code' ? 'custom' : 'text',
    messageType: msg.message_type,
    codeLanguage: msg.code_language,
    fileName: msg.file_name,
    filePath: msg.file_path,
    fileSize: msg.file_size,
    replyTo: msg.reply_to_message,
    isEdited: msg.is_edited,
    reactions: msg.reactions || [],
    avatarSrc: `${BASE_URL}${msg.avatar_url || '/uploads/avatars/default-avatar.png'}`
  });

  const handleSendMessage = async (innerHtml, textContent) => {
    if (!activeChat || !textContent.trim()) return;

    try {
      const response = await api.post(`/chat/${activeChat.id}/messages`, {
        content: textContent.trim(),
        messageType: 'text'
      });

      // Добавляем сообщение в локальный state сразу
      if (response.data && response.data.message) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === response.data.message.id);
          if (exists) return prev;
          return [...prev, transformMessage(response.data.message)];
        });
      }

      // Сообщение придет через WebSocket
      loadUnreadCount();
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
    }
  };

  // Открытие диалога выбора файла
  const handleAttachClick = () => {
    console.log('Attach button clicked!');
    console.log('fileInputRef:', fileInputRef.current);
    fileInputRef.current?.click();
  };

  // Обработка выбора файла
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;

    // Сбрасываем input для возможности повторного выбора того же файла
    e.target.value = '';

    // Проверка размера (100MB)
    if (file.size > 100 * 1024 * 1024) {
      alert('Файл слишком большой. Максимальный размер: 100MB');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Определяем тип сообщения по типу файла
      const isImage = file.type.startsWith('image/');
      formData.append('messageType', isImage ? 'image' : 'file');

      const response = await api.post(`/chat/${activeChat.id}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Добавляем сообщение в локальный state
      if (response.data && response.data.message) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === response.data.message.id);
          if (exists) return prev;
          return [...prev, transformMessage(response.data.message)];
        });
      }

      loadUnreadCount();
    } catch (error) {
      console.error('Ошибка загрузки файла:', error);
      alert('Не удалось загрузить файл');
    } finally {
      setUploading(false);
    }
  };

  const handleTyping = () => {
    const socket = socketRef.current;
    if (!socket || !activeChat) return;

    socket.emit('typing-start', {
      chatId: activeChat.id,
      userName: user.full_name
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing-stop', {
        chatId: activeChat.id
      });
    }, 1000);
  };

  const markAsRead = async (chatId) => {
    try {
      await api.put(`/chat/${chatId}/mark-read`);
      loadUnreadCount();
      setChats(prev => prev.map(c => 
        c.id === chatId ? { ...c, unreadCount: 0 } : c
      ));
    } catch (error) {
      console.error('Ошибка отметки прочтения:', error);
    }
  };

  const getOtherUserName = (chat) => {
    if (chat.chat_type === 'group') return chat.group_name;
    const otherUser = chat.participants?.find(p => p.user_id !== user.id);
    return otherUser?.full_name || 'Пользователь';
  };

  const getOtherUserId = (chat) => {
    const otherUser = chat.participants?.find(p => p.user_id !== user.id);
    return otherUser?.user_id;
  };

  const getOtherUserAvatar = (chat) => {
    const otherUser = chat.participants?.find(p => p.user_id !== user.id);
    return `${BASE_URL}${otherUser?.avatar_url || '/uploads/avatars/default-avatar.png'}`;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    
    const today = new Date().setHours(0, 0, 0, 0);
    const messageDate = new Date(timestamp).setHours(0, 0, 0, 0);
    
    if (messageDate === today) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    
    if (now - date < 86400000 * 7) {
      return date.toLocaleDateString('ru-RU', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    }
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUserClick = async (selectedUser) => {
    try {
      // Создать или получить существующий чат с этим пользователем
      const response = await api.post('/chat/private', {
        userId: selectedUser.id
      });
      
      // Обновить список чатов
      await loadChats();
      
      // Открыть чат
      const newChat = response.data.chat;
      setActiveChat({
        id: newChat.id,
        chat_type: 'private',
        type: 'private',
        name: selectedUser.name,
        avatarSrc: selectedUser.avatarSrc,
        isOnline: selectedUser.isOnline,
        otherUserId: selectedUser.id
      });
      
      // Переключаемся на вкладку чатов
      setActiveTab('chats');
    } catch (error) {
      console.error('Ошибка создания чата:', error);
    }
  };

  const typingUserNames = Object.values(typingUsers);
  const showTyping = typingUserNames.length > 0;

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}></div>
        <span>Загрузка чатов...</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <MainContainer responsive>
        <Sidebar position="left" scrollable={false}>
          <div className={styles.tabs}>
            <button 
              className={`${styles.tab} ${activeTab === 'chats' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('chats')}
            >
              <IoChatbubblesOutline className={styles.tabIcon} />
              <span>Чаты</span>
              {chats.length > 0 && <span className={styles.tabCount}>{chats.length}</span>}
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'users' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <IoPeopleOutline className={styles.tabIcon} />
              <span>Пользователи</span>
              {users.length > 0 && <span className={styles.tabCount}>{users.length}</span>}
            </button>
          </div>
          <Search 
            placeholder={activeTab === 'chats' ? "Поиск чатов..." : "Поиск пользователей..."} 
            value={searchQuery}
            onChange={v => setSearchQuery(v)}
          />
          <ConversationList>
            {activeTab === 'chats' ? (
              filteredChats.length > 0 ? (
                filteredChats.map(chat => (
                  <Conversation
                    key={chat.id}
                    name={chat.name}
                    lastSenderName={chat.lastSenderName}
                    info={chat.lastMessage}
                    active={activeChat?.id === chat.id}
                    unreadCnt={Number(chat.unreadCount) || 0}
                    onClick={() => setActiveChat(chat)}
                  >
                    <Avatar 
                      src={chat.avatarSrc}
                      name={chat.name}
                      status={chat.isOnline ? 'available' : 'unavailable'}
                    />
                  </Conversation>
                ))
              ) : null
            ) : (
              filteredUsers.length > 0 ? (
                filteredUsers.map(u => (
                  <Conversation
                    key={u.id}
                    name={u.name}
                    info={`@${u.username}`}
                    onClick={() => handleUserClick(u)}
                  >
                    <Avatar 
                      src={u.avatarSrc}
                      name={u.name}
                      status={u.isOnline ? 'available' : 'unavailable'}
                    />
                  </Conversation>
                ))
              ) : null
            )}
          </ConversationList>
        </Sidebar>

        {activeChat ? (
          <ChatContainer>
            <MessageList
              typingIndicator={showTyping && (
                <TypingIndicator content={`${typingUserNames.join(', ')} печатает...`} />
              )}
            >
              {messages.map((msg, index) => {
                const currentDate = msg.sentTime ? new Date(msg.sentTime) : null;
                const prevDate = index > 0 && messages[index - 1].sentTime 
                  ? new Date(messages[index - 1].sentTime) 
                  : null;
                
                const today = new Date();
                const isToday = currentDate && 
                  currentDate.toDateString() === today.toDateString();
                
                const showDate = currentDate && (
                  index === 0 || 
                  !prevDate || 
                  prevDate.toDateString() !== currentDate.toDateString()
                );

                const timeStr = currentDate && !isNaN(currentDate.getTime())
                  ? currentDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <div key={msg.id}>
                    {showDate && currentDate && !isNaN(currentDate.getTime()) && (
                      <MessageSeparator>
                        {isToday ? 'Сегодня' : currentDate.toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: currentDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
                        })}
                      </MessageSeparator>
                    )}
                    <div className={styles.messageWrapper}>
                      <Message model={msg}>
                        {msg.direction === 'incoming' && (
                          <Avatar src={msg.avatarSrc} name={msg.sender} />
                        )}
                        {msg.type === 'custom' && msg.messageType === 'code' && (
                          <Message.CustomContent>
                            <div className={styles.codeMessage}>
                              <div className={styles.codeHeader}>
                                <span className={styles.codeLanguage}>{msg.codeLanguage}</span>
                              </div>
                              <pre><code>{msg.message}</code></pre>
                            </div>
                          </Message.CustomContent>
                        )}
                        {msg.messageType === 'file' && (
                          <Message.CustomContent>
                            <div className={styles.fileMessage}>
                              <div className={styles.fileIconWrapper}>
                                <BsFileEarmarkText className={styles.fileIcon} />
                              </div>
                              <div className={styles.fileInfo}>
                                <div className={styles.fileName}>{msg.fileName}</div>
                                <div className={styles.fileSize}>
                                  {(msg.fileSize / 1024).toFixed(2)} KB
                                </div>
                              </div>
                              <a
                                href={`${BASE_URL}/api/chat/files/${msg.filePath}`}
                                download={msg.fileName}
                                className={styles.fileDownload}
                              >
                                <IoDownloadOutline />
                                <span>Скачать</span>
                              </a>
                            </div>
                          </Message.CustomContent>
                        )}
                        {msg.messageType === 'image' && (
                          <Message.ImageContent
                            src={`${BASE_URL}/api/chat/files/${msg.filePath}`}
                            alt={msg.fileName}
                            width={300}
                          />
                        )}
                        <Message.Footer>
                          <span className={styles.messageTime}>{timeStr}</span>
                          {msg.isEdited && <span className={styles.editedLabel}>изм.</span>}
                        </Message.Footer>
                      </Message>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </MessageList>
            <MessageInput
              placeholder={uploading ? "Загрузка файла..." : "Введите сообщение..."}
              onSend={handleSendMessage}
              onChange={handleTyping}
              onAttachClick={handleAttachClick}
              attachButton={true}
              sendButton={true}
              disabled={uploading}
            />
          </ChatContainer>
        ) : (
          <div className={styles.noChat}>
            <div className={styles.noChatContent}>
              <div className={styles.noChatIcon}>
                <BsChatDots />
              </div>
              <h3>Выберите чат</h3>
              <p>Выберите чат из списка слева или начните новый диалог с пользователем</p>
            </div>
          </div>
        )}
      </MainContainer>
      
      {/* Скрытый input для загрузки файлов - вынесен за пределы условия */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z"
      />
    </div>
  );
}

export default Chat;
