import { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import io from 'socket.io-client';

const WebSocketContext = createContext();

// Правильное определение SOCKET_URL для production и development
const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl.replace('/api', '');
  }
  return 'http://localhost:5000';
};

const SOCKET_URL = getSocketUrl();

export function WebSocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    console.log('WebSocketContext: useEffect вызван, user:', user?.id);
    
    if (!user) {
      console.log('WebSocketContext: Пользователь не авторизован, отключаем socket');
      // Если пользователь не авторизован, отключаем сокет
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Подключаемся к WebSocket только если ещё не подключены
    if (!socketRef.current || !socketRef.current.connected) {
      console.log('WebSocketContext: Создаём новое подключение к', SOCKET_URL);
      
      // Отключаем старый сокет если есть
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      
      socketRef.current = io(SOCKET_URL, {
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        timeout: 10000
      });
      
      socketRef.current.on('connect', () => {
        console.log('🔌 WebSocket подключен, ID:', socketRef.current.id);
        console.log('WebSocketContext: Регистрируем пользователя', user.id);
        socketRef.current.emit('register', user.id);
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('🔌 WebSocket отключен, причина:', reason);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('❌ Ошибка подключения WebSocket:', error.message);
      });

      socketRef.current.on('reconnect', (attemptNumber) => {
        console.log('🔄 WebSocket переподключен после', attemptNumber, 'попыток');
        socketRef.current.emit('register', user.id);
      });
    }

    return () => {
      // НЕ отключаем сокет при размонтировании, так как он используется глобально
    };
  }, [user?.id]);

  const getSocket = () => socketRef.current;

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
