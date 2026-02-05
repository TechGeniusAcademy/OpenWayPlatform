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
import testingRoutes from './routes/testing.js';
import quizBattleRoutes from './routes/quiz-battle.js';
import rouletteRoutes from './routes/roulette.js';
import technicalSpecsRoutes from './routes/technical-specs.js';
import designProjectsRoutes from './routes/design-projects.js';
import coursesRoutes from './routes/courses.js';
import flexchanRoutes from './routes/flexchan.js';
import codeitFpsRoutes, { setupFpsSocket } from './routes/codeit-fps.js';
import layoutGameRoutes from './routes/layout-game.js';
import jsGameRoutes from './routes/js-game.js';
import userLevelsRoutes from './routes/user-levels.js';
import achievementsRoutes from './routes/achievements.js';
import musicRoutes from './routes/music.js';
import moviesRoutes from './routes/movies.js';
import scheduleRoutes from './routes/schedule.js';

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
const HOST = process.env.HOST || '0.0.0.0'; // Слушаем все интерфейсы

// Middleware
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/shop', express.static(path.join(__dirname, 'uploads', 'shop')));

// Делаем io доступным в маршрутах
app.set('io', io);

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
app.use('/api/projects-pg', projectsRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chess', chessRoutes);
app.use('/api/testing', testingRoutes);
app.use('/api/quiz-battle', quizBattleRoutes);
app.use('/api/roulette', rouletteRoutes);
app.use('/api/flexchan', flexchanRoutes);
app.use('/api/codeit-fps', codeitFpsRoutes);
app.use('/api/technical-specs', technicalSpecsRoutes);
app.use('/api/design-projects', designProjectsRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/layout-game', layoutGameRoutes);
app.use('/api/js-game', jsGameRoutes);
app.use('/api/user-levels', userLevelsRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/movies', moviesRoutes);
app.use('/api/schedule', scheduleRoutes);

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

  // Присоединение к любой комнате (универсальный обработчик)
  socket.on('join', (room) => {
    socket.join(room);
    console.log(`🚪 Socket ${socket.id} присоединился к комнате: ${room}`);
  });

  // Покинуть комнату (универсальный обработчик)
  socket.on('leave', (room) => {
    socket.leave(room);
    console.log(`🚪 Socket ${socket.id} покинул комнату: ${room}`);
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

// ========================================


// ========================================
// ROULETTE GAME LOGIC
// ========================================

import RouletteGame from './models/RouletteGame.js';

let currentRouletteGame = null;
let rouletteGameInterval = null;

// Создать новую игру рулетки
async function createNewRouletteGame() {
  try {
    currentRouletteGame = await RouletteGame.createGame();
    io.emit('roulette:new-game', {
      gameId: currentRouletteGame.id,
      gameNumber: currentRouletteGame.game_number,
      status: 'waiting'
    });

    // Через 10 секунд начать прием ставок
    setTimeout(() => {
      startRouletteBetting();
    }, 10000);

  } catch (error) {
    console.error('❌ Ошибка создания игры рулетки:', error);
  }
}

// Начать прием ставок
async function startRouletteBetting() {
  try {
    await RouletteGame.updateGameStatus(currentRouletteGame.id, 'betting');
    currentRouletteGame.status = 'betting'; // Обновляем локальный объект
    io.emit('roulette:betting-start', {
      gameId: currentRouletteGame.id,
      timeLeft: 30
    });

    // Через 30 секунд запустить рулетку
    setTimeout(() => {
      spinRoulette();
    }, 30000);

  } catch (error) {
    console.error('❌ Ошибка начала приема ставок:', error);
  }
}

// Запустить рулетку
async function spinRoulette() {
  try {
    await RouletteGame.updateGameStatus(currentRouletteGame.id, 'spinning');
    currentRouletteGame.status = 'spinning'; // Обновляем локальный объект
    
    io.emit('roulette:spinning', {
      gameId: currentRouletteGame.id
    });

    // Через 5 секунд показать результат
    setTimeout(() => {
      finishRouletteGame();
    }, 5000);

  } catch (error) {
    console.error('❌ Ошибка запуска рулетки:', error);
  }
}

// Завершить игру рулетки
async function finishRouletteGame() {
  try {
    const result = await RouletteGame.finishGame(currentRouletteGame.id);
    
    io.emit('roulette:result', {
      gameId: currentRouletteGame.id,
      winningNumber: result.winningNumber,
      winningColor: result.winningColor,
      totalPayout: result.totalPayout
    });

    // Через 5 секунд создать новую игру
    setTimeout(() => {
      createNewRouletteGame();
    }, 5000);

  } catch (error) {
    console.error('❌ Ошибка завершения игры рулетки:', error);
  }
}

// WebSocket обработчики для рулетки
io.on('connection', (socket) => {
  socket.on('roulette:join', async () => {
    try {
      if (currentRouletteGame) {
        const bets = await RouletteGame.getGameBets(currentRouletteGame.id);
        socket.emit('roulette:current-game', {
          game: currentRouletteGame,
          bets
        });
      }
    } catch (error) {
      console.error('[Roulette] Ошибка присоединения:', error);
    }
  });

  socket.on('roulette:place-bet', async (data) => {
    try {
      if (!socket.userId) {
        socket.emit('roulette:bet-error', { error: 'Не авторизован' });
        return;
      }

      const { betType, betValue, betAmount } = data;
      
      if (!currentRouletteGame || currentRouletteGame.status !== 'betting') {
        socket.emit('roulette:bet-error', { error: 'Ставки закрыты' });
        return;
      }

      const bet = await RouletteGame.placeBet(
        currentRouletteGame.id,
        socket.userId,
        betType,
        betValue,
        betAmount
      );

      // Отправить подтверждение игроку
      socket.emit('roulette:bet-success', { bet });

      // Обновить список ставок для всех
      const bets = await RouletteGame.getGameBets(currentRouletteGame.id);
      io.emit('roulette:bets-update', { bets });

    } catch (error) {
      console.error('[Roulette] Ошибка размещения ставки:', error);
      socket.emit('roulette:bet-error', { error: error.message });
    }
  });

  socket.on('roulette:leave', () => {
    console.log(`[Roulette] Игрок ${socket.userId} покинул рулетку`);
  });
});

// ========================================
// END OF ROULETTE GAME LOGIC
// ========================================

// Запуск сервера
const startServer = async () => {
  try {
    // Инициализация PostgreSQL базы данных
    await initDatabase();
    
    // Setup CodeIt FPS socket handlers
    setupFpsSocket(io);
    
    httpServer.listen(PORT, HOST, () => {
      console.log(`🚀 Сервер запущен на http://${HOST}:${PORT}`);
      console.log(`🌐 Публичный доступ: http://2.74.192.182:${PORT}`);
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
