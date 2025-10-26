import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

class User {
  // Создание нового пользователя
  static async create({ username, email, password, role = 'student', full_name }) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const result = await pool.query(
        `INSERT INTO users (username, email, password, role, full_name) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, username, email, role, full_name, created_at`,
        [username, email, hashedPassword, role, full_name]
      );
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Поиск пользователя по email
  static async findByEmail(email) {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Поиск пользователя по username
  static async findByUsername(username) {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Поиск пользователя по ID
  static async findById(id) {
    try {
      const result = await pool.query(
        'SELECT id, username, email, role, full_name, group_id, points, avatar_url, avatar_frame, profile_banner, username_style, message_color, created_at FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Получить всех пользователей
  static async getAll() {
    try {
      const result = await pool.query(
        `SELECT u.id, u.username, u.email, u.role, u.full_name, u.group_id, u.points, u.created_at,
         g.name as group_name
         FROM users u
         LEFT JOIN groups g ON u.group_id = g.id
         ORDER BY u.created_at DESC`
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Получить онлайн пользователей
  static async getOnlineUsers() {
    try {
      const result = await pool.query(
        `SELECT id, username, role, full_name, avatar_url, is_online, last_seen
         FROM users 
         WHERE is_online = TRUE
         ORDER BY username ASC`
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Проверка пароля
  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Обновление пользователя
  static async update(id, updates) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (key !== 'id' && value !== undefined) {
          if (key === 'password') {
            fields.push(`${key} = $${paramCount}`);
            values.push(await bcrypt.hash(value, 10));
          } else {
            fields.push(`${key} = $${paramCount}`);
            values.push(value);
          }
          paramCount++;
        }
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE users 
        SET ${fields.join(', ')} 
        WHERE id = $${paramCount}
        RETURNING id, username, email, role, full_name, created_at, updated_at
      `;

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Удаление пользователя
  static async delete(id) {
    try {
      const result = await pool.query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

export default User;
