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
    if (!user) {
      // Если пользователь не авторизован, отключаем сокет
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Подключаемся к WebSocket только если ещё не подключены
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });
      
      socketRef.current.on('connect', () => {
        console.log('🔌 WebSocket подключен');
        socketRef.current.emit('register', user.id);
      });

      socketRef.current.on('disconnect', () => {
        console.log('🔌 WebSocket отключен');
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('❌ Ошибка подключения WebSocket:', error);
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
