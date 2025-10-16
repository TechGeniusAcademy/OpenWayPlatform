import pool from '../config/database.js';

class TestAttempt {
  // Начать попытку прохождения теста
  static async start(testId, userId) {
    const result = await pool.query(
      `INSERT INTO test_attempts (test_id, user_id, started_at, status)
       VALUES ($1, $2, NOW(), 'in_progress')
       RETURNING *`,
      [testId, userId]
    );
    return result.rows[0];
  }

  // Получить активную попытку пользователя
  static async getActive(testId, userId) {
    const result = await pool.query(
      `SELECT * FROM test_attempts 
       WHERE test_id = $1 AND user_id = $2 AND status = 'in_progress'
       ORDER BY started_at DESC
       LIMIT 1`,
      [testId, userId]
    );
    return result.rows[0];
  }

  // Сохранить ответ на вопрос
  static async saveAnswer(attemptId, questionId, answerData) {
    // Проверяем, нет ли уже ответа на этот вопрос
    const existing = await pool.query(
      'SELECT id FROM test_answers WHERE attempt_id = $1 AND question_id = $2',
      [attemptId, questionId]
    );

    if (existing.rows.length > 0) {
      // Обновляем существующий ответ
      const result = await pool.query(
        `UPDATE test_answers 
         SET answer_text = $1, selected_option_id = $2, code_answer = $3, is_correct = $4, answered_at = NOW()
         WHERE attempt_id = $5 AND question_id = $6
         RETURNING *`,
        [
          answerData.answer_text || null,
          answerData.selected_option_id || null,
          answerData.code_answer || null,
          answerData.is_correct || null,
          attemptId,
          questionId
        ]
      );
      return result.rows[0];
    } else {
      // Создаем новый ответ
      const result = await pool.query(
        `INSERT INTO test_answers (attempt_id, question_id, answer_text, selected_option_id, code_answer, is_correct)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          attemptId,
          questionId,
          answerData.answer_text || null,
          answerData.selected_option_id || null,
          answerData.code_answer || null,
          answerData.is_correct || null
        ]
      );
      return result.rows[0];
    }
  }

  // Завершить попытку
  static async complete(attemptId, score, pointsEarned, timeSpent) {
    const result = await pool.query(
      `UPDATE test_attempts 
       SET completed_at = NOW(), score = $1, points_earned = $2, time_spent = $3, status = 'completed'
       WHERE id = $4
       RETURNING *`,
      [score, pointsEarned, timeSpent, attemptId]
    );

    // Обновляем баллы пользователя
    if (result.rows.length > 0) {
      const attempt = result.rows[0];
      await pool.query(
        'UPDATE users SET points = COALESCE(points, 0) + $1 WHERE id = $2',
        [pointsEarned, attempt.user_id]
      );
    }

    return result.rows[0];
  }

  // Получить историю попыток пользователя
  static async getUserHistory(userId) {
    const result = await pool.query(
      `SELECT ta.*, t.title, t.type, t.points_correct
       FROM test_attempts ta
       JOIN tests t ON ta.test_id = t.id
       WHERE ta.user_id = $1
       ORDER BY ta.started_at DESC`,
      [userId]
    );
    return result.rows;
  }

  // Получить историю попыток по тесту
  static async getTestHistory(testId) {
    const result = await pool.query(
      `SELECT ta.*, u.full_name, u.username
       FROM test_attempts ta
       JOIN users u ON ta.user_id = u.id
       WHERE ta.test_id = $1
       ORDER BY ta.started_at DESC`,
      [testId]
    );
    return result.rows;
  }

  // Получить детали попытки с ответами
  static async getDetails(attemptId) {
    const attemptResult = await pool.query(
      `SELECT ta.*, t.title, t.type, u.full_name, u.username
       FROM test_attempts ta
       JOIN tests t ON ta.test_id = t.id
       JOIN users u ON ta.user_id = u.id
       WHERE ta.id = $1`,
      [attemptId]
    );

    if (attemptResult.rows.length === 0) {
      return null;
    }

    const attempt = attemptResult.rows[0];

    // Получаем ответы
    const answersResult = await pool.query(
      `SELECT a.*, q.question_text, q.question_type, o.option_text
       FROM test_answers a
       JOIN test_questions q ON a.question_id = q.id
       LEFT JOIN test_question_options o ON a.selected_option_id = o.id
       WHERE a.attempt_id = $1`,
      [attemptId]
    );

    attempt.answers = answersResult.rows;
    return attempt;
  }

  // Переназначить тест ученику (сбросить попытки)
  static async reassign(testId, userId) {
    // Помечаем все старые попытки как expired
    await pool.query(
      `UPDATE test_attempts 
       SET status = 'expired'
       WHERE test_id = $1 AND user_id = $2 AND status != 'expired'`,
      [testId, userId]
    );
    
    return { success: true };
  }
}

export default TestAttempt;
