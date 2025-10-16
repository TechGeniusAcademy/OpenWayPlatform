import pool from '../config/database.js';

class Homework {
  // Получить все домашние задания
  static async getAll() {
    const result = await pool.query(`
      SELECT h.*, u.full_name as creator_name,
        (SELECT COUNT(*) FROM homework_assignments WHERE homework_id = h.id) as assigned_groups_count
      FROM homeworks h
      LEFT JOIN users u ON h.created_by = u.id
      ORDER BY h.created_at DESC
    `);
    return result.rows;
  }

  // Получить домашнее задание по ID
  static async getById(id) {
    const result = await pool.query(
      'SELECT * FROM homeworks WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  // Создать домашнее задание
  static async create(homeworkData) {
    const result = await pool.query(
      `INSERT INTO homeworks (title, description, points, deadline, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        homeworkData.title,
        homeworkData.description,
        homeworkData.points || 0,
        homeworkData.deadline || null,
        homeworkData.created_by
      ]
    );
    return result.rows[0];
  }

  // Обновить домашнее задание
  static async update(id, homeworkData) {
    const result = await pool.query(
      `UPDATE homeworks 
       SET title = $1, description = $2, points = $3, deadline = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        homeworkData.title,
        homeworkData.description,
        homeworkData.points,
        homeworkData.deadline,
        id
      ]
    );
    return result.rows[0];
  }

  // Удалить домашнее задание
  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM homeworks WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  // Закрыть/открыть домашнее задание вручную
  static async toggleClosed(id, isClosed) {
    const result = await pool.query(
      'UPDATE homeworks SET is_closed = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [isClosed, id]
    );
    return result.rows[0];
  }

  // Назначить домашнее задание группе
  static async assignToGroup(homeworkId, groupId, assignedBy) {
    const result = await pool.query(
      `INSERT INTO homework_assignments (homework_id, group_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (homework_id, group_id) DO NOTHING
       RETURNING *`,
      [homeworkId, groupId, assignedBy]
    );
    return result.rows[0];
  }

  // Отменить назначение домашнего задания группе
  static async unassignFromGroup(homeworkId, groupId) {
    const result = await pool.query(
      'DELETE FROM homework_assignments WHERE homework_id = $1 AND group_id = $2 RETURNING *',
      [homeworkId, groupId]
    );
    return result.rows[0];
  }

  // Получить назначения домашнего задания
  static async getAssignments(homeworkId) {
    const result = await pool.query(
      `SELECT ha.*, g.name as group_name, u.full_name as assigned_by_name
       FROM homework_assignments ha
       JOIN groups g ON ha.group_id = g.id
       LEFT JOIN users u ON ha.assigned_by = u.id
       WHERE ha.homework_id = $1`,
      [homeworkId]
    );
    return result.rows;
  }

  // Получить домашние задания, назначенные студенту (через его группу)
  static async getAssignedToStudent(userId) {
    const result = await pool.query(
      `SELECT h.*, ha.assigned_at,
        CASE 
          WHEN h.is_closed = true THEN 'closed'
          WHEN h.deadline IS NOT NULL AND h.deadline < NOW() THEN 'expired'
          ELSE 'active'
        END as status,
        (SELECT status FROM homework_submissions WHERE homework_id = h.id AND user_id = $1 ORDER BY submitted_at DESC LIMIT 1) as submission_status
       FROM homeworks h
       JOIN homework_assignments ha ON h.id = ha.homework_id
       JOIN users u ON u.group_id = ha.group_id
       WHERE u.id = $1
       ORDER BY h.deadline ASC NULLS LAST, h.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  // Получить сдачи домашнего задания
  static async getSubmissions(homeworkId) {
    const result = await pool.query(
      `SELECT hs.*, u.full_name, u.username, checker.full_name as checker_name
       FROM homework_submissions hs
       JOIN users u ON hs.user_id = u.id
       LEFT JOIN users checker ON hs.checked_by = checker.id
       WHERE hs.homework_id = $1
       ORDER BY hs.submitted_at DESC`,
      [homeworkId]
    );
    return result.rows;
  }
}

export default Homework;
