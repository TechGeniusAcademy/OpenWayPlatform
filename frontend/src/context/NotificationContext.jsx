import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useWebSocket } from './WebSocketContext';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { getSocket } = useWebSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef();

  useEffect(() => {
    // Создаём аудио элемент для звука уведомления
    // Используем простой beep звук через Data URI
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioRef.current = { audioContext };
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    // Загружаем начальное количество непрочитанных
    loadUnreadCount();

    const socket = getSocket();
    if (!socket) return;

    // Обработчик новых сообщений
    const handleNewMessage = (message) => {
      // Если сообщение от текущего пользователя - игнорируем
      if (message.sender_id === user.id) {
        return;
      }
      
      // Проверяем, находится ли пользователь на странице активного чата
      const isOnChatPage = window.location.pathname.includes('/chat');
      const activeChatId = parseInt(sessionStorage.getItem('activeChatId'));
      const isViewingThisChat = isOnChatPage && activeChatId === message.chat_id;
      
      // Если пользователь НЕ смотрит этот чат, увеличиваем счётчик и играем звук
      if (!isViewingThisChat) {
        setUnreadCount(prev => prev + 1);
        playNotificationSound();
      }
    };

    // Обработчик прочтения сообщений
    const handleMessagesRead = (data) => {
      if (data.userId === user.id) {
        // Перезагружаем счётчик
        loadUnreadCount();
      }
    };

    // Подписываемся на события
    socket.on('new-message', handleNewMessage);
    socket.on('messages-read', handleMessagesRead);

    return () => {
      // Отписываемся от событий
      socket.off('new-message', handleNewMessage);
      socket.off('messages-read', handleMessagesRead);
    };
  }, [user?.id, getSocket]);

  const loadUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const baseUrl = apiUrl.replace('/api', '');
      
      const response = await fetch(`${baseUrl}/api/chat/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Ошибка загрузки количества непрочитанных:', error);
    }
  };

  const playNotificationSound = () => {
    try {
      if (audioRef.current?.audioContext) {
        const ctx = audioRef.current.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        // Настройки звука
        oscillator.frequency.value = 800; // Частота
        oscillator.type = 'sine'; // Тип волны
        
        // Настройки громкости (плавное затухание)
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        // Воспроизводим звук
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
      }
    } catch (err) {
      console.log('Не удалось воспроизвести звук:', err);
    }
  };

  const clearUnreadCount = () => {
    setUnreadCount(0);
  };

  const decreaseUnreadCount = (count = 1) => {
    setUnreadCount(prev => Math.max(0, prev - count));
  };

  return (
    <NotificationContext.Provider value={{ 
      unreadCount, 
      clearUnreadCount,
      decreaseUnreadCount,
      loadUnreadCount
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications должен использоваться внутри NotificationProvider');
  }
  return context;
}
