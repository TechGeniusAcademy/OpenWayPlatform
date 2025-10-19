import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './config/database.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import groupsRoutes from './routes/groups.js';
import pointsRoutes from './routes/points.js';
import chatRoutes from './routes/chat.js';
import testsRoutes from './routes/tests.js';
import homeworksRoutes from './routes/homeworks.js';
import typingRoutes from './routes/typing.js';
import gameRoutes from './routes/game.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Настройка CORS для Socket.IO
const corsOrigin = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*';
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Логирование запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tests', testsRoutes);
app.use('/api/homeworks', homeworksRoutes);
app.use('/api/typing', typingRoutes);
app.use('/api/game', gameRoutes);

// Базовый маршрут
app.get('/', (req, res) => {
  res.json({ message: 'Backend API работает!' });
});

// Обработка несуществующих маршрутов
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Ошибка сервера:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// WebSocket обработка
const activeUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('👤 Пользователь подключился:', socket.id);

  // Регистрация пользователя
  socket.on('register', (userId) => {
    activeUsers.set(userId, socket.id);
    socket.userId = userId;
    console.log(`✅ Пользователь ${userId} зарегистрирован`);
  });

  // Присоединение к чату
  socket.on('join-chat', (chatId) => {
    socket.join(`chat-${chatId}`);
    console.log(`📨 Пользователь ${socket.userId} присоединился к чату ${chatId}`);
  });

  // Покинуть чат
  socket.on('leave-chat', (chatId) => {
    socket.leave(`chat-${chatId}`);
    console.log(`📤 Пользователь ${socket.userId} покинул чат ${chatId}`);
  });

  // Отправка сообщения
  socket.on('send-message', (data) => {
    io.to(`chat-${data.chatId}`).emit('new-message', data.message);
    console.log(`💬 Новое сообщение в чате ${data.chatId}`);
  });

  // Пользователь печатает
  socket.on('typing', (data) => {
    socket.to(`chat-${data.chatId}`).emit('user-typing', {
      userId: socket.userId,
      chatId: data.chatId
    });
  });

  // Сообщения прочитаны
  socket.on('mark-read', (chatId) => {
    io.to(`chat-${chatId}`).emit('messages-read', {
      chatId: chatId,
      userId: socket.userId
    });
    console.log(`✅ Пользователь ${socket.userId} прочитал сообщения в чате ${chatId}`);
  });

  // Отключение
  socket.on('disconnect', () => {
    if (socket.userId) {
      activeUsers.delete(socket.userId);
      console.log(`👋 Пользователь ${socket.userId} отключился`);
    }
  });
});

// Запуск сервера
const startServer = async () => {
  try {
    // Инициализация базы данных
    await initDatabase();
    
    httpServer.listen(PORT, () => {
      console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
      console.log(`📊 База данных подключена`);
      console.log(`💬 WebSocket сервер готов`);
    });
  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
};

startServer();
