import express from 'express';
import { authenticate } from '../middleware/auth.js';
import RouletteGame from '../models/RouletteGame.js';

const router = express.Router();

// Получить текущую игру
router.get('/current', authenticate, async (req, res) => {
  try {
    const game = await RouletteGame.getCurrentGame();
    
    if (!game) {
      return res.json({ game: null, bets: [] });
    }

    const bets = await RouletteGame.getGameBets(game.id);
    
    res.json({ game, bets });
  } catch (error) {
    console.error('[Roulette API] Ошибка получения текущей игры:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Разместить ставку
router.post('/bet', authenticate, async (req, res) => {
  try {
    const { gameId, betType, betValue, betAmount } = req.body;
    const userId = req.user.id;

    // Валидация
    if (!gameId || !betType || betAmount === undefined) {
      return res.status(400).json({ error: 'Неверные параметры ставки' });
    }

    if (betAmount < 10 || betAmount > 1000) {
      return res.status(400).json({ error: 'Ставка должна быть от 10 до 1000 баллов' });
    }

    // Разместить ставку
    const bet = await RouletteGame.placeBet(gameId, userId, betType, betValue, betAmount);

    res.json({ bet });
  } catch (error) {
    console.error('[Roulette API] Ошибка размещения ставки:', error);
    res.status(400).json({ error: error.message });
  }
});

// Получить историю игр
router.get('/history', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const history = await RouletteGame.getHistory(limit);
    
    res.json({ history });
  } catch (error) {
    console.error('[Roulette API] Ошибка получения истории:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить статистику пользователя
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await RouletteGame.getUserStats(userId);
    
    res.json({ stats });
  } catch (error) {
    console.error('[Roulette API] Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
