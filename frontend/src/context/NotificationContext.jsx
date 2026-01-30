import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useWebSocket } from './WebSocketContext';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { getSocket } = useWebSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const audioContextRef = useRef(null); // AudioContext создается лениво
  const processedMessagesRef = useRef(new Set()); // Для предотвращения дублирования

  useEffect(() => {
    // Очищаем Set обработанных сообщений каждые 5 минут
    const cleanupInterval = setInterval(() => {
      processedMessagesRef.current.clear();
      console.log('NotificationContext: Очищен кеш обработанных сообщений');
    }, 5 * 60 * 1000);
    
    return () => {
      clearInterval(cleanupInterval);
      // Закрываем AudioContext при размонтировании
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    console.log('NotificationContext: Инициализация для пользователя', user.id);

    // Загружаем начальное количество непрочитанных
    loadUnreadCount();

    const socket = getSocket();
    if (!socket) {
      console.warn('NotificationContext: Socket еще не готов, ждем...');
      // Пробуем получить socket через небольшую задержку
      const timer = setTimeout(() => {
        const retrySocket = getSocket();
        if (retrySocket) {
          console.log('NotificationContext: Socket получен после повтора');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }

    console.log('NotificationContext: Socket получен, ID:', socket.id, 'Connected:', socket.connected);

    // Обработчик уведомлений о новых сообщениях (для всех участников чата)
    const handleChatMessageNotification = (message) => {
      console.log('NotificationContext: Получено уведомление о сообщении:', message);
      
      // Проверяем, не обработали ли мы уже это сообщение
      const messageKey = `${message.id}-${message.created_at}`;
      if (processedMessagesRef.current.has(messageKey)) {
        console.log('NotificationContext: Сообщение уже обработано, пропускаем дубликат');
        return;
      }
      processedMessagesRef.current.add(messageKey);
      
      // Если сообщение от текущего пользователя - игнорируем
      if (message.sender_id === user.id) {
        console.log('NotificationContext: Сообщение от текущего пользователя, пропускаем');
        return;
      }
      
      // Проверяем, находится ли пользователь на странице активного чата
      const isOnChatPage = window.location.pathname.includes('/chat');
      const activeChatId = parseInt(sessionStorage.getItem('activeChatId'));
      const isViewingThisChat = isOnChatPage && activeChatId === message.chat_id;
      
      console.log('NotificationContext: isOnChatPage=', isOnChatPage, 'activeChatId=', activeChatId, 'message.chat_id=', message.chat_id, 'isViewingThisChat=', isViewingThisChat);
      
      // Если пользователь НЕ смотрит этот чат, перезагружаем счётчик и играем звук
      if (!isViewingThisChat) {
        console.log('NotificationContext: Перезагружаем счетчик с сервера и играем звук');
        // Перезагружаем точное значение с сервера вместо инкремента
        loadUnreadCount();
        playNotificationSound();
      } else {
        console.log('NotificationContext: Пользователь смотрит этот чат, пропускаем уведомление');
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
    socket.on('chat-message-notification', handleChatMessageNotification);
    socket.on('messages-read', handleMessagesRead);
    
    console.log('NotificationContext: Подписались на события chat-message-notification и messages-read');

    return () => {
      // Отписываемся от событий
      socket.off('chat-message-notification', handleChatMessageNotification);
      socket.off('messages-read', handleMessagesRead);
      console.log('NotificationContext: Отписались от событий');
    };
  }, [user?.id]);

  const loadUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = `http://${window.location.hostname}:5000`;
      
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
      // Создаём AudioContext лениво при первом воспроизведении (после взаимодействия пользователя)
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        console.log('NotificationContext: AudioContext создан после взаимодействия пользователя');
      }
      
      const ctx = audioContextRef.current;
      
      // Возобновляем контекст если он приостановлен
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      // Первый звук (выше)
      const oscillator1 = ctx.createOscillator();
      const gainNode1 = ctx.createGain();
      
      oscillator1.connect(gainNode1);
      gainNode1.connect(ctx.destination);
      
      oscillator1.frequency.value = 800; // Частота
      oscillator1.type = 'sine'; // Тип волны
      
      gainNode1.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      oscillator1.start(ctx.currentTime);
      oscillator1.stop(ctx.currentTime + 0.15);
      
      // Второй звук (ниже, немного позже)
      const oscillator2 = ctx.createOscillator();
      const gainNode2 = ctx.createGain();
      
      oscillator2.connect(gainNode2);
      gainNode2.connect(ctx.destination);
      
      oscillator2.frequency.value = 600; // Ниже частота
      oscillator2.type = 'sine';
      
      gainNode2.gain.setValueAtTime(0.12, ctx.currentTime + 0.08);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      
      oscillator2.start(ctx.currentTime + 0.08);
      oscillator2.stop(ctx.currentTime + 0.25);
      
      console.log('NotificationContext: Звук уведомления воспроизведен');
    } catch (err) {
      console.error('NotificationContext: Ошибка воспроизведения звука:', err);
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
