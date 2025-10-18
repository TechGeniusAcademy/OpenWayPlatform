import pool from '../config/database.js';

class TypingResult {
  // Создать таблицу результатов печати
  static async createTable() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS typing_results (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          text_length INTEGER NOT NULL,
          time_seconds INTEGER NOT NULL,
          wpm INTEGER NOT NULL,
          accuracy DECIMAL(5,2) NOT NULL,
          errors INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Таблица typing_results создана/проверена');
    } catch (error) {
      console.error('Ошибка создания таблицы typing_results:', error);
      throw error;
    }
  }

  // Сохранить результат печати
  static async create(userId, data) {
    try {
      const { text_length, time_seconds, wpm, accuracy, errors } = data;
      
      const result = await pool.query(
        `INSERT INTO typing_results (user_id, text_length, time_seconds, wpm, accuracy, errors)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, text_length, time_seconds, wpm, accuracy, errors]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Ошибка создания результата печати:', error);
      throw error;
    }
  }

  // Получить результаты пользователя
  static async getByUserId(userId, limit = 10) {
    try {
      const result = await pool.query(
        `SELECT * FROM typing_results
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Ошибка получения результатов пользователя:', error);
      throw error;
    }
  }

  // Получить статистику пользователя
  static async getUserStats(userId) {
    try {
      const result = await pool.query(
        `SELECT 
          COUNT(*) as total_tests,
          AVG(wpm) as avg_wpm,
          MAX(wpm) as best_wpm,
          AVG(accuracy) as avg_accuracy,
          MAX(accuracy) as best_accuracy,
          SUM(text_length) as total_characters,
          SUM(time_seconds) as total_time
         FROM typing_results
         WHERE user_id = $1`,
        [userId]
      );
      
      const stats = result.rows[0];
      
      // Преобразование значений
      return {
        total_tests: parseInt(stats.total_tests) || 0,
        avg_wpm: Math.round(parseFloat(stats.avg_wpm) || 0),
        best_wpm: parseInt(stats.best_wpm) || 0,
        avg_accuracy: Math.round(parseFloat(stats.avg_accuracy) || 0),
        best_accuracy: Math.round(parseFloat(stats.best_accuracy) || 0),
        total_characters: parseInt(stats.total_characters) || 0,
        total_time: parseInt(stats.total_time) || 0
      };
    } catch (error) {
      console.error('Ошибка получения статистики пользователя:', error);
      throw error;
    }
  }

  // Получить все результаты для админа
  static async getAll(limit = 100) {
    try {
      const result = await pool.query(
        `SELECT 
          tr.*,
          u.username,
          u.email,
          u.full_name,
          u.group_id,
          g.name as group_name
         FROM typing_results tr
         JOIN users u ON tr.user_id = u.id
         LEFT JOIN groups g ON u.group_id = g.id
         ORDER BY tr.created_at DESC
         LIMIT $1`,
        [limit]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Ошибка получения всех результатов:', error);
      throw error;
    }
  }

  // Получить топ результаты
  static async getTopResults(type = 'wpm', limit = 10) {
    try {
      let orderBy = 'wpm DESC';
      if (type === 'accuracy') {
        orderBy = 'accuracy DESC';
      }
      
      const result = await pool.query(
        `SELECT 
          tr.*,
          u.username,
          u.full_name,
          u.group_id,
          g.name as group_name
         FROM typing_results tr
         JOIN users u ON tr.user_id = u.id
         LEFT JOIN groups g ON u.group_id = g.id
         ORDER BY ${orderBy}
         LIMIT $1`,
        [limit]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Ошибка получения топ результатов:', error);
      throw error;
    }
  }

  // Получить статистику по группам
  static async getGroupStats() {
    try {
      const result = await pool.query(
        `SELECT 
          g.id as group_id,
          g.name as group_name,
          COUNT(tr.id) as total_tests,
          AVG(tr.wpm) as avg_wpm,
          MAX(tr.wpm) as best_wpm,
          AVG(tr.accuracy) as avg_accuracy,
          COUNT(DISTINCT tr.user_id) as active_students
         FROM groups g
         LEFT JOIN users u ON g.id = u.group_id
         LEFT JOIN typing_results tr ON u.id = tr.user_id
         GROUP BY g.id, g.name
         ORDER BY avg_wpm DESC NULLS LAST`
      );
      
      return result.rows.map(row => ({
        group_id: row.group_id,
        group_name: row.group_name,
        total_tests: parseInt(row.total_tests) || 0,
        avg_wpm: Math.round(parseFloat(row.avg_wpm) || 0),
        best_wpm: parseInt(row.best_wpm) || 0,
        avg_accuracy: Math.round(parseFloat(row.avg_accuracy) || 0),
        active_students: parseInt(row.active_students) || 0
      }));
    } catch (error) {
      console.error('Ошибка получения статистики по группам:', error);
      throw error;
    }
  }

  // Получить прогресс пользователя (последние 30 дней)
  static async getUserProgress(userId, days = 30) {
    try {
      const result = await pool.query(
        `SELECT 
          DATE(created_at) as date,
          AVG(wpm) as avg_wpm,
          AVG(accuracy) as avg_accuracy,
          COUNT(*) as tests_count
         FROM typing_results
         WHERE user_id = $1 
         AND created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [userId]
      );
      
      return result.rows.map(row => ({
        date: row.date,
        avg_wpm: Math.round(parseFloat(row.avg_wpm)),
        avg_accuracy: Math.round(parseFloat(row.avg_accuracy)),
        tests_count: parseInt(row.tests_count)
      }));
    } catch (error) {
      console.error('Ошибка получения прогресса пользователя:', error);
      throw error;
    }
  }

  // Удалить результат
  static async delete(id) {
    try {
      const result = await pool.query(
        'DELETE FROM typing_results WHERE id = $1 RETURNING *',
        [id]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Ошибка удаления результата:', error);
      throw error;
    }
  }
}

export default TypingResult;