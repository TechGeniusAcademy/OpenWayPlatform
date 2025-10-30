import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import GameCard from '../models/GameCard.js';
import GameSession from '../models/GameSession.js';
import GameRound from '../models/GameRound.js';
import GameQuestion from '../models/GameQuestion.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Настройка multer для загрузки изображений
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/cards/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'card-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB максимум
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Только изображения разрешены!'));
    }
  }
});

router.use(authenticate);

// ========== CARD MANAGEMENT (ADMIN) ==========

// Получить все карточки
router.get('/cards', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'css_editor' && req.user.role !== 'tester') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const cards = await GameCard.getAll();
    res.json({ cards });
  } catch (error) {
    console.error('Ошибка получения карточек:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создать карточку
router.post('/cards', upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const cardData = {
      ...req.body,
      created_by: req.user.id
    };

    // Если загружен файл, сохраняем путь к нему
    if (req.file) {
      cardData.image_url = `/uploads/cards/${req.file.filename}`;
    }

    const card = await GameCard.create(cardData);

    res.json({ card });
  } catch (error) {
    console.error('Ошибка создания карточки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновить карточку
router.put('/cards/:id', upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const cardData = { ...req.body };

    // Если загружен новый файл, обновляем путь
    if (req.file) {
      cardData.image_url = `/uploads/cards/${req.file.filename}`;
    }

    const card = await GameCard.update(req.params.id, cardData);
    res.json({ card });
  } catch (error) {
    console.error('Ошибка обновления карточки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удалить карточку
router.delete('/cards/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    await GameCard.delete(req.params.id);
    res.json({ message: 'Карточка удалена' });
  } catch (error) {
    console.error('Ошибка удаления карточки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ========== QUESTION MANAGEMENT (ADMIN) ==========

// Получить все вопросы
router.get('/questions', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const questions = await GameQuestion.getAll();
    res.json({ questions });
  } catch (error) {
    console.error('Ошибка получения вопросов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создать вопрос
router.post('/questions', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const question = await GameQuestion.create({
      ...req.body,
      created_by: req.user.id
    });

    res.json({ question });
  } catch (error) {
    console.error('Ошибка создания вопроса:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновить вопрос
router.put('/questions/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const question = await GameQuestion.update(req.params.id, req.body);
    res.json({ question });
  } catch (error) {
    console.error('Ошибка обновления вопроса:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удалить вопрос
router.delete('/questions/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    await GameQuestion.delete(req.params.id);
    res.json({ message: 'Вопрос удален' });
  } catch (error) {
    console.error('Ошибка удаления вопроса:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ========== GAME SESSION MANAGEMENT ==========

// Получить все сессии (ADMIN)
router.get('/sessions', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'css_editor' && req.user.role !== 'tester') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const sessions = await GameSession.getAll();
    res.json({ sessions });
  } catch (error) {
    console.error('Ошибка получения сессий:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить активные сессии студента
router.get('/sessions/my', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT gs.*, g.name as group_name,
              gp.team, gp.points_earned
       FROM game_sessions gs
       JOIN groups g ON gs.group_id = g.id
       JOIN game_participants gp ON gs.id = gp.session_id
       WHERE gp.user_id = $1 AND gs.status IN ('preparing', 'in_progress')
       ORDER BY gs.created_at DESC`,
      [req.user.id]
    );

    res.json({ sessions: result.rows });
  } catch (error) {
    console.error('Ошибка получения сессий:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создать новую игровую сессию
router.post('/sessions', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { groupId, totalRounds } = req.body;
    const session = await GameSession.create(groupId, req.user.id, totalRounds);
    
    res.json({ session });
  } catch (error) {
    console.error('Ошибка создания сессии:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить детали сессии
router.get('/sessions/:id', async (req, res) => {
  try {
    const session = await GameSession.getById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ error: 'Сессия не найдена' });
    }

    // Проверяем доступ
    if (req.user.role !== 'admin') {
      const isParticipant = session.participants?.some(p => p.user_id === req.user.id);
      if (!isParticipant) {
        return res.status(403).json({ error: 'Доступ запрещен' });
      }
    }

    res.json({ session });
  } catch (error) {
    console.error('Ошибка получения сессии:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Добавить участников и разделить на команды
router.post('/sessions/:id/assign-teams', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { userIds } = req.body;
    const teams = await GameSession.assignTeamsRandomly(req.params.id, userIds);
    
    res.json({ teams });
  } catch (error) {
    console.error('Ошибка распределения команд:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Начать игру
router.post('/sessions/:id/start', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const session = await GameSession.startGame(req.params.id);
    
    // TODO: Отправить уведомление всем участникам через WebSocket
    
    res.json({ session });
  } catch (error) {
    console.error('Ошибка начала игры:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить случайную карточку для раунда
router.get('/sessions/:id/draw-card', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const sessionId = req.params.id;
    const card = await GameCard.getRandomCard();
    const question = await GameQuestion.getRandomForSession(sessionId);
    
    // Если все вопросы использованы, берем любой случайный
    const finalQuestion = question || await GameQuestion.getRandom();
    
    res.json({ card, question: finalQuestion });
  } catch (error) {
    console.error('Ошибка получения карточки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создать новый раунд
router.post('/sessions/:id/rounds', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    let { roundNumber, team, cardId, questionId, question, timeLimit } = req.body;
    
    // Если roundNumber не передан, вычисляем автоматически
    if (!roundNumber) {
      const existingRounds = await GameRound.getBySession(req.params.id);
      roundNumber = existingRounds.length + 1;
    }
    
    const round = await GameRound.create(
      req.params.id,
      roundNumber,
      team,
      cardId,
      questionId,
      question,
      timeLimit
    );
    
    res.json({ round });
  } catch (error) {
    console.error('Ошибка создания раунда:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить текущий раунд
router.get('/sessions/:id/current-round', async (req, res) => {
  try {
    const round = await GameRound.getCurrentRound(req.params.id);
    res.json({ round });
  } catch (error) {
    console.error('Ошибка получения раунда:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Завершить раунд (правильный ответ)
router.post('/rounds/:id/answer-correct', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { answer, points } = req.body;
    const round = await GameRound.answerCorrect(req.params.id, answer, points);
    
    // Обновляем счет сессии и участников
    const roundData = await GameRound.getById(req.params.id);
    await GameSession.updateScore(roundData.session_id, roundData.team, points);
    await GameSession.addPointsToTeam(roundData.session_id, roundData.team, Math.floor(points / 2)); // Делим баллы между участниками
    
    res.json({ round });
  } catch (error) {
    console.error('Ошибка завершения раунда:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Завершить раунд (неправильный ответ)
router.post('/rounds/:id/answer-wrong', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { answer, points } = req.body;
    const round = await GameRound.answerWrong(req.params.id, answer, points);
    
    // Обновляем счет (обычно отрицательные баллы)
    const roundData = await GameRound.getById(req.params.id);
    await GameSession.updateScore(roundData.session_id, roundData.team, points);
    await GameSession.addPointsToTeam(roundData.session_id, roundData.team, Math.floor(points / 2));
    
    res.json({ round });
  } catch (error) {
    console.error('Ошибка завершения раунда:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Переключить ход
router.post('/sessions/:id/next-turn', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const session = await GameSession.switchTurn(req.params.id);
    res.json({ session });
  } catch (error) {
    console.error('Ошибка переключения хода:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Завершить игру
router.post('/sessions/:id/finish', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const result = await GameSession.finishGame(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Ошибка завершения игры:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить историю раундов
router.get('/sessions/:id/rounds', async (req, res) => {
  try {
    const rounds = await GameRound.getBySession(req.params.id);
    res.json({ rounds });
  } catch (error) {
    console.error('Ошибка получения раундов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удалить сессию
router.delete('/sessions/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    await GameSession.delete(req.params.id);
    res.json({ message: 'Сессия удалена' });
  } catch (error) {
    console.error('Ошибка удаления сессии:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
