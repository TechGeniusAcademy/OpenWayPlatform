import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/constants';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  return useContext(WebSocketContext);
};

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    initializeSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const initializeSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      const newSocket = io(API_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
        console.log('WebSocket подключен');
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('WebSocket отключен');
        setConnected(false);
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('Ошибка инициализации WebSocket:', error);
    }
  };

  const value = {
    socket,
    connected,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
