import express from 'express';
import { authenticate } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();

// Отправить проект на проверку
router.post('/', authenticate, async (req, res) => {
  try {
    const { project_id, project_name, type, homework_id } = req.body;

    if (!project_id || !project_name || !type) {
      return res.status(400).json({ message: 'Недостаточно данных' });
    }

    if (type === 'homework' && !homework_id) {
      return res.status(400).json({ message: 'Выберите домашнее задание' });
    }

    // Получаем данные проекта
    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [project_id, req.user.id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Проект не найден' });
    }

    const project = projectResult.rows[0];

    // Создаем запись о submission
    const result = await pool.query(
      `INSERT INTO project_submissions 
       (user_id, project_id, project_name, project_data, type, homework_id, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        req.user.id,
        project_id,
        project_name,
        JSON.stringify(project.file_system),
        type,
        homework_id,
        'pending'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating submission:', error);
    res.status(500).json({ message: 'Ошибка при отправке проекта' });
  }
});

// Получить все submissions (для админа)
router.get('/all', authenticate, async (req, res) => {
  try {
    // Проверяем что пользователь - администратор
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const result = await pool.query(
      `SELECT s.*, u.username, u.email, h.title as homework_title
       FROM project_submissions s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN homeworks h ON s.homework_id = h.id
       ORDER BY s.submitted_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ message: 'Ошибка при загрузке submissions' });
  }
});

// Получить мои submissions
router.get('/my', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, h.title as homework_title
       FROM project_submissions s
       LEFT JOIN homeworks h ON s.homework_id = h.id
       WHERE s.user_id = $1
       ORDER BY s.submitted_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching my submissions:', error);
    res.status(500).json({ message: 'Ошибка при загрузке ваших submissions' });
  }
});

// Получить один submission
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.username, u.email, h.title as homework_title
       FROM project_submissions s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN homeworks h ON s.homework_id = h.id
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Submission не найден' });
    }

    const submission = result.rows[0];

    // Проверяем доступ (только админ/учитель или владелец)
    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'teacher' &&
      submission.user_id !== req.user.id
    ) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    res.json(submission);
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ message: 'Ошибка при загрузке submission' });
  }
});

// Обновить статус submission (для админа/учителя)
router.patch('/:id/status', authenticate, async (req, res) => {
  const client = await pool.connect();
  
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const { status, feedback, grade } = req.body;

    await client.query('BEGIN');

    // Получаем предыдущий статус для проверки
    const prevResult = await client.query(
      'SELECT status, grade FROM project_submissions WHERE id = $1',
      [req.params.id]
    );
    const previousStatus = prevResult.rows[0]?.status;
    const previousGrade = prevResult.rows[0]?.grade || 0;

    const result = await client.query(
      `UPDATE project_submissions
       SET status = COALESCE($1, status),
           feedback = COALESCE($2, feedback),
           grade = COALESCE($3, grade),
           reviewed_at = CURRENT_TIMESTAMP,
           reviewed_by = $4
       WHERE id = $5
       RETURNING *`,
      [status, feedback, grade, req.user.id, req.params.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Submission не найден' });
    }

    const submission = result.rows[0];

    // Начисляем баллы только если:
    // 1. Новый статус - approved
    // 2. Предыдущий статус НЕ был approved (чтобы не начислять повторно)
    // 3. Есть оценка для начисления
    if (status === 'approved' && previousStatus !== 'approved' && grade && grade > 0) {
      await client.query(
        'UPDATE users SET points = COALESCE(points, 0) + $1 WHERE id = $2',
        [grade, submission.user_id]
      );

      // Записываем в историю баллов
      await client.query(
        `INSERT INTO points_history (user_id, points_change, reason, admin_id)
         VALUES ($1, $2, $3, $4)`,
        [submission.user_id, grade, `Проверка проекта: ${submission.project_name}`, req.user.id]
      );
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating submission:', error);
    res.status(500).json({ message: 'Ошибка при обновлении submission' });
  } finally {
    client.release();
  }
});

export default router;
