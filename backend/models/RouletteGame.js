import pool from '../config/database.js';

// Номера на рулетке и их цвета
const ROULETTE_NUMBERS = {
  0: 'green',
  1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black',
  7: 'red', 8: 'black', 9: 'red', 10: 'black', 11: 'black', 12: 'red',
  13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red',
  19: 'red', 20: 'black', 21: 'red', 22: 'black', 23: 'red', 24: 'black',
  25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red',
  31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
};

// Коэффициенты выплат для разных типов ставок
const PAYOUT_MULTIPLIERS = {
  number: 35,      // Ставка на число: x35
  red: 2,          // Красное: x2
  black: 2,        // Черное: x2
  odd: 2,          // Нечетное: x2
  even: 2,         // Четное: x2
  low: 2,          // 1-18: x2
  high: 2,         // 19-36: x2
  dozen1: 3,       // 1-12: x3
  dozen2: 3,       // 13-24: x3
  dozen3: 3,       // 25-36: x3
  column1: 3,      // 1 колонна: x3
  column2: 3,      // 2 колонна: x3
  column3: 3       // 3 колонна: x3
};

class RouletteGame {
  // Создать новую игру
  static async createGame() {
    try {
      // Получить номер последней игры
      const lastGameResult = await pool.query(
        'SELECT MAX(game_number) as last_number FROM roulette_games'
      );
      const gameNumber = (lastGameResult.rows[0].last_number || 0) + 1;

      // Генерировать выигрышное число
      const winningNumber = Math.floor(Math.random() * 37); // 0-36
      const winningColor = ROULETTE_NUMBERS[winningNumber];

      const result = await pool.query(
        `INSERT INTO roulette_games (game_number, winning_number, winning_color, status)
         VALUES ($1, $2, $3, 'waiting')
         RETURNING *`,
        [gameNumber, winningNumber, winningColor]
      );

      console.log(`🎰 Создана новая игра рулетки #${gameNumber}, выигрышное число: ${winningNumber} (${winningColor})`);
      return result.rows[0];
    } catch (error) {
      console.error('[RouletteGame] Ошибка создания игры:', error);
      throw error;
    }
  }

  // Разместить ставку
  static async placeBet(gameId, userId, betType, betValue, betAmount) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Проверить статус игры
      const gameResult = await client.query(
        'SELECT * FROM roulette_games WHERE id = $1',
        [gameId]
      );

      if (gameResult.rows.length === 0) {
        throw new Error('Игра не найдена');
      }

      const game = gameResult.rows[0];
      if (game.status !== 'betting') {
        throw new Error('Ставки на эту игру закрыты');
      }

      // Проверить баланс пользователя
      const userResult = await client.query(
        'SELECT points FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('Пользователь не найден');
      }

      const currentBalance = userResult.rows[0].points || 0;
      
      if (currentBalance < betAmount) {
        throw new Error(`Недостаточно баллов. Есть: ${currentBalance}, нужно: ${betAmount}`);
      }

      // Списать баланс
      await client.query(
        'UPDATE users SET points = points - $1 WHERE id = $2',
        [betAmount, userId]
      );

      // Создать ставку
      const payoutMultiplier = PAYOUT_MULTIPLIERS[betType];
      const betResult = await client.query(
        `INSERT INTO roulette_bets (game_id, user_id, bet_type, bet_value, bet_amount, payout_multiplier)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [gameId, userId, betType, betValue, betAmount, payoutMultiplier]
      );

      // Обновить статистику игры
      await client.query(
        'UPDATE roulette_games SET total_bets = total_bets + $1 WHERE id = $2',
        [betAmount, gameId]
      );

      await client.query('COMMIT');

      console.log(`[Roulette] Ставка размещена: User ${userId}, ${betType} ${betValue || ''}, ${betAmount} баллов`);
      return betResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[RouletteGame] Ошибка размещения ставки:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Завершить игру и выплатить выигрыши
  static async finishGame(gameId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Получить игру
      const gameResult = await client.query(
        'SELECT * FROM roulette_games WHERE id = $1',
        [gameId]
      );

      if (gameResult.rows.length === 0) {
        throw new Error('Игра не найдена');
      }

      const game = gameResult.rows[0];
      const winningNumber = game.winning_number;
      const winningColor = game.winning_color;

      // Получить все ставки
      const betsResult = await client.query(
        'SELECT * FROM roulette_bets WHERE game_id = $1',
        [gameId]
      );

      let totalPayout = 0;

      // Проверить каждую ставку
      for (const bet of betsResult.rows) {
        const won = this.checkWin(bet, winningNumber, winningColor);
        
        if (won) {
          const payoutAmount = Math.floor(bet.bet_amount * bet.payout_multiplier);
          
          // Выплатить выигрыш
          await client.query(
            'UPDATE users SET points = points + $1 WHERE id = $2',
            [payoutAmount, bet.user_id]
          );

          // Обновить ставку
          await client.query(
            'UPDATE roulette_bets SET won = true, payout_amount = $1 WHERE id = $2',
            [payoutAmount, bet.id]
          );

          totalPayout += payoutAmount;

          // Обновить статистику пользователя
          await this.updateUserStats(client, bet.user_id, bet.bet_amount, payoutAmount, true);
          
          console.log(`[Roulette] User ${bet.user_id} выиграл ${payoutAmount} баллов (ставка: ${bet.bet_type} ${bet.bet_value || ''})`);
        } else {
          // Обновить статистику проигравшего
          await this.updateUserStats(client, bet.user_id, bet.bet_amount, 0, false);
        }
      }

      // Обновить игру
      await client.query(
        `UPDATE roulette_games 
         SET status = 'finished', total_payout = $1, finished_at = NOW()
         WHERE id = $2`,
        [totalPayout, gameId]
      );

      await client.query('COMMIT');

      console.log(`🎰 Игра #${game.game_number} завершена. Выпало: ${winningNumber} (${winningColor}). Выплачено: ${totalPayout}`);
      
      return {
        winningNumber,
        winningColor,
        totalPayout,
        totalBets: game.total_bets
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[RouletteGame] Ошибка завершения игры:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Проверить выигрыш ставки
  static checkWin(bet, winningNumber, winningColor) {
    switch (bet.bet_type) {
      case 'number':
        return bet.bet_value === winningNumber;
      
      case 'red':
        return winningColor === 'red';
      
      case 'black':
        return winningColor === 'black';
      
      case 'odd':
        return winningNumber > 0 && winningNumber % 2 === 1;
      
      case 'even':
        return winningNumber > 0 && winningNumber % 2 === 0;
      
      case 'low':
        return winningNumber >= 1 && winningNumber <= 18;
      
      case 'high':
        return winningNumber >= 19 && winningNumber <= 36;
      
      case 'dozen1':
        return winningNumber >= 1 && winningNumber <= 12;
      
      case 'dozen2':
        return winningNumber >= 13 && winningNumber <= 24;
      
      case 'dozen3':
        return winningNumber >= 25 && winningNumber <= 36;
      
      case 'column1':
        return winningNumber > 0 && (winningNumber - 1) % 3 === 0;
      
      case 'column2':
        return winningNumber > 0 && (winningNumber - 2) % 3 === 0;
      
      case 'column3':
        return winningNumber > 0 && winningNumber % 3 === 0;
      
      default:
        return false;
    }
  }

  // Обновить статистику пользователя
  static async updateUserStats(client, userId, wagered, won, isWin) {
    try {
      // Проверить существование статистики
      const statsResult = await client.query(
        'SELECT * FROM roulette_history WHERE user_id = $1',
        [userId]
      );

      if (statsResult.rows.length === 0) {
        // Создать новую статистику
        await client.query(
          `INSERT INTO roulette_history (user_id, total_games, total_bets, total_wagered, total_won, biggest_win)
           VALUES ($1, 1, 1, $2, $3, $4)`,
          [userId, wagered, won, won]
        );
      } else {
        // Обновить существующую
        const stats = statsResult.rows[0];
        const newBiggestWin = Math.max(stats.biggest_win || 0, won);
        
        await client.query(
          `UPDATE roulette_history 
           SET total_games = total_games + 1,
               total_bets = total_bets + 1,
               total_wagered = total_wagered + $2,
               total_won = total_won + $3,
               biggest_win = $4,
               last_played = NOW()
           WHERE user_id = $1`,
          [userId, wagered, won, newBiggestWin]
        );
      }
    } catch (error) {
      console.error('[RouletteGame] Ошибка обновления статистики:', error);
      // Не бросаем ошибку, чтобы не прервать транзакцию
    }
  }

  // Получить текущую игру
  static async getCurrentGame() {
    try {
      const result = await pool.query(
        `SELECT * FROM roulette_games 
         WHERE status IN ('waiting', 'betting', 'spinning')
         ORDER BY created_at DESC LIMIT 1`
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('[RouletteGame] Ошибка получения текущей игры:', error);
      throw error;
    }
  }

  // Получить ставки игры
  static async getGameBets(gameId) {
    try {
      const result = await pool.query(
        `SELECT rb.*, u.username, u.avatar_url
         FROM roulette_bets rb
         JOIN users u ON rb.user_id = u.id
         WHERE rb.game_id = $1
         ORDER BY rb.created_at ASC`,
        [gameId]
      );
      return result.rows;
    } catch (error) {
      console.error('[RouletteGame] Ошибка получения ставок:', error);
      throw error;
    }
  }

  // Получить историю игр
  static async getHistory(limit = 10) {
    try {
      const result = await pool.query(
        `SELECT * FROM roulette_games 
         WHERE status = 'finished'
         ORDER BY finished_at DESC
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch (error) {
      console.error('[RouletteGame] Ошибка получения истории:', error);
      throw error;
    }
  }

  // Получить статистику пользователя
  static async getUserStats(userId) {
    try {
      const result = await pool.query(
        'SELECT * FROM roulette_history WHERE user_id = $1',
        [userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('[RouletteGame] Ошибка получения статистики:', error);
      throw error;
    }
  }

  // Обновить статус игры
  static async updateGameStatus(gameId, status) {
    try {
      await pool.query(
        'UPDATE roulette_games SET status = $1 WHERE id = $2',
        [status, gameId]
      );
    } catch (error) {
      console.error('[RouletteGame] Ошибка обновления статуса:', error);
      throw error;
    }
  }
}

export default RouletteGame;
