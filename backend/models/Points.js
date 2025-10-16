import pool from '../config/database.js';

class Points {
  // Добавить баллы пользователю
  static async addPoints(userId, points, reason = '') {
    try {
      const result = await pool.query(
        `UPDATE users 
         SET points = points + $1 
         WHERE id = $2 
         RETURNING id, username, full_name, points`,
        [points, userId]
      );
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Установить баллы пользователю (перезаписать)
  static async setPoints(userId, points) {
    try {
      const result = await pool.query(
        `UPDATE users 
         SET points = $1 
         WHERE id = $2 
         RETURNING id, username, full_name, points`,
        [points, userId]
      );
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Получить топ студентов по баллам
  static async getTopStudents(limit = 10) {
    try {
      const result = await pool.query(
        `SELECT 
          u.id, 
          u.username, 
          u.full_name, 
          u.points,
          u.group_id,
          g.name as group_name
         FROM users u
         LEFT JOIN groups g ON u.group_id = g.id
         WHERE u.role = 'student'
         ORDER BY u.points DESC
         LIMIT $1`,
        [limit]
      );
      
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Получить топ групп по суммарным баллам
  static async getTopGroups(limit = 10) {
    try {
      const result = await pool.query(
        `SELECT 
          g.id,
          g.name,
          g.description,
          COUNT(u.id) as student_count,
          COALESCE(SUM(u.points), 0) as total_points,
          COALESCE(AVG(u.points), 0)::INTEGER as average_points
         FROM groups g
         LEFT JOIN users u ON g.id = u.group_id AND u.role = 'student'
         GROUP BY g.id, g.name, g.description
         HAVING COUNT(u.id) > 0
         ORDER BY total_points DESC
         LIMIT $1`,
        [limit]
      );
      
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Получить баллы конкретного студента
  static async getStudentPoints(userId) {
    try {
      const result = await pool.query(
        `SELECT 
          u.id, 
          u.username, 
          u.full_name, 
          u.points,
          u.group_id,
          g.name as group_name
         FROM users u
         LEFT JOIN groups g ON u.group_id = g.id
         WHERE u.id = $1 AND u.role = 'student'`,
        [userId]
      );
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

export default Points;
