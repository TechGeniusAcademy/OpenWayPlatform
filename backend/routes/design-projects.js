import express from 'express';
import { authenticate } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();

// Получить все дизайн-проекты пользователя
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, elements, canvas_size, created_at, updated_at FROM design_projects WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.user.id]
    );
    
    res.json(result.rows.map(row => ({
      id: row.id,
      name: row.name,
      elements: row.elements,
      canvasSize: row.canvas_size,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })));
  } catch (error) {
    console.error('Error fetching design projects:', error);
    res.status(500).json({ message: 'Ошибка при загрузке проектов' });
  }
});

// Получить один дизайн-проект
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, elements, canvas_size, created_at, updated_at FROM design_projects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Проект не найден' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      elements: row.elements,
      canvasSize: row.canvas_size,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  } catch (error) {
    console.error('Error fetching design project:', error);
    res.status(500).json({ message: 'Ошибка при загрузке проекта' });
  }
});

// Создать новый дизайн-проект
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, elements, canvasSize } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Название проекта обязательно' });
    }

    const result = await pool.query(
      'INSERT INTO design_projects (user_id, name, elements, canvas_size) VALUES ($1, $2, $3, $4) RETURNING id, name, elements, canvas_size, created_at, updated_at',
      [req.user.id, name, JSON.stringify(elements || []), JSON.stringify(canvasSize || { width: 1920, height: 1080 })]
    );

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      name: row.name,
      elements: row.elements,
      canvasSize: row.canvas_size,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  } catch (error) {
    console.error('Error creating design project:', error);
    res.status(500).json({ message: 'Ошибка при создании проекта' });
  }
});

// Обновить дизайн-проект
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, elements, canvasSize } = req.body;

    const result = await pool.query(
      'UPDATE design_projects SET name = COALESCE($1, name), elements = COALESCE($2, elements), canvas_size = COALESCE($3, canvas_size), updated_at = NOW() WHERE id = $4 AND user_id = $5 RETURNING id, name, elements, canvas_size, created_at, updated_at',
      [
        name || null,
        elements ? JSON.stringify(elements) : null,
        canvasSize ? JSON.stringify(canvasSize) : null,
        req.params.id,
        req.user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Проект не найден' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      elements: row.elements,
      canvasSize: row.canvas_size,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  } catch (error) {
    console.error('Error updating design project:', error);
    res.status(500).json({ message: 'Ошибка при обновлении проекта' });
  }
});

// Удалить дизайн-проект
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM design_projects WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Проект не найден' });
    }

    res.json({ message: 'Проект успешно удален' });
  } catch (error) {
    console.error('Error deleting design project:', error);
    res.status(500).json({ message: 'Ошибка при удалении проекта' });
  }
});

// Сохранить workspace (текущее состояние работы)
router.post('/workspace', authenticate, async (req, res) => {
  try {
    const { elements, canvasSize, currentProjectId } = req.body;

    await pool.query(
      `INSERT INTO design_workspaces (user_id, elements, canvas_size, current_project_id) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (user_id) 
       DO UPDATE SET elements = $2, canvas_size = $3, current_project_id = $4, updated_at = NOW()`,
      [
        req.user.id,
        JSON.stringify(elements || []),
        JSON.stringify(canvasSize || { width: 1920, height: 1080 }),
        currentProjectId || null
      ]
    );

    res.json({ message: 'Workspace сохранен' });
  } catch (error) {
    console.error('Error saving workspace:', error);
    res.status(500).json({ message: 'Ошибка при сохранении workspace' });
  }
});

// Загрузить workspace
router.get('/workspace/current', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT elements, canvas_size, current_project_id, updated_at FROM design_workspaces WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    const row = result.rows[0];
    res.json({
      elements: row.elements,
      canvasSize: row.canvas_size,
      currentProjectId: row.current_project_id,
      updatedAt: row.updated_at
    });
  } catch (error) {
    console.error('Error fetching workspace:', error);
    res.status(500).json({ message: 'Ошибка при загрузке workspace' });
  }
});

export default router;
