import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Получить все ТЗ текущего пользователя
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM technical_specs 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    
    res.json({ specs: result.rows });
  } catch (error) {
    console.error('Ошибка получения ТЗ:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить конкретное ТЗ
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM technical_specs 
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ТЗ не найдено' });
    }
    
    res.json({ spec: result.rows[0] });
  } catch (error) {
    console.error('Ошибка получения ТЗ:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать новое ТЗ
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      title,
      project_type,
      description,
      goals,
      target_audience,
      functional_requirements,
      technical_requirements,
      design_requirements,
      deadline,
      budget,
      additional_info
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Название проекта обязательно' });
    }

    const result = await pool.query(
      `INSERT INTO technical_specs (
        user_id, title, project_type, description, goals, target_audience,
        functional_requirements, technical_requirements, design_requirements,
        deadline, budget, additional_info
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        req.user.id,
        title.trim(),
        project_type || 'web',
        description,
        goals,
        target_audience,
        functional_requirements,
        technical_requirements,
        design_requirements,
        deadline,
        budget,
        additional_info
      ]
    );

    res.status(201).json({ spec: result.rows[0] });
  } catch (error) {
    console.error('Ошибка создания ТЗ:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить ТЗ
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      title,
      project_type,
      description,
      goals,
      target_audience,
      functional_requirements,
      technical_requirements,
      design_requirements,
      deadline,
      budget,
      additional_info
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Название проекта обязательно' });
    }

    const result = await pool.query(
      `UPDATE technical_specs 
       SET title = $1, project_type = $2, description = $3, goals = $4,
           target_audience = $5, functional_requirements = $6,
           technical_requirements = $7, design_requirements = $8,
           deadline = $9, budget = $10, additional_info = $11,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12 AND user_id = $13
       RETURNING *`,
      [
        title.trim(),
        project_type,
        description,
        goals,
        target_audience,
        functional_requirements,
        technical_requirements,
        design_requirements,
        deadline,
        budget,
        additional_info,
        req.params.id,
        req.user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ТЗ не найдено' });
    }

    res.json({ spec: result.rows[0] });
  } catch (error) {
    console.error('Ошибка обновления ТЗ:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить ТЗ
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM technical_specs 
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ТЗ не найдено' });
    }

    res.json({ message: 'ТЗ успешно удалено' });
  } catch (error) {
    console.error('Ошибка удаления ТЗ:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
