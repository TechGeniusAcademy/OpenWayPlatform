import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './config/database.js';
import pool from './config/database.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import groupsRoutes from './routes/groups.js';
import pointsRoutes from './routes/points.js';
import chatRoutes from './routes/chat.js';
import testsRoutes from './routes/tests.js';
import homeworksRoutes from './routes/homeworks.js';
import typingRoutes from './routes/typing.js';
import gameRoutes from './routes/game.js';
import shopRoutes from './routes/shop.js';
import adminShopRoutes from './routes/admin-shop.js';
import knowledgeBaseRoutes from './routes/knowledge-base.js';
import updatesRoutes from './routes/updates.js';
import adminUpdatesRoutes from './routes/admin-updates.js';
import projectsRoutes from './routes/projects-pg.js';
import submissionsRoutes from './routes/submissions.js';
import aiRoutes from './routes/ai.js';
import chessRoutes from './routes/chess.js';

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
  transports: ['websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  perMessageDeflate: false
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/shop', express.static(path.join(__dirname, 'uploads', 'shop')));

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
app.use('/api/shop', shopRoutes);
app.use('/api/admin/shop', adminShopRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/updates', updatesRoutes);
app.use('/api/admin/updates', adminUpdatesRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chess', chessRoutes);

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
  socket.on('register', async (userId) => {
    console.log(`🔔 Получен запрос register от пользователя ${userId}, socket: ${socket.id}`);
    
    // Удаляем старое подключение если оно было И это другой сокет
    const oldSocketId = activeUsers.get(userId);
    if (oldSocketId && oldSocketId !== socket.id) {
      console.log(`🔄 Пользователь ${userId} переподключается, старый socket: ${oldSocketId}, новый: ${socket.id}`);
      // Отключаем старый сокет
      const oldSocket = io.sockets.sockets.get(oldSocketId);
      if (oldSocket) {
        oldSocket.disconnect(true);
      }
    } else if (oldSocketId === socket.id) {
      console.log(`✅ Пользователь ${userId} уже зарегистрирован с этим сокетом ${socket.id}`);
      // Не выходим, а просто проверяем что пользователь в комнате
    }
    
    activeUsers.set(userId, socket.id);
    socket.userId = userId;
    
    // Присоединяем к персональной комнате для уведомлений
    socket.join(`user-${userId}`);
    
    console.log(`✅ Пользователь ${userId} присоединился к комнате user-${userId}, socket: ${socket.id}`);
    console.log(`👥 Активных пользователей: ${activeUsers.size}`);
    console.log(`📋 Комнаты сокета ${socket.id}:`, Array.from(socket.rooms));
    
    // Обновляем статус пользователя на "онлайн" в БД
    try {
      await pool.query(
        'UPDATE users SET is_online = TRUE, last_seen = NOW() WHERE id = $1',
        [userId]
      );
      
      // Уведомляем всех о том, что пользователь онлайн
      io.emit('user-online', { userId, socketId: socket.id });
      console.log(`✅ Пользователь ${userId} зарегистрирован и онлайн в комнате user-${userId}`);
    } catch (error) {
      console.error('Ошибка обновления онлайн статуса:', error);
    }
  });

  // Установка статуса онлайн (используется при загрузке любой страницы)
  socket.on('set-online', async (userId) => {
    try {
      await pool.query(
        'UPDATE users SET is_online = TRUE, last_seen = NOW() WHERE id = $1',
        [userId]
      );
      
      // Уведомляем всех о том, что пользователь онлайн
      io.emit('user-online', { userId, socketId: socket.id });
      console.log(`✅ Пользователь ${userId} установлен как онлайн`);
    } catch (error) {
      console.error('Ошибка установки онлайн статуса:', error);
    }
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

  // Индикатор печати
  socket.on('typing-start', ({ chatId, userName }) => {
    socket.to(`chat-${chatId}`).emit('user-typing', {
      chatId: chatId,
      userId: socket.userId,
      userName: userName
    });
  });

  socket.on('typing-stop', ({ chatId }) => {
    socket.to(`chat-${chatId}`).emit('user-stop-typing', {
      chatId: chatId,
      userId: socket.userId
    });
  });

  // Шахматы: присоединиться к игре
  socket.on('join-chess-game', (gameId) => {
    socket.join(`chess-${gameId}`);
    console.log(`♟️ Пользователь ${socket.userId} присоединился к шахматной игре ${gameId}`);
  });

  // Шахматы: покинуть игру
  socket.on('leave-chess-game', (gameId) => {
    socket.leave(`chess-${gameId}`);
    console.log(`♟️ Пользователь ${socket.userId} покинул шахматную игру ${gameId}`);
  });

  // Шахматы: сделать ход
  socket.on('chess-move', async (data) => {
    const { gameId, move, position } = data;
    
    try {
      // Получаем обновлённые данные таймера из базы
      const result = await pool.query(
        'SELECT white_time_left, black_time_left FROM chess_games WHERE id = $1',
        [gameId]
      );
      
      if (result.rows.length > 0) {
        const { white_time_left, black_time_left } = result.rows[0];
        
        // Отправляем ход противнику с таймерами
        socket.to(`chess-${gameId}`).emit('chess-move-made', {
          move,
          position,
          playerId: socket.userId,
          whiteTimeLeft: white_time_left,
          blackTimeLeft: black_time_left
        });
        
        console.log(`♟️ Ход в игре ${gameId}: ${move}, таймеры - white: ${white_time_left}s, black: ${black_time_left}s`);
      }
    } catch (error) {
      console.error('Ошибка при отправке хода:', error);
    }
  });

  // Шахматы: отправка вызова
  socket.on('chess-challenge-sent', (data) => {
    const { opponentId, gameId, challengerName } = data;
    console.log(`♟️ Получено событие chess-challenge-sent:`, data);
    console.log(`♟️ Текущий пользователь (челленджер): ${socket.userId}`);
    console.log(`♟️ Противник: ${opponentId}`);
    console.log(`♟️ Отправляем в комнату: user-${opponentId}`);
    
    // Проверяем, есть ли противник в activeUsers
    const opponentSocketId = activeUsers.get(parseInt(opponentId));
    console.log(`♟️ Socket ID противника: ${opponentSocketId}`);
    
    // Отправляем уведомление противнику
    const emitResult = io.to(`user-${opponentId}`).emit('chess-challenge-received', {
      gameId,
      challengerId: socket.userId,
      challengerName
    });
    
    console.log(`♟️ Событие отправлено в комнату user-${opponentId}`);
    
    // Дублируем отправку напрямую по socket ID если есть
    if (opponentSocketId) {
      io.to(opponentSocketId).emit('chess-challenge-received', {
        gameId,
        challengerId: socket.userId,
        challengerName
      });
      console.log(`♟️ Событие также отправлено напрямую на socket ${opponentSocketId}`);
    }
  });

  // Шахматы: принятие вызова
  socket.on('chess-challenge-accepted', (data) => {
    const { gameId, challengerId } = data;
    // Уведомляем челленджера
    io.to(`user-${challengerId}`).emit('chess-challenge-accepted-notification', {
      gameId,
      acceptorId: socket.userId
    });
    console.log(`♟️ Вызов принят для игры ${gameId}`);
  });

  // Шахматы: отклонение вызова
  socket.on('chess-challenge-declined', (data) => {
    const { gameId, challengerId } = data;
    // Уведомляем челленджера
    io.to(`user-${challengerId}`).emit('chess-challenge-declined-notification', {
      gameId,
      declinerId: socket.userId
    });
    console.log(`♟️ Вызов отклонён для игры ${gameId}`);
  });

  // Шахматы: завершение игры
  socket.on('chess-game-ended', (data) => {
    const { gameId, result, reason } = data;
    // Уведомляем обоих игроков
    io.to(`chess-${gameId}`).emit('chess-game-finished', {
      gameId,
      result,
      reason
    });
    console.log(`♟️ Игра ${gameId} завершена: ${result} (${reason})`);
  });

  // Отключение
  socket.on('disconnect', async () => {
    if (socket.userId) {
      activeUsers.delete(socket.userId);
      
      // Обновляем статус пользователя на "офлайн" в БД
      try {
        await pool.query(
          'UPDATE users SET is_online = FALSE, last_seen = NOW() WHERE id = $1',
          [socket.userId]
        );
        
        // Уведомляем всех о том, что пользователь офлайн
        io.emit('user-offline', { userId: socket.userId });
        console.log(`👋 Пользователь ${socket.userId} отключился и офлайн`);
      } catch (error) {
        console.error('Ошибка обновления офлайн статуса:', error);
      }
    }
  });
});

// Запуск сервера
const startServer = async () => {
  try {
    // Инициализация PostgreSQL базы данных
    await initDatabase();
    
    httpServer.listen(PORT, () => {
      console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
      console.log(`📊 PostgreSQL база данных подключена`);
      console.log(`💬 WebSocket сервер готов`);
    });
  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
};

startServer();

export { io };
