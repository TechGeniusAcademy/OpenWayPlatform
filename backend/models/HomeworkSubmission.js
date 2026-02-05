import pool from '../config/database.js';

class HomeworkSubmission {
  // Сдать домашнее задание с файлами
  static async submit(homeworkId, userId, submissionText, attachments = []) {
    // Проверяем, есть ли уже сдача от этого пользователя
    const existing = await pool.query(
      'SELECT id FROM homework_submissions WHERE homework_id = $1 AND user_id = $2',
      [homeworkId, userId]
    );

    if (existing.rows.length > 0) {
      // Обновляем существующую сдачу
      const result = await pool.query(
        `UPDATE homework_submissions 
         SET submission_text = $1, attachments = $2, submitted_at = NOW(), status = 'pending'
         WHERE homework_id = $3 AND user_id = $4
         RETURNING *`,
        [submissionText, JSON.stringify(attachments), homeworkId, userId]
      );
      return result.rows[0];
    } else {
      // Создаём новую сдачу
      const result = await pool.query(
        `INSERT INTO homework_submissions (homework_id, user_id, submission_text, attachments, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING *`,
        [homeworkId, userId, submissionText, JSON.stringify(attachments)]
      );
      return result.rows[0];
    }
  }

  // Получить сдачу студента
  static async getByUserAndHomework(userId, homeworkId) {
    const result = await pool.query(
      `SELECT * FROM homework_submissions 
       WHERE homework_id = $1 AND user_id = $2 
       ORDER BY submitted_at DESC 
       LIMIT 1`,
      [homeworkId, userId]
    );
    return result.rows[0];
  }

  // Принять/отклонить домашнее задание
  static async check(submissionId, status, checkedBy, reason, pointsEarned) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Получаем предыдущий статус для проверки
      const prevResult = await client.query(
        'SELECT status, points_earned FROM homework_submissions WHERE id = $1',
        [submissionId]
      );
      const previousStatus = prevResult.rows[0]?.status;
      const previousPoints = prevResult.rows[0]?.points_earned || 0;

      // Обновляем статус сдачи
      const result = await client.query(
        `UPDATE homework_submissions 
         SET status = $1, checked_by = $2, checked_at = NOW(), reason = $3, points_earned = $4
         WHERE id = $5
         RETURNING *`,
        [status, checkedBy, reason, pointsEarned || 0, submissionId]
      );

      const submission = result.rows[0];

      // Начисляем баллы только если:
      // 1. Новый статус - accepted
      // 2. Предыдущий статус НЕ был accepted (чтобы не начислять повторно)
      // 3. Есть баллы для начисления
      if (status === 'accepted' && previousStatus !== 'accepted' && pointsEarned > 0) {
        await client.query(
          'UPDATE users SET points = COALESCE(points, 0) + $1 WHERE id = $2',
          [pointsEarned, submission.user_id]
        );

        // Получаем информацию о домашке для записи в историю
        const homeworkInfo = await client.query(
          'SELECT title FROM homeworks WHERE id = (SELECT homework_id FROM homework_submissions WHERE id = $1)',
          [submissionId]
        );
        const homeworkTitle = homeworkInfo.rows[0]?.title || 'Домашнее задание';

        // Записываем в историю баллов
        await client.query(
          `INSERT INTO points_history (user_id, points_change, reason, admin_id)
           VALUES ($1, $2, $3, $4)`,
          [submission.user_id, pointsEarned, `Проверка ДЗ: ${homeworkTitle}`, checkedBy]
        );
      }

      await client.query('COMMIT');
      return submission;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Получить историю сдач студента
  static async getUserHistory(userId) {
    const result = await pool.query(
      `SELECT hs.*, h.title, h.points as max_points
       FROM homework_submissions hs
       JOIN homeworks h ON hs.homework_id = h.id
       WHERE hs.user_id = $1
       ORDER BY hs.submitted_at DESC`,
      [userId]
    );
    return result.rows;
  }

  // Получить детали сдачи
  static async getDetails(submissionId) {
    const result = await pool.query(
      `SELECT hs.*, h.title, h.description, h.points as max_points, 
              u.full_name, u.username,
              checker.full_name as checker_name
       FROM homework_submissions hs
       JOIN homeworks h ON hs.homework_id = h.id
       JOIN users u ON hs.user_id = u.id
       LEFT JOIN users checker ON hs.checked_by = checker.id
       WHERE hs.id = $1`,
      [submissionId]
    );
    return result.rows[0];
  }
}

export default HomeworkSubmission;
