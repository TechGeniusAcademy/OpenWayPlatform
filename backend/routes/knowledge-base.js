import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireAdmin, requireTesterOrTeacherOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Получить все категории
router.get('/categories', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        COUNT(a.id) as articles_count
      FROM kb_categories c
      LEFT JOIN kb_articles a ON c.id = a.category_id AND a.deleted_at IS NULL
      WHERE c.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения категорий:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать категорию
router.post('/categories', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, icon, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Название обязательно' });
    }

    const result = await pool.query(
      `INSERT INTO kb_categories (name, icon, description) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [name, icon || '📚', description]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания категории:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить категорию
router.put('/categories/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, description } = req.body;

    const result = await pool.query(
      `UPDATE kb_categories 
       SET name = $1, icon = $2, description = $3, updated_at = NOW()
       WHERE id = $4 AND deleted_at IS NULL
       RETURNING *`,
      [name, icon, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка обновления категории:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить категорию (soft delete)
router.delete('/categories/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Мягкое удаление категории и всех её статей
    await pool.query('BEGIN');
    
    await pool.query(
      'UPDATE kb_articles SET deleted_at = NOW() WHERE category_id = $1',
      [id]
    );
    
    const result = await pool.query(
      'UPDATE kb_categories SET deleted_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    await pool.query('COMMIT');

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    res.json({ message: 'Категория удалена' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Ошибка удаления категории:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============= ПОДКАТЕГОРИИ =============

// Получить все подкатегории
router.get('/subcategories', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.*,
        c.name as category_name,
        COUNT(a.id) as articles_count
      FROM kb_subcategories s
      JOIN kb_categories c ON s.category_id = c.id
      LEFT JOIN kb_articles a ON s.id = a.subcategory_id AND a.deleted_at IS NULL
      WHERE s.deleted_at IS NULL AND c.deleted_at IS NULL
      GROUP BY s.id, c.name
      ORDER BY s.order_index ASC, s.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения подкатегорий:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить подкатегории по ID категории
router.get('/categories/:categoryId/subcategories', async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        s.*,
        COUNT(a.id) as articles_count
      FROM kb_subcategories s
      LEFT JOIN kb_articles a ON s.id = a.subcategory_id AND a.deleted_at IS NULL AND a.published = true
      WHERE s.category_id = $1 AND s.deleted_at IS NULL
      GROUP BY s.id
      ORDER BY s.order_index ASC, s.created_at DESC
    `, [categoryId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения подкатегорий:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать подкатегорию
router.post('/subcategories', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, category_id, icon, description, order_index } = req.body;

    if (!name || !category_id) {
      return res.status(400).json({ error: 'Название и категория обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO kb_subcategories (name, category_id, icon, description, order_index) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [name, category_id, icon || '📄', description, order_index || 0]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания подкатегории:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить подкатегорию
router.put('/subcategories/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category_id, icon, description, order_index } = req.body;

    const result = await pool.query(
      `UPDATE kb_subcategories 
       SET name = $1, category_id = $2, icon = $3, description = $4, order_index = $5, updated_at = NOW()
       WHERE id = $6 AND deleted_at IS NULL
       RETURNING *`,
      [name, category_id, icon, description, order_index, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Подкатегория не найдена' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка обновления подкатегории:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить подкатегорию (soft delete)
router.delete('/subcategories/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Мягкое удаление подкатегории и всех её статей
    await pool.query('BEGIN');
    
    await pool.query(
      'UPDATE kb_articles SET deleted_at = NOW() WHERE subcategory_id = $1',
      [id]
    );
    
    const result = await pool.query(
      'UPDATE kb_subcategories SET deleted_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    await pool.query('COMMIT');

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Подкатегория не найдена' });
    }

    res.json({ message: 'Подкатегория удалена' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Ошибка удаления подкатегории:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============= СТАТЬИ =============

// Получить все статьи (админ, тестер, CSS редактор)
router.get('/articles', authenticate, requireTesterOrTeacherOrAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.*,
        c.name as category_name,
        c.icon as category_icon,
        s.name as subcategory_name,
        s.icon as subcategory_icon
      FROM kb_articles a
      JOIN kb_categories c ON a.category_id = c.id
      LEFT JOIN kb_subcategories s ON a.subcategory_id = s.id
      WHERE a.deleted_at IS NULL AND c.deleted_at IS NULL
      ORDER BY a.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения статей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить опубликованные статьи (для учеников)
router.get('/articles/published', async (req, res) => {
  try {
    const { category_id, subcategory_id, search } = req.query;
    
    let query = `
      SELECT 
        a.id, a.title, a.category_id, a.subcategory_id, a.description, a.views, a.created_at,
        c.name as category_name,
        c.icon as category_icon,
        s.name as subcategory_name,
        s.icon as subcategory_icon
      FROM kb_articles a
      JOIN kb_categories c ON a.category_id = c.id
      LEFT JOIN kb_subcategories s ON a.subcategory_id = s.id
      WHERE a.published = true 
        AND a.deleted_at IS NULL 
        AND c.deleted_at IS NULL
    `;
    
    const params = [];
    
    if (category_id) {
      params.push(category_id);
      query += ` AND a.category_id = $${params.length}`;
    }
    
    if (subcategory_id) {
      params.push(subcategory_id);
      query += ` AND a.subcategory_id = $${params.length}`;
    }
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (a.title ILIKE $${params.length} OR a.description ILIKE $${params.length})`;
    }
    
    query += ' ORDER BY a.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения статей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить статью по ID (с увеличением просмотров)
router.get('/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Увеличить счетчик просмотров
    await pool.query(
      'UPDATE kb_articles SET views = views + 1 WHERE id = $1',
      [id]
    );

    const result = await pool.query(`
      SELECT 
        a.*,
        c.name as category_name,
        c.icon as category_icon
      FROM kb_articles a
      JOIN kb_categories c ON a.category_id = c.id
      WHERE a.id = $1 AND a.published = true 
        AND a.deleted_at IS NULL 
        AND c.deleted_at IS NULL
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Статья не найдена' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка получения статьи:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать статью
router.post('/articles', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, category_id, subcategory_id, description, content, published } = req.body;

    if (!title || !category_id || !content) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    const result = await pool.query(
      `INSERT INTO kb_articles (title, category_id, subcategory_id, description, content, published) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [title, category_id, subcategory_id || null, description, content, published !== false]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания статьи:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить статью
router.put('/articles/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category_id, subcategory_id, description, content, published } = req.body;

    const result = await pool.query(
      `UPDATE kb_articles 
       SET title = $1, category_id = $2, subcategory_id = $3, description = $4, 
           content = $5, published = $6, updated_at = NOW()
       WHERE id = $7 AND deleted_at IS NULL
       RETURNING *`,
      [title, category_id, subcategory_id || null, description, content, published, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Статья не найдена' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка обновления статьи:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить статью (soft delete)
router.delete('/articles/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE kb_articles SET deleted_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Статья не найдена' });
    }

    res.json({ message: 'Статья удалена' });
  } catch (error) {
    console.error('Ошибка удаления статьи:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
