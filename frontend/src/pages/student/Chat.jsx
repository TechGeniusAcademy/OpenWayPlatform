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
import './Chat.css';
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
  const socket = getSocket();

  useEffect(() => {
    loadChats();
    loadUsers();
    setupWebSocket();

    return () => {
      if (socket) {
        socket.off('chat:message');
        socket.off('chat:user-online');
        socket.off('chat:user-offline');
        socket.off('chat:typing');
        socket.off('chat:message-edited');
        socket.off('chat:message-deleted');
        socket.off('chat:reaction-added');
      }
    };
  }, []);

  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat.id);
      markAsRead(activeChat.id);
    }
  }, [activeChat]);

  const setupWebSocket = () => {
    if (!socket) return;

    socket.on('chat:message', (data) => {
      if (activeChat && data.chatId === activeChat.id) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === data.message.id);
          if (exists) return prev;
          return [...prev, transformMessage(data.message)];
        });
        markAsRead(data.chatId);
      }
      loadChats(); // Обновить список чатов
    });

    socket.on('chat:user-online', (data) => {
      setOnlineUsers(prev => new Set([...prev, data.userId]));
      // Обновляем статусы в списках
      setChats(prev => prev.map(c => ({
        ...c,
        isOnline: c.chat_type === 'private' && c.otherUserId === data.userId
      })));
      setUsers(prev => prev.map(u => ({
        ...u,
        isOnline: u.id === data.userId
      })));
    });

    socket.on('chat:user-offline', (data) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
      // Обновляем статусы в списках
      setChats(prev => prev.map(c => ({
        ...c,
        isOnline: c.chat_type === 'private' && c.otherUserId === data.userId ? false : c.isOnline
      })));
      setUsers(prev => prev.map(u => ({
        ...u,
        isOnline: u.id === data.userId ? false : u.isOnline
      })));
    });

    socket.on('chat:typing', (data) => {
      if (activeChat && data.chatId === activeChat.id) {
        setTypingUsers(prev => ({
          ...prev,
          [data.userId]: data.userName
        }));
        
        setTimeout(() => {
          setTypingUsers(prev => {
            const { [data.userId]: _, ...rest } = prev;
            return rest;
          });
        }, 3000);
      }
    });

    socket.on('chat:message-edited', (data) => {
      if (activeChat && data.chatId === activeChat.id) {
        setMessages(prev => prev.map(m => 
          m.id === data.messageId 
            ? { ...m, message: data.content, isEdited: true }
            : m
        ));
      }
    });

    socket.on('chat:message-deleted', (data) => {
      if (activeChat && data.chatId === activeChat.id) {
        setMessages(prev => prev.filter(m => m.id !== data.messageId));
      }
    });

    socket.on('chat:reaction-added', (data) => {
      if (activeChat && data.chatId === activeChat.id) {
        setMessages(prev => prev.map(m => 
          m.id === data.messageId
            ? { ...m, reactions: data.reactions }
            : m
        ));
      }
    });
  };

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
      setMessages(response.data.map(transformMessage));
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    }
  };

  const transformMessage = (msg) => ({
    id: msg.id,
    message: msg.content,
    sentTime: formatTime(msg.created_at),
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
      const response = await api.post(`/chat/${activeChat.id}/message`, {
        content: textContent.trim(),
        messageType: 'text'
      });

      // Сообщение придет через WebSocket
      loadUnreadCount();
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
    }
  };

  const handleTyping = () => {
    if (!socket || !activeChat) return;

    socket.emit('chat:typing', {
      chatId: activeChat.id,
      userId: user.id,
      userName: user.full_name
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:stop-typing', {
        chatId: activeChat.id,
        userId: user.id
      });
    }, 1000);
  };

  const markAsRead = async (chatId) => {
    try {
      await api.post(`/chat/${chatId}/read`);
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
    const date = new Date(timestamp);
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
      <div className="chat-loading">
        <div className="chat-loading-spinner"></div>
        <span>Загрузка чатов...</span>
      </div>
    );
  }

  return (
    <div className="modern-chat-container">
      <MainContainer responsive>
        <Sidebar position="left" scrollable={false}>
          <div className="chat-tabs">
            <button 
              className={`chat-tab ${activeTab === 'chats' ? 'active' : ''}`}
              onClick={() => setActiveTab('chats')}
            >
              <IoChatbubblesOutline className="tab-icon" />
              <span>Чаты</span>
              {chats.length > 0 && <span className="tab-count">{chats.length}</span>}
            </button>
            <button 
              className={`chat-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <IoPeopleOutline className="tab-icon" />
              <span>Пользователи</span>
              {users.length > 0 && <span className="tab-count">{users.length}</span>}
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
                    unreadCnt={chat.unreadCount}
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
                const showDate = index === 0 || 
                  new Date(messages[index - 1].sentTime).toDateString() !== 
                  new Date(msg.sentTime).toDateString();

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <MessageSeparator>
                        {new Date(msg.sentTime).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long'
                        })}
                      </MessageSeparator>
                    )}
                    <Message model={msg}>
                      {msg.direction === 'incoming' && (
                        <Avatar src={msg.avatarSrc} name={msg.sender} />
                      )}
                      {msg.type === 'custom' && msg.messageType === 'code' && (
                        <Message.CustomContent>
                          <div className="code-message">
                            <div className="code-header">
                              <span className="code-language">{msg.codeLanguage}</span>
                            </div>
                            <pre><code>{msg.message}</code></pre>
                          </div>
                        </Message.CustomContent>
                      )}
                      {msg.messageType === 'file' && (
                        <Message.CustomContent>
                          <div className="file-message">
                            <div className="file-icon-wrapper">
                              <BsFileEarmarkText className="file-icon" />
                            </div>
                            <div className="file-info">
                              <div className="file-name">{msg.fileName}</div>
                              <div className="file-size">
                                {(msg.fileSize / 1024).toFixed(2)} KB
                              </div>
                            </div>
                            <a
                              href={`${BASE_URL}/api/chat/files/${msg.filePath}`}
                              download={msg.fileName}
                              className="file-download"
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
                      {msg.isEdited && (
                        <Message.Footer>
                          <span className="edited-label">изменено</span>
                        </Message.Footer>
                      )}
                    </Message>
                  </div>
                );
              })}
            </MessageList>
            <MessageInput
              placeholder="Введите сообщение..."
              onSend={handleSendMessage}
              onChange={handleTyping}
              attachButton={true}
              sendButton={true}
            />
          </ChatContainer>
        ) : (
          <div className="no-chat-selected">
            <div className="no-chat-content">
              <div className="no-chat-icon">
                <BsChatDots />
              </div>
              <h3>Выберите чат</h3>
              <p>Выберите чат из списка слева или начните новый диалог с пользователем</p>
            </div>
          </div>
        )}
      </MainContainer>
    </div>
  );
}

export default Chat;
