import pool from '../config/database.js';

class Group {
  // Создание новой группы
  static async create({ name, description }) {
    try {
      const result = await pool.query(
        `INSERT INTO groups (name, description) 
         VALUES ($1, $2) 
         RETURNING id, name, description, created_at`,
        [name, description]
      );
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Получить все группы
  static async getAll() {
    try {
      const result = await pool.query(`
        SELECT 
          g.*,
          COUNT(u.id) as student_count,
          ul.username as leader_username,
          ul.full_name as leader_full_name
        FROM groups g
        LEFT JOIN users u ON u.group_id = g.id AND u.role = 'student'
        LEFT JOIN users ul ON ul.id = g.leader_id
        GROUP BY g.id, ul.username, ul.full_name
        ORDER BY g.created_at DESC
      `);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Получить группу по ID
  static async findById(id) {
    try {
      const result = await pool.query(
        'SELECT * FROM groups WHERE id = $1',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Получить группу со списком студентов
  static async getWithStudents(id) {
    try {
      const groupResult = await pool.query(
        'SELECT * FROM groups WHERE id = $1',
        [id]
      );

      if (groupResult.rows.length === 0) {
        return null;
      }

      const studentsResult = await pool.query(
        `SELECT 
          id, 
          username, 
          email, 
          full_name, 
          avatar_url,
          avatar_frame,
          profile_banner,
          username_style,
          points,
          is_group_leader,
          created_at 
         FROM users 
         WHERE group_id = $1 AND role = 'student'
         ORDER BY full_name, username`,
        [id]
      );

      return {
        ...groupResult.rows[0],
        students: studentsResult.rows
      };
    } catch (error) {
      throw error;
    }
  }

  // Обновление группы
  static async update(id, updates) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (key !== 'id' && value !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE groups 
        SET ${fields.join(', ')} 
        WHERE id = $${paramCount}
        RETURNING id, name, description, created_at, updated_at
      `;

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Удаление группы
  static async delete(id) {
    try {
      // Сначала удаляем связь студентов с группой
      await pool.query(
        'UPDATE users SET group_id = NULL WHERE group_id = $1',
        [id]
      );

      // Затем удаляем группу
      const result = await pool.query(
        'DELETE FROM groups WHERE id = $1 RETURNING id',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Добавить студентов в группу
  static async addStudents(groupId, studentIds) {
    try {
      const result = await pool.query(
        `UPDATE users 
         SET group_id = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ANY($2) AND role = 'student'
         RETURNING id, username, email, full_name, avatar_url, avatar_frame, profile_banner, username_style, points`,
        [groupId, studentIds]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Удалить студента из группы
  static async removeStudent(studentId) {
    try {
      const result = await pool.query(
        `UPDATE users 
         SET group_id = NULL, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1
         RETURNING id`,
        [studentId]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Назначить старосту группы
  static async setLeader(groupId, userId) {
    await pool.query(
      `UPDATE users SET is_group_leader = FALSE WHERE group_id = $1 AND is_group_leader = TRUE`,
      [groupId]
    );
    await pool.query(
      `UPDATE users SET is_group_leader = TRUE WHERE id = $1 AND group_id = $2`,
      [userId, groupId]
    );
    const result = await pool.query(
      `UPDATE groups SET leader_id = $1 WHERE id = $2 RETURNING *`,
      [userId, groupId]
    );
    return result.rows[0];
  }

  // Снять старосту с группы
  static async clearLeader(groupId) {
    await pool.query(
      `UPDATE users SET is_group_leader = FALSE WHERE group_id = $1 AND is_group_leader = TRUE`,
      [groupId]
    );
    const result = await pool.query(
      `UPDATE groups SET leader_id = NULL WHERE id = $1 RETURNING *`,
      [groupId]
    );
    return result.rows[0];
  }

  // Получить студентов без группы
  static async getStudentsWithoutGroup() {
    try {
      const result = await pool.query(
        `SELECT 
          id, 
          username, 
          email, 
          full_name, 
          avatar_url,
          avatar_frame,
          profile_banner,
          username_style,
          points,
          created_at 
         FROM users 
         WHERE role = 'student' AND (group_id IS NULL OR group_id = 0)
         ORDER BY full_name, username`
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

export default Group;
