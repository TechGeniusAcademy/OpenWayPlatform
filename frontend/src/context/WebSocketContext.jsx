import { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import io from 'socket.io-client';

const WebSocketContext = createContext();

// Динамическое определение SOCKET_URL на основе текущего хоста
const getSocketUrl = () => {
  return `http://${window.location.hostname}:5000`;
};

const SOCKET_URL = getSocketUrl();

// Глобальный singleton socket - создается только один раз для всего приложения
let globalSocket = null;
let globalSocketUserId = null;
let connectionTimeout = null;

const createSocket = (userId) => {
  // Отменяем предыдущий таймаут если он есть
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
  }

  // Если сокет уже существует и подключен с тем же userId, просто возвращаем его
  if (globalSocket && globalSocket.connected && globalSocketUserId === userId) {
    console.log('WebSocket: Используем существующее подключение для пользователя', userId);
    return globalSocket;
  }

  // Если сокет существует, подключен, но userId изменился
  if (globalSocket && globalSocket.connected && globalSocketUserId !== userId) {
    console.log('WebSocket: Обновляем userId с', globalSocketUserId, 'на', userId);
    globalSocketUserId = userId;
    globalSocket.emit('register', userId);
    return globalSocket;
  }

  // Если сокет существует но не подключен, пытаемся переподключить
  if (globalSocket && !globalSocket.connected) {
    console.log('WebSocket: Переподключаем существующий сокет');
    globalSocketUserId = userId;
    globalSocket.connect();
    return globalSocket;
  }

  console.log('WebSocket: Создаём НОВОЕ подключение к', SOCKET_URL);
  
  globalSocket = io(SOCKET_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 3,
    timeout: 10000,
    autoConnect: true,
    forceNew: false,
    multiplex: true
  });
  
  globalSocketUserId = userId;
  
  globalSocket.on('connect', () => {
    console.log('🔌 WebSocket ПОДКЛЮЧЕН, ID:', globalSocket.id);
    if (globalSocketUserId) {
      console.log('📤 Отправляем событие register для пользователя:', globalSocketUserId);
      globalSocket.emit('register', globalSocketUserId);
      // Дополнительно отправляем событие user-online для немедленного обновления статуса
      globalSocket.emit('set-online', globalSocketUserId);
    }
  });

  globalSocket.on('disconnect', (reason) => {
    console.log('🔌 WebSocket ОТКЛЮЧЕН, причина:', reason);
  });

  globalSocket.on('connect_error', (error) => {
    console.error('❌ Ошибка WebSocket:', error.message);
  });

  globalSocket.on('reconnect', (attemptNumber) => {
    console.log('🔄 WebSocket ПЕРЕПОДКЛЮЧЕН после', attemptNumber, 'попыток');
    if (globalSocketUserId) {
      console.log('📤 Переотправляем register после переподключения для:', globalSocketUserId);
      globalSocket.emit('register', globalSocketUserId);
      globalSocket.emit('set-online', globalSocketUserId);
    }
  });

  return globalSocket;
};

export function WebSocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    console.log('WebSocketContext: useEffect вызван, user:', user?.id);
    
    if (!user) {
      console.log('WebSocketContext: Пользователь НЕ авторизован');
      // Если пользователь не авторизован, отключаем сокет
      if (globalSocket) {
        console.log('WebSocket: Отключаем из-за выхода пользователя');
        globalSocket.disconnect();
        globalSocket.removeAllListeners();
        globalSocket = null;
        globalSocketUserId = null;
      }
      socketRef.current = null;
      return;
    }

    // Создаём или переиспользуем сокет
    socketRef.current = createSocket(user.id);

    return () => {
      // Очищаем таймаут при размонтировании
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
    };
  }, [user?.id]);

  // Возвращаем стабильную функцию getSocket для предотвращения лишних пересозданий
  const getSocket = (() => {
    // Оборачиваем в замыкание, чтобы вернуть всегда одну и ту же ссылку на функцию
    return () => socketRef.current;
  })();

  return (
    <WebSocketContext.Provider value={{ getSocket }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket должен использоваться внутри WebSocketProvider');
  }
  return context;
}
