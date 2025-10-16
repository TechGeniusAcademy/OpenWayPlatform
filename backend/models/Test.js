import pool from '../config/database.js';

class Test {
  // Получить все тесты
  static async getAll() {
    const result = await pool.query(`
      SELECT t.*, u.full_name as creator_name,
        (SELECT COUNT(*) FROM test_questions WHERE test_id = t.id) as questions_count
      FROM tests t
      LEFT JOIN users u ON t.created_by = u.id
      ORDER BY t.created_at DESC
    `);
    return result.rows;
  }

  // Получить тест по ID с вопросами и вариантами ответов
  static async getById(id) {
    const testResult = await pool.query(
      'SELECT * FROM tests WHERE id = $1',
      [id]
    );

    if (testResult.rows.length === 0) {
      return null;
    }

    const test = testResult.rows[0];

    // Получаем вопросы
    const questionsResult = await pool.query(
      'SELECT * FROM test_questions WHERE test_id = $1 ORDER BY question_order',
      [id]
    );

    // Для каждого вопроса получаем варианты ответов
    for (let question of questionsResult.rows) {
      const optionsResult = await pool.query(
        'SELECT * FROM test_question_options WHERE question_id = $1 ORDER BY option_order',
        [question.id]
      );
      question.options = optionsResult.rows;
    }

    test.questions = questionsResult.rows;
    return test;
  }

  // Создать тест
  static async create(testData, questions) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Создаем тест
      const testResult = await client.query(
        `INSERT INTO tests (title, description, type, time_limit, points_correct, points_wrong, can_retry, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          testData.title,
          testData.description,
          testData.type,
          testData.time_limit || 0,
          testData.points_correct || 1,
          testData.points_wrong || 0,
          testData.can_retry || false,
          testData.created_by
        ]
      );

      const test = testResult.rows[0];

      // Создаем вопросы
      if (questions && questions.length > 0) {
        for (let i = 0; i < questions.length; i++) {
          const question = questions[i];
          const questionResult = await client.query(
            `INSERT INTO test_questions (test_id, question_text, question_type, question_order, code_template, code_solution, code_language)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
              test.id,
              question.question_text,
              question.question_type,
              i,
              question.code_template || null,
              question.code_solution || null,
              question.code_language || null
            ]
          );

          const questionId = questionResult.rows[0].id;

          // Создаем варианты ответов (если есть)
          if (question.options && question.options.length > 0) {
            for (let j = 0; j < question.options.length; j++) {
              const option = question.options[j];
              await client.query(
                `INSERT INTO test_question_options (question_id, option_text, is_correct, option_order)
                 VALUES ($1, $2, $3, $4)`,
                [questionId, option.option_text, option.is_correct || false, j]
              );
            }
          }
        }
      }

      await client.query('COMMIT');
      return test;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Обновить тест
  static async update(id, testData, questions) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Обновляем тест
      const result = await client.query(
        `UPDATE tests 
         SET title = $1, description = $2, type = $3, time_limit = $4, 
             points_correct = $5, points_wrong = $6, can_retry = $7, updated_at = NOW()
         WHERE id = $8
         RETURNING *`,
        [
          testData.title,
          testData.description,
          testData.type,
          testData.time_limit,
          testData.points_correct,
          testData.points_wrong,
          testData.can_retry,
          id
        ]
      );

      // Удаляем старые вопросы (каскадно удалятся и варианты ответов)
      await client.query('DELETE FROM test_questions WHERE test_id = $1', [id]);

      // Создаем новые вопросы
      if (questions && questions.length > 0) {
        for (let i = 0; i < questions.length; i++) {
          const question = questions[i];
          const questionResult = await client.query(
            `INSERT INTO test_questions (test_id, question_text, question_type, question_order, code_template, code_solution, code_language)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
              id,
              question.question_text,
              question.question_type,
              i,
              question.code_template || null,
              question.code_solution || null,
              question.code_language || null
            ]
          );

          const questionId = questionResult.rows[0].id;

          // Создаем варианты ответов
          if (question.options && question.options.length > 0) {
            for (let j = 0; j < question.options.length; j++) {
              const option = question.options[j];
              await client.query(
                `INSERT INTO test_question_options (question_id, option_text, is_correct, option_order)
                 VALUES ($1, $2, $3, $4)`,
                [questionId, option.option_text, option.is_correct || false, j]
              );
            }
          }
        }
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Удалить тест
  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM tests WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  // Назначить тест группе
  static async assignToGroup(testId, groupId, assignedBy) {
    const result = await pool.query(
      `INSERT INTO test_assignments (test_id, group_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (test_id, group_id) DO NOTHING
       RETURNING *`,
      [testId, groupId, assignedBy]
    );
    return result.rows[0];
  }

  // Отменить назначение теста группе
  static async unassignFromGroup(testId, groupId) {
    const result = await pool.query(
      'DELETE FROM test_assignments WHERE test_id = $1 AND group_id = $2 RETURNING *',
      [testId, groupId]
    );
    return result.rows[0];
  }

  // Получить назначения теста
  static async getAssignments(testId) {
    const result = await pool.query(
      `SELECT ta.*, g.name as group_name, u.full_name as assigned_by_name
       FROM test_assignments ta
       JOIN groups g ON ta.group_id = g.id
       LEFT JOIN users u ON ta.assigned_by = u.id
       WHERE ta.test_id = $1`,
      [testId]
    );
    return result.rows;
  }

  // Получить тесты, назначенные студенту (через его группу)
  static async getAssignedToStudent(userId) {
    const result = await pool.query(
      `SELECT t.*, ta.assigned_at,
        (SELECT COUNT(*) FROM test_attempts WHERE test_id = t.id AND user_id = $1 AND status = 'completed') as attempts_count,
        (SELECT status FROM test_attempts WHERE test_id = t.id AND user_id = $1 ORDER BY started_at DESC LIMIT 1) as last_attempt_status
       FROM tests t
       JOIN test_assignments ta ON t.id = ta.test_id
       JOIN users u ON u.group_id = ta.group_id
       WHERE u.id = $1
       ORDER BY ta.assigned_at DESC`,
      [userId]
    );
    return result.rows;
  }
}

export default Test;
