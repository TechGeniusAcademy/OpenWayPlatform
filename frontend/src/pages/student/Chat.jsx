import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useWebSocket } from '../../context/WebSocketContext';
import api, { BASE_URL } from '../../utils/api';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  BsReply, 
  BsPinFill, 
  BsHeart, 
  BsHandThumbsUp, 
  BsPencil, 
  BsTrash, 
  BsCheck, 
  BsX, 
  BsPaperclip,
  BsCode,
  BsChatDots,
  BsPeopleFill
} from 'react-icons/bs';
import './Chat.css';
import '../../styles/UsernameStyles.css';
import '../../styles/MessageColors.css';

// Функция для определения языка по содержимому кода
const detectLanguage = (code) => {
  if (code.includes('<?php') || code.includes('<?=')) return 'php';
  if (code.includes('<!DOCTYPE html>') || code.includes('<html')) return 'markup';
  if (code.includes('function') && code.includes('=>')) return 'javascript';
  if (code.includes('def ') || code.includes('import ')) return 'python';
  if (code.includes('SELECT') && code.includes('FROM')) return 'sql';
  return 'javascript'; // По умолчанию
};

// Функция для нормализации названия языка для подсветки синтаксиса
const normalizeLanguage = (lang) => {
  const languageMap = {
    'javascript': 'javascript',
    'python': 'python',
    'php': 'php',
    'java': 'java',
    'cpp': 'cpp',
    'csharp': 'csharp',
    'html': 'markup',
    'css': 'css',
    'sql': 'sql'
  };
  return languageMap[lang] || 'javascript';
};

// Функция для преобразования emoji в иконки
const EmojiIcon = ({ emoji }) => {
  switch(emoji) {
    case '👍':
      return <BsHandThumbsUp />;
    case '❤️':
      return <BsHeart />;
    default:
      return <span>{emoji}</span>;
  }
};

function Chat() {
  const { user } = useAuth();
  const { loadUnreadCount } = useNotifications();
  const { getSocket } = useWebSocket();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState('text');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false); // Загрузка сообщений при переключении чата
  const [allUsers, setAllUsers] = useState([]);
  const [typingUser, setTypingUser] = useState(null); // Кто печатает
  const [onlineUsers, setOnlineUsers] = useState(new Set()); // Онлайн пользователи
  const [frameImages, setFrameImages] = useState({}); // Кэш изображений рамок
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768); // Мобильный режим
  const [showSidebar, setShowSidebar] = useState(true); // Показ сайдбара
  const [replyTo, setReplyTo] = useState(null); // Сообщение для ответа
  const [editingMessage, setEditingMessage] = useState(null); // Редактируемое сообщение
  const [searchQuery, setSearchQuery] = useState(''); // Поиск по сообщениям
  
  const socketRef = useRef();
  const socketListenersRef = useRef(null); // track which socket id we've attached listeners to
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeChatRef = useRef(activeChat); // Ref для отслеживания активного чата
  const processedChatUpdatesRef = useRef(new Set()); // Для дедупликации обновлений списка чатов
  const loadChatsTimeoutRef = useRef(null); // Для debounce загрузки чатов

  // Обновляем ref при изменении activeChat
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Отслеживание размера окна
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setShowSidebar(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadChats();
    loadAllUsers();
    loadOnlineUsers(); // Загружаем онлайн пользователей при монтировании
    loadFrameImages();
    
    const socket = getSocket();
    console.log('Chat: Получен socket:', socket);
    console.log('Chat: Socket подключен?', socket?.connected);
    
    if (!socket) {
      console.log('Chat: Socket не найден');
      return;
    }

    // Сохраняем ссылку на сокет
    socketRef.current = socket;

    // Обработчик новых сообщений
    const handleNewMessage = (message) => {
      console.log('Chat: Получено новое сообщение:', message);
      console.log('Chat: activeChatRef.current?.id:', activeChatRef.current?.id, 'message.chat_id:', message.chat_id);
      
      // Добавляем сообщение только если это активный чат
      if (activeChatRef.current?.id === message.chat_id) {
        console.log('Chat: Добавляем сообщение в активный чат');
        setMessages(prev => {
          // Проверяем, нет ли уже этого сообщения
          const exists = prev.some(m => m.id === message.id);
          if (exists) {
            console.log('Chat: Сообщение уже существует, пропускаем');
            return prev;
          }
          console.log('Chat: Добавляем новое сообщение в UI');
          return [...prev, message];
        });
      } else {
        console.log('Chat: Сообщение не для активного чата, пропускаем');
      }
    };

    // Обработчик уведомлений о новых сообщениях (для обновления списка чатов)
    const handleChatMessageNotification = (message) => {
      console.log('Chat: Получено уведомление о новом сообщении для обновления списка чатов:', message);
      
      // Дедупликация: проверяем, не обрабатывали ли мы уже это сообщение
      const messageKey = `${message.id}-${message.created_at}`;
      if (processedChatUpdatesRef.current.has(messageKey)) {
        console.log('Chat: Обновление списка чатов для этого сообщения уже обработано, пропускаем');
        return;
      }
      processedChatUpdatesRef.current.add(messageKey);
      
      // Очищаем старые записи (старше 5 минут) для предотвращения утечки памяти
      setTimeout(() => {
        processedChatUpdatesRef.current.delete(messageKey);
      }, 5 * 60000);
      
      // Проверяем: это мое сообщение в активном чате?
      const isMyMessageInActiveChat = message.sender_id === user.id && activeChatRef.current?.id === message.chat_id;
      
      if (isMyMessageInActiveChat) {
        // Для своих сообщений в активном чате просто обновляем last_message локально
        // без перезагрузки всего списка (чтобы не было "перезапуска" чата)
        console.log('Chat: Мое сообщение в активном чате, обновляем last_message локально');
        setChats(prevChats => 
          prevChats.map(chat => 
            chat.id === message.chat_id 
              ? {
                  ...chat,
                  last_message: {
                    content: message.content,
                    message_type: message.message_type,
                    sender_id: message.sender_id,
                    created_at: message.created_at
                  }
                }
              : chat
          ).sort((a, b) => {
            const dateA = a.last_message?.created_at ? new Date(a.last_message.created_at) : new Date(0);
            const dateB = b.last_message?.created_at ? new Date(b.last_message.created_at) : new Date(0);
            return dateB - dateA;
          })
        );
      } else {
        // Для всех остальных случаев перезагружаем список с сервера
        console.log('Chat: Перезагружаем список чатов с сервера для получения актуального unread_count');
        loadChatsDebounced();
      }
    };

    const handleChatListUpdate = () => {
      loadChats();
    };

    const handleMessagesRead = (data) => {
      if (data.userId !== user.id) {
        setChats(prevChats => 
          prevChats.map(chat => 
            chat.id === data.chatId ? { ...chat, unread_count: 0 } : chat
          )
        );
      }
    };

    const handleUserTyping = (data) => {
      if (data.userId !== user.id && data.chatId === activeChatRef.current?.id) {
        setTypingUser(data.userName);
      }
    };

    const handleUserStopTyping = (data) => {
      if (data.userId !== user.id) {
        setTypingUser(null);
      }
    };

    const handleUserOnline = (data) => {
      setOnlineUsers(prev => new Set([...prev, data.userId]));
    };

    const handleUserOffline = (data) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    };

    const handleMessagePinned = (data) => {
      console.log('Chat: Сообщение закреплено/откреплено:', data);
      
      // Если это активный чат, обновляем закрепленные сообщения
      if (activeChatRef.current?.id === data.chatId) {
        loadPinnedMessages(data.chatId);
        
        // Обновляем is_pinned в списке сообщений
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId ? { ...msg, is_pinned: data.isPinned } : msg
        ));
      }
    };

    const handleReactionUpdated = (data) => {
      console.log('Chat: Реакция обновлена:', data);
      
      // Обновляем реакции для сообщения
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId ? { ...msg, reactions: data.reactions } : msg
      ));
    };

    // Подписываемся на события
    console.log('Chat: Подписываемся на WebSocket события');
    // Avoid attaching listeners multiple times to the same socket instance
    if (socket.id && socketListenersRef.current === socket.id) {
      console.log('Chat: Listeners уже прикреплены к этому socket.id, пропускаем');
    } else {
      socket.on('new-message', handleNewMessage);
      socket.on('chat-message-notification', handleChatMessageNotification);
      socket.on('chat-list-update', handleChatListUpdate);
      socket.on('messages-read', handleMessagesRead);
      socket.on('user-typing', handleUserTyping);
      socket.on('user-stop-typing', handleUserStopTyping);
      socket.on('user-online', handleUserOnline);
      socket.on('user-offline', handleUserOffline);
      socket.on('message-pinned', handleMessagePinned);
      socket.on('reaction-updated', handleReactionUpdated);
      socketListenersRef.current = socket.id || true; // mark listeners attached (use id if available)
    }

    return () => {
      console.log('Chat: Отписываемся от WebSocket событий');
      // Отписываемся от событий (но НЕ отключаем сокет)
      // Only remove if we previously attached listeners for this socket.id
      if (!socketListenersRef.current || socketListenersRef.current === socket.id || socketListenersRef.current === true) {
        socket.off('new-message', handleNewMessage);
        socket.off('chat-message-notification', handleChatMessageNotification);
        socket.off('chat-list-update', handleChatListUpdate);
        socket.off('messages-read', handleMessagesRead);
        socket.off('user-typing', handleUserTyping);
        socket.off('user-stop-typing', handleUserStopTyping);
        socket.off('user-online', handleUserOnline);
        socket.off('user-offline', handleUserOffline);
        socket.off('message-pinned', handleMessagePinned);
        socket.off('reaction-updated', handleReactionUpdated);
        socketListenersRef.current = null;
      }
    };
  }, [user.id, getSocket]); // Убрали activeChat из зависимостей

  useEffect(() => {
    if (activeChat) {
      console.log('Chat: Активирован чат:', activeChat.id);
      
      // Сохраняем активный чат в sessionStorage для контекста уведомлений
      sessionStorage.setItem('activeChatId', activeChat.id);
      
      // Устанавливаем загрузку
      setLoadingMessages(true);
      
      // Очищаем сообщения перед загрузкой новых
      setMessages([]);
      setPinnedMessages([]);
      
      // Загружаем сообщения
      const loadData = async () => {
        await Promise.all([
          loadMessages(activeChat.id),
          loadPinnedMessages(activeChat.id)
        ]);
        setLoadingMessages(false);
      };
      
      loadData();
      
      const socket = getSocket();
      if (socket && socket.connected) {
        console.log('Chat: Присоединяемся к чату:', activeChat.id);
        socket.emit('join-chat', activeChat.id);
      } else {
        console.log('Chat: Socket не подключен для присоединения к чату');
      }
      
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
      const socket = getSocket();
      if (activeChat && socket && socket.connected) {
        console.log('Chat: Покидаем чат:', activeChat.id);
        socket.emit('leave-chat', activeChat.id);
      }
      // Очищаем активный чат при размонтировании
      sessionStorage.removeItem('activeChatId');
    };
  }, [activeChat?.id]); // Используем только ID для сравнения

  // Автоскролл только при изменении сообщений, НЕ при изменении typingUser
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ОТКЛЮЧЕН: Polling больше не нужен, так как WebSocket доставляет все сообщения в реальном времени
  // Polling может вызывать дублирование и лишнюю нагрузку на сервер
  /*
  useEffect(() => {
    if (!activeChat) return;

    const intervalId = setInterval(() => {
      loadNewMessages(activeChat.id);
    }, 3000); // Проверяем каждые 3 секунды

    return () => clearInterval(intervalId);
  }, [activeChat?.id, messages]);
  */

  const loadChats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/chat');
      const newChats = response.data.chats;
      
      // Сохраняем ID активного чата перед обновлением
      const activeChatId = activeChatRef.current?.id;
      
      setChats(newChats);
      
      // Если был активный чат, обновляем его ссылку на новый объект из списка
      // Это предотвращает "перезапуск" чата при обновлении списка
      if (activeChatId) {
        const updatedActiveChat = newChats.find(c => c.id === activeChatId);
        if (updatedActiveChat) {
          setActiveChat(updatedActiveChat);
          activeChatRef.current = updatedActiveChat;
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced версия loadChats для предотвращения слишком частых запросов
  const loadChatsDebounced = () => {
    if (loadChatsTimeoutRef.current) {
      clearTimeout(loadChatsTimeoutRef.current);
    }
    loadChatsTimeoutRef.current = setTimeout(() => {
      loadChats();
    }, 500); // Ждем 500ms после последнего вызова перед загрузкой
  };

  const loadAllUsers = async () => {
    try {
      const response = await api.get('/users');
      // Фильтруем только учеников из той же группы (кроме себя)
      setAllUsers(response.data.users.filter(u => 
        u.id !== user.id && 
        u.role === 'student' && 
        u.group_id === user.group_id
      ));
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const response = await api.get('/users/online');
      const onlineUserIds = response.data.users.map(u => u.id);
      setOnlineUsers(new Set(onlineUserIds));
      console.log('Загружено онлайн пользователей:', onlineUserIds.length);
    } catch (error) {
      console.error('Ошибка загрузки онлайн пользователей:', error);
    }
  };

  const loadFrameImages = async () => {
    try {
      const response = await api.get('/shop/items?type=frame');
      const frames = {};
      response.data.items.forEach(item => {
        if (item.image_url) {
          frames[item.item_key] = item.image_url;
        }
      });
      setFrameImages(frames);
    } catch (error) {
      console.error('Ошибка загрузки рамок:', error);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      // Сначала загружаем из localStorage для мгновенного отображения
      const localKey = `chat_messages_${chatId}`;
      const localMessages = localStorage.getItem(localKey);
      if (localMessages) {
        try {
          const parsed = JSON.parse(localMessages);
          setMessages(parsed);
          scrollToBottom();
        } catch (e) {
          console.error('Ошибка парсинга локальных сообщений:', e);
        }
      }

      // Затем загружаем актуальные данные с сервера
      const response = await api.get(`/chat/${chatId}/messages`);
      const serverMessages = response.data.messages;
      setMessages(serverMessages);
      
      // Обновляем localStorage
      localStorage.setItem(localKey, JSON.stringify(serverMessages));
      
      scrollToBottom();
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    }
  };

  // Функция для получения новых сообщений (polling)
  const loadNewMessages = async (chatId) => {
    try {
      if (messages.length === 0) return;
      
      const lastMessageId = Math.max(...messages.map(m => m.id));
      const response = await api.get(`/chat/${chatId}/messages/new/${lastMessageId}`);
      
      if (response.data.messages && response.data.messages.length > 0) {
        console.log(`📨 Получено ${response.data.messages.length} новых сообщений через polling`);
        
        setMessages(prev => {
          // Дедупликация: фильтруем только новые сообщения
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueNewMessages = response.data.messages.filter(m => !existingIds.has(m.id));
          
          if (uniqueNewMessages.length === 0) {
            console.log('Все сообщения уже существуют, пропускаем обновление');
            return prev;
          }
          
          const newMessages = [...prev, ...uniqueNewMessages];
          
          // Обновляем localStorage
          const localKey = `chat_messages_${chatId}`;
          localStorage.setItem(localKey, JSON.stringify(newMessages));
          
          return newMessages;
        });
        
        scrollToBottom();
      }
    } catch (error) {
      console.error('Ошибка получения новых сообщений:', error);
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
      const socket = socketRef.current || getSocket();
      if (socket) {
        socket.emit('mark-read', chatId);
      }
      // Обновляем общий счетчик уведомлений
      loadUnreadCount();
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

  // Обработка ввода текста (индикатор печати)
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    const socket = socketRef.current;
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
        if (socket) {
          socket.emit('typing-stop', {
            chatId: activeChat.id
          });
        }
      }, 2000);
    } else {
      // Если поле пустое, сразу отправляем "перестал печатать"
      socket.emit('typing-stop', {
        chatId: activeChat.id
      });
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      const response = await api.post(`/chat/messages/${messageId}/reaction`, { emoji });
      
      // Обновляем реакции локально
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, reactions: response.data.reactions } : msg
      ));
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

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() && !selectedFile) return;
    
    const socket = socketRef.current;
    
    // Отправляем "перестал печатать" при отправке сообщения
    if (socket) {
      socket.emit('typing-stop', {
        chatId: activeChat.id
      });
    }

    try {
      if (editingMessage) {
        // Редактирование существующего сообщения
        await handleEditMessage(editingMessage.id, newMessage);
        setNewMessage('');
        setEditingMessage(null);
        return;
      }

      if (selectedFile) {
        // Отправка файла
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

        if (socket) {
          socket.emit('send-message', {
            chatId: activeChat.id,
            message: messageWithSender
          });
        }

        // НЕ обновляем список чатов здесь - это будет сделано через WebSocket событие chat-message-notification

        // Сообщение добавится через WebSocket событие 'new-message'
        setSelectedFile(null);
      } else {
        // Отправка текста или кода
        const response = await api.post(`/chat/${activeChat.id}/messages`, {
          content: newMessage,
          messageType: messageType,
          codeLanguage: messageType === 'code' ? 'auto' : null,
          replyTo: replyTo?.id
        });

        const messageWithSender = {
          ...response.data.message,
          sender_full_name: user.full_name,
          sender_username: user.username,
          sender_avatar_url: user.avatar_url,
          sender_avatar_frame: user.avatar_frame,
          sender_username_style: user.username_style,
          sender_message_color: user.message_color
        };

        // Добавляем сообщение локально сразу (оптимистическое обновление)
        setMessages(prev => {
          // Проверяем, нет ли уже этого сообщения
          const exists = prev.some(m => m.id === response.data.message.id);
          if (exists) {
            console.log('Сообщение уже существует, пропускаем добавление');
            return prev;
          }
          
          const newMessages = [...prev, messageWithSender];
          
          // Сохраняем в localStorage
          const localKey = `chat_messages_${activeChat.id}`;
          localStorage.setItem(localKey, JSON.stringify(newMessages));
          
          return newMessages;
        });
        
        // НЕ обновляем список чатов здесь - это будет сделано через WebSocket событие chat-message-notification

        scrollToBottom();
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
            <button onClick={() => handleEditMessage(message.id, newMessage)}><BsCheck /></button>
            <button onClick={() => { setEditingMessage(null); setNewMessage(''); }}><BsX /></button>
          </div>
        </div>
      );
    }

    return (
      <div key={message.id} className={`message ${isOwnMessage ? 'own' : 'other'} ${message.is_pinned ? 'pinned' : ''}`}>
        {message.is_pinned && (
          <div className="pinned-indicator">
            <BsPinFill /> Закреплено
          </div>
        )}

        {!isOwnMessage && (
          <div className="message-avatar-wrapper">
            <div className="message-avatar">
              {message.sender_avatar_url ? (
                <img src={`${BASE_URL}${message.sender_avatar_url}`} alt="" className="avatar-img" />
              ) : (
                <span className="avatar-icon">{(message.sender_full_name || message.sender_username)?.[0]}</span>
              )}
            </div>
            {message.sender_avatar_frame && message.sender_avatar_frame !== 'none' && frameImages[message.sender_avatar_frame] && (
              <img 
                src={`${BASE_URL}${frameImages[message.sender_avatar_frame]}`}
                alt="Frame"
                className="message-avatar-frame"
              />
            )}
          </div>
        )}
        <div className="message-bubble">
          {message.reply_to_id && (
            <div className="message-reply">
              <div className="reply-indicator"><BsReply /></div>
              <div className="reply-content">
                {message.reply_to_content?.substring(0, 50)}...
              </div>
            </div>
          )}

          <div className="message-header">
            <span className={`message-sender styled-username ${message.sender_username_style || 'username-none'}`}>
              {message.sender_full_name || message.sender_username}
            </span>
            <span className="message-time">
              {new Date(message.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              {message.is_edited && <span className="edited-badge"> (изменено)</span>}
            </span>
          </div>

          {message.message_type === 'code' ? (
            <div className="message-code">
              <div className="code-header">
                <span>КОД</span>
              </div>
              <SyntaxHighlighter 
                language={message.code_language ? normalizeLanguage(message.code_language) : detectLanguage(message.content)} 
                style={vscDarkPlus}
                showLineNumbers={true}
              >
                {message.content}
              </SyntaxHighlighter>
            </div>
          ) : message.message_type === 'file' ? (
            <div className="message-file">
              <span className="file-icon"><BsPaperclip /></span>
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
            <div className={`message-content ${message.sender_message_color || 'message-none'}`}>{message.content}</div>
          )}

          {/* Реакции */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="message-reactions">
              {message.reactions.map((reaction, idx) => (
                <span 
                  key={idx} 
                  className="reaction" 
                  title={reaction.user_names?.join(', ')}
                  onClick={() => handleReaction(message.id, reaction.emoji)}
                >
                  <EmojiIcon emoji={reaction.emoji} /> {reaction.count > 1 && reaction.count}
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
              <BsReply />
            </button>
            {user.role === 'admin' && activeChat?.type === 'group' && (
              <button 
                className="message-action-btn"
                onClick={() => togglePinMessage(message.id)}
                title={message.is_pinned ? 'Открепить' : 'Закрепить'}
              >
                <BsPinFill />
              </button>
            )}
            <button 
              className="message-action-btn"
              onClick={() => handleReaction(message.id, '👍')}
              title="Лайк"
            >
              <BsHandThumbsUp />
            </button>
            <button 
              className="message-action-btn"
              onClick={() => handleReaction(message.id, '❤️')}
              title="Сердце"
            >
              <BsHeart />
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
                  <BsPencil />
                </button>
                <button 
                  className="message-action-btn"
                  onClick={() => handleDeleteMessage(message.id)}
                  title="Удалить"
                >
                  <BsTrash />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="chat-loading">Загрузка чатов...</div>;
  }

  return (
    <div className="chat-container">
      {/* Сайдбар с чатами */}
      <div className={`chats-sidebar ${!showSidebar && isMobile ? 'hidden' : ''}`}>
        <div className="sidebar-header">
          <h3>Чаты</h3>
          <div className="sidebar-actions">
            {user.group_id && (
              <button
                className="btn-group-chat"
                onClick={openGroupChat}
                title="Групповой чат"
              >
                <BsPeopleFill />
              </button>
            )}
          </div>
        </div>

        {/* Список учеников из группы */}
        {allUsers.length > 0 && (
          <div className="students-section">
            <div className="students-header">
              <h4>Ученики группы</h4>
            </div>
            <div className="students-list">
              {allUsers.map(u => (
                <div 
                  key={u.id} 
                  className="student-item"
                  onClick={() => {
                    createPrivateChat(u.id);
                    if (isMobile) {
                      setShowSidebar(false);
                    }
                  }}
                >
                  <div className="student-avatar-wrapper">
                    <div className="student-avatar">
                      {u.avatar_url ? (
                        <img src={`${BASE_URL}${u.avatar_url}`} alt="" className="avatar-img" />
                      ) : (
                        <span className="avatar-icon">{(u.full_name || u.username)[0]}</span>
                      )}
                    </div>
                    {u.avatar_frame && u.avatar_frame !== 'none' && frameImages[u.avatar_frame] && (
                      <img 
                        src={`${BASE_URL}${frameImages[u.avatar_frame]}`}
                        alt="Frame"
                        className="student-avatar-frame"
                      />
                    )}
                  </div>
                  <div className="student-info">
                    <div className={`student-name styled-username ${u.username_style || 'username-none'}`}>
                      {u.full_name || u.username}
                    </div>
                    <span className={`student-status ${onlineUsers.has(u.id) ? 'online' : 'offline'}`}>
                      {onlineUsers.has(u.id) ? 'Онлайн' : 'Оффлайн'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="chats-section-header">
          <h4>Активные чаты</h4>
        </div>

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
                onClick={() => {
                  setActiveChat(chat);
                  if (isMobile) {
                    setShowSidebar(false);
                  }
                }}
              >
                <div className="chat-avatar-wrapper">
                  <div className="chat-avatar">
                    {chat.type === 'group' ? (
                      <span className="avatar-icon"><BsPeopleFill /></span>
                    ) : chat.other_user?.avatar_url ? (
                      <img src={`${BASE_URL}${chat.other_user.avatar_url}`} alt="" className="avatar-img" />
                    ) : (
                      <span className="avatar-icon">{(chat.other_user?.full_name || chat.other_user?.username)?.[0]}</span>
                    )}
                  </div>
                  {chat.type === 'private' && chat.other_user?.avatar_frame && chat.other_user.avatar_frame !== 'none' && frameImages[chat.other_user.avatar_frame] && (
                    <img 
                      src={`${BASE_URL}${frameImages[chat.other_user.avatar_frame]}`}
                      alt="Frame"
                      className="chat-avatar-frame"
                    />
                  )}
                  {chat.type === 'private' && chat.other_user && onlineUsers.has(chat.other_user.id) && (
                    <div className="online-indicator"></div>
                  )}
                </div>
                <div className="chat-info">
                  <div className="chat-name-row">
                    <div className={`chat-name ${chat.type === 'private' && chat.other_user?.username_style ? `styled-username ${chat.other_user.username_style}` : ''}`}>
                      {chat.type === 'group' ? chat.name : (chat.other_user?.full_name || chat.other_user?.username)}
                    </div>
                    {chat.type === 'private' && chat.other_user && (
                      <span className={`online-status ${onlineUsers.has(chat.other_user.id) ? 'online' : 'offline'}`}>
                        {onlineUsers.has(chat.other_user.id) ? 'Онлайн' : 'Оффлайн'}
                      </span>
                    )}
                  </div>
                  {chat.last_message && (
                    <div className="chat-last-message">
                      {chat.last_message.message_type === 'file' ? <><BsPaperclip /> Файл</> : 
                       chat.last_message.message_type === 'code' ? <><BsCode /> Код</> : 
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
                  <BsPinFill />
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
      <div className={`messages-area ${showSidebar && isMobile ? 'hidden' : ''} ${loadingMessages ? 'loading' : ''}`}>
        {activeChat ? (
          <>
            <div className="messages-header">
              <div className="chat-title">
                {isMobile && (
                  <button 
                    className="back-button" 
                    onClick={() => setShowSidebar(true)}
                    title="Назад к списку чатов"
                  >
                    ←
                  </button>
                )}
                {activeChat.type === 'group' ? activeChat.name : (activeChat.other_user?.full_name || activeChat.other_user?.username)}
              </div>
              <div className="chat-search">
                <input
                  type="text"
                  placeholder="Поиск по сообщениям..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            <div className="messages-list">
              {pinnedMessages.length > 0 && (
                <div className="pinned-messages">
                  <h4><BsPinFill /> Закрепленное сообщение</h4>
                  {pinnedMessages.map(msg => (
                    <div key={msg.id} className="pinned-message-item">
                      <strong>{msg.sender_full_name}:</strong> {msg.content?.substring(0, 50)}...
                    </div>
                  ))}
                </div>
              )}

              {messages
                .filter(msg => {
                  if (!searchQuery) return true;
                  return msg.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         msg.sender_full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         msg.sender_username?.toLowerCase().includes(searchQuery.toLowerCase());
                })
                .map(renderMessage)}
              <div ref={messagesEndRef} />
            </div>

            <form className="message-input-area" onSubmit={handleSendMessage}>
              {replyTo && (
                <div className="reply-preview">
                  <div className="reply-preview-content">
                    <strong>Ответ на:</strong> {replyTo.content?.substring(0, 50)}...
                  </div>
                  <button type="button" onClick={() => setReplyTo(null)}><BsX /></button>
                </div>
              )}

              <div className="input-controls">
                <select 
                  value={messageType} 
                  onChange={(e) => setMessageType(e.target.value)}
                  className="message-type-select"
                >
                  <option value="text">💬 Текст</option>
                  <option value="code">💻 Код</option>
                </select>

                <button 
                  type="button" 
                  className="btn-file"
                  onClick={() => fileInputRef.current?.click()}
                  title="Прикрепить файл"
                >
                  <BsPaperclip />
                </button>
                
                {typingUser && (
                  <div className="typing-indicator">
                    <span className="typing-user">{typingUser}</span> печатает
                    <span className="typing-dots">
                      <span>.</span><span>.</span><span>.</span>
                    </span>
                  </div>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>

              {selectedFile && (
                <div className="selected-file">
                  <span><BsPaperclip /> {selectedFile.name}</span>
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
