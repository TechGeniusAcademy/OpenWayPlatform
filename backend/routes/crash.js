import express from 'express';
import CrashGame from '../models/CrashGame.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Получить текущую игру
router.get('/current', authenticate, async (req, res) => {
  try {
    const game = await CrashGame.getCurrentGame();
    
    if (!game) {
      return res.json({ game: null });
    }
    
    const bets = await CrashGame.getGameBets(game.id);
    
    res.json({ game, bets });
  } catch (error) {
    console.error('Error getting current game:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Разместить ставку
router.post('/bet', authenticate, async (req, res) => {
  try {
    const { betAmount } = req.body;
    const userId = req.user.id;
    
    // Валидация
    if (!betAmount || betAmount < 10) {
      return res.status(400).json({ error: 'Минимальная ставка 10 баллов' });
    }
    
    if (betAmount > 1000) {
      return res.status(400).json({ error: 'Максимальная ставка 1000 баллов' });
    }
    
    // Получить текущую игру
    let game = await CrashGame.getCurrentGame();
    
    // Если нет игры в ожидании, создать новую
    if (!game || game.status !== 'waiting') {
      return res.status(400).json({ error: 'Нет доступной игры для ставок' });
    }
    
    // Проверить, не делал ли игрок уже ставку в этой игре
    const existingBets = await CrashGame.getGameBets(game.id);
    const userBet = existingBets.find(bet => bet.user_id === userId);
    
    if (userBet) {
      return res.status(400).json({ error: 'Вы уже сделали ставку в этой игре' });
    }
    
    // Разместить ставку
    const bet = await CrashGame.placeBet(game.id, userId, betAmount);
    
    res.json({ success: true, bet, gameId: game.id });
    
  } catch (error) {
    console.error('Error placing bet:', error);
    
    if (error.message === 'Insufficient balance') {
      return res.status(400).json({ error: 'Недостаточно баллов' });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// Кешаут
router.post('/cashout', authenticate, async (req, res) => {
  try {
    const { betId, multiplier } = req.body;
    const userId = req.user.id;
    
    // Получить текущую игру
    const game = await CrashGame.getCurrentGame();
    
    if (!game || game.status !== 'running') {
      return res.status(400).json({ error: 'Игра не активна' });
    }
    
    // Проверить, что множитель не превышает текущий
    if (multiplier > game.current_multiplier) {
      return res.status(400).json({ error: 'Неверный множитель' });
    }
    
    // Кешаут
    const result = await CrashGame.cashout(betId, userId, multiplier);
    
    res.json({ success: true, ...result });
    
  } catch (error) {
    console.error('Error cashing out:', error);
    
    if (error.message === 'Bet not found or already cashed out') {
      return res.status(400).json({ error: 'Ставка не найдена или уже выведена' });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить историю игр
router.get('/history', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = await CrashGame.getHistory(limit);
    
    res.json({ history });
  } catch (error) {
    console.error('Error getting history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить статистику пользователя
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await CrashGame.getUserStats(userId);
    
    res.json({ stats });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить ставки игры
router.get('/game/:gameId/bets', authenticate, async (req, res) => {
  try {
    const { gameId } = req.params;
    const bets = await CrashGame.getGameBets(gameId);
    
    res.json({ bets });
  } catch (error) {
    console.error('Error getting game bets:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
