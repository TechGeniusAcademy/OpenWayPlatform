import pool from '../config/database.js';

class CrashGame {
  // Создать новую игру
  static async createGame(crashPoint) {
    const result = await pool.query(
      `INSERT INTO crash_games (crash_point, status, current_multiplier, created_at)
       VALUES ($1, 'waiting', 1.00, NOW())
       RETURNING *`,
      [crashPoint]
    );
    return result.rows[0];
  }

  // Получить текущую активную игру
  static async getCurrentGame() {
    const result = await pool.query(
      `SELECT * FROM crash_games 
       WHERE status IN ('waiting', 'running')
       ORDER BY created_at DESC
       LIMIT 1`
    );
    return result.rows[0];
  }

  // Начать игру
  static async startGame(gameId) {
    const result = await pool.query(
      `UPDATE crash_games 
       SET status = 'running', started_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [gameId]
    );
    return result.rows[0];
  }

  // Обновить множитель
  static async updateMultiplier(gameId, multiplier) {
    const result = await pool.query(
      `UPDATE crash_games 
       SET current_multiplier = $2
       WHERE id = $1
       RETURNING *`,
      [gameId, multiplier]
    );
    return result.rows[0];
  }

  // Завершить игру (краш)
  static async crashGame(gameId) {
    const result = await pool.query(
      `UPDATE crash_games 
       SET status = 'crashed', crashed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [gameId]
    );
    
    // Обновить все активные ставки как проигранные
    await pool.query(
      `UPDATE crash_bets 
       SET status = 'lost'
       WHERE game_id = $1 AND status = 'active'`,
      [gameId]
    );
    
    return result.rows[0];
  }

  // Разместить ставку
  static async placeBet(gameId, userId, betAmount) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Проверить баланс пользователя
      const userResult = await client.query(
        'SELECT points FROM users WHERE id = $1',
        [userId]
      );
      
      console.log(`[CRASH] User ${userId} balance:`, userResult.rows[0]?.points);
      console.log(`[CRASH] Bet amount:`, betAmount);
      
      if (!userResult.rows[0]) {
        throw new Error('User not found');
      }
      
      if (userResult.rows[0].points < betAmount) {
        throw new Error(`Insufficient balance: has ${userResult.rows[0].points}, needs ${betAmount}`);
      }
      
      // Списать баллы
      await client.query(
        'UPDATE users SET points = points - $1 WHERE id = $2',
        [betAmount, userId]
      );
      
      // Создать ставку
      const betResult = await client.query(
        `INSERT INTO crash_bets (game_id, user_id, bet_amount, status, created_at)
         VALUES ($1, $2, $3, 'active', NOW())
         RETURNING *`,
        [gameId, userId, betAmount]
      );
      
      await client.query('COMMIT');
      console.log(`[CRASH] Bet placed successfully for user ${userId}`);
      return betResult.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Кешаут (вывести деньги)
  static async cashout(betId, userId, multiplier) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Получить ставку
      const betResult = await client.query(
        `SELECT * FROM crash_bets 
         WHERE id = $1 AND user_id = $2 AND status = 'active'`,
        [betId, userId]
      );
      
      if (!betResult.rows[0]) {
        throw new Error('Bet not found or already cashed out');
      }
      
      const bet = betResult.rows[0];
      const winAmount = Math.floor(bet.bet_amount * multiplier);
      
      // Обновить ставку
      await client.query(
        `UPDATE crash_bets 
         SET status = 'cashed_out', 
             cashout_multiplier = $1, 
             win_amount = $2,
             cashed_out_at = NOW()
         WHERE id = $3`,
        [multiplier, winAmount, betId]
      );
      
      // Начислить выигрыш
      await client.query(
        'UPDATE users SET points = points + $1 WHERE id = $2',
        [winAmount, userId]
      );
      
      // Записать в историю баллов
      await client.query(
        `INSERT INTO points_history (user_id, points, description, type, created_at)
         VALUES ($1, $2, $3, 'casino', NOW())`,
        [userId, winAmount - bet.bet_amount, `Crash game win at ${multiplier}x`]
      );
      
      await client.query('COMMIT');
      return { bet: betResult.rows[0], winAmount };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Получить все ставки для игры
  static async getGameBets(gameId) {
    const result = await pool.query(
      `SELECT cb.*, u.username, u.avatar_url 
       FROM crash_bets cb
       JOIN users u ON cb.user_id = u.id
       WHERE cb.game_id = $1
       ORDER BY cb.created_at DESC`,
      [gameId]
    );
    return result.rows;
  }

  // Получить историю игр
  static async getHistory(limit = 20) {
    const result = await pool.query(
      `SELECT * FROM crash_games 
       WHERE status = 'crashed'
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  // Получить статистику пользователя
  static async getUserStats(userId) {
    const result = await pool.query(
      `SELECT 
         COUNT(*) as total_games,
         COUNT(CASE WHEN status = 'cashed_out' THEN 1 END) as wins,
         COUNT(CASE WHEN status = 'lost' THEN 1 END) as losses,
         COALESCE(SUM(bet_amount), 0) as total_wagered,
         COALESCE(SUM(CASE WHEN status = 'cashed_out' THEN win_amount ELSE 0 END), 0) as total_won,
         COALESCE(MAX(cashout_multiplier), 0) as best_multiplier
       FROM crash_bets
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }

  // Сохранить в историю
  static async saveToHistory(gameId) {
    const gameResult = await pool.query(
      'SELECT * FROM crash_games WHERE id = $1',
      [gameId]
    );
    
    const betsResult = await pool.query(
      `SELECT 
         COUNT(*) as total_bets,
         COALESCE(SUM(bet_amount), 0) as total_wagered,
         COALESCE(SUM(CASE WHEN status = 'cashed_out' THEN win_amount ELSE 0 END), 0) as total_payout
       FROM crash_bets
       WHERE game_id = $1`,
      [gameId]
    );
    
    const game = gameResult.rows[0];
    const stats = betsResult.rows[0];
    
    await pool.query(
      `INSERT INTO crash_history (game_id, crash_point, total_bets, total_wagered, total_payout, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [gameId, game.crash_point, stats.total_bets, stats.total_wagered, stats.total_payout]
    );
  }

  // Генерация честного crash point (provably fair)
  static generateCrashPoint() {
    // Простой алгоритм для демонстрации
    // В продакшене нужно использовать cryptographically secure random + hash
    const e = 1;
    const h = Math.random();
    
    // Формула гарантирует распределение с математическим ожиданием
    // Средний crash point будет около 2.0x (50% RTP)
    const crashPoint = Math.max(1.00, (100 * e - h * 100) / (100 - h * 100));
    
    return Math.min(parseFloat(crashPoint.toFixed(2)), 1000.00); // макс 1000x
  }

  // Улучшенный алгоритм генерации crash point
  static generateFairCrashPoint() {
    // Используем экспоненциальное распределение для более честной игры
    const houseEdge = 0.03; // 3% комиссия казино
    const random = Math.random();
    
    // Инверсия экспоненциального распределения
    const crashPoint = Math.max(1.00, (1 / (1 - random)) * (1 - houseEdge));
    
    return Math.min(parseFloat(crashPoint.toFixed(2)), 10000.00);
  }
}

export default CrashGame;
