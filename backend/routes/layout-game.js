import express from 'express';
import pool from '../config/database.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware для проверки авторизации
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Токен не предоставлен' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // JWT содержит userId, а не id
    req.user = { ...decoded, id: decoded.userId };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Недействительный токен' });
  }
};

// Middleware для проверки роли админа
const adminAuth = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }
  next();
};

// ==================== ADMIN ROUTES ====================

// Получить все уровни (для админа)
router.get('/admin/levels', auth, adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*, u.full_name as creator_name
      FROM layout_game_levels l
      LEFT JOIN users u ON l.created_by = u.id
      ORDER BY l.order_index ASC, l.id ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения уровней:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать новый уровень
router.post('/admin/levels', auth, adminAuth, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      difficulty, 
      order_index, 
      points_reward,
      target_html,
      target_css,
      canvas_width,
      canvas_height
    } = req.body;
    
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Название уровня обязательно' });
    }
    
    if (!target_html?.trim()) {
      return res.status(400).json({ error: 'HTML макета обязателен' });
    }
    
    const result = await pool.query(`
      INSERT INTO layout_game_levels 
        (title, description, difficulty, order_index, points_reward, target_html, target_css, canvas_width, canvas_height, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      title, 
      description || '', 
      difficulty || 1, 
      order_index || 0, 
      points_reward || 10, 
      target_html,
      target_css || '',
      canvas_width || 800,
      canvas_height || 600,
      req.user.id
    ]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания уровня:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить уровень
router.put('/admin/levels/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      difficulty, 
      order_index, 
      points_reward, 
      is_active,
      target_html,
      target_css,
      canvas_width,
      canvas_height
    } = req.body;
    
    const result = await pool.query(`
      UPDATE layout_game_levels
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          difficulty = COALESCE($3, difficulty),
          order_index = COALESCE($4, order_index),
          points_reward = COALESCE($5, points_reward),
          is_active = COALESCE($6, is_active),
          target_html = COALESCE($7, target_html),
          target_css = COALESCE($8, target_css),
          canvas_width = COALESCE($9, canvas_width),
          canvas_height = COALESCE($10, canvas_height),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [title, description, difficulty, order_index, points_reward, is_active, target_html, target_css, canvas_width, canvas_height, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Уровень не найден' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка обновления уровня:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить уровень
router.delete('/admin/levels/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM layout_game_levels WHERE id = $1', [id]);
    res.json({ message: 'Уровень удален' });
  } catch (error) {
    console.error('Ошибка удаления уровня:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ==================== STUDENT ROUTES ====================

// Получить все активные уровни с прогрессом пользователя
router.get('/levels', auth, async (req, res) => {
  try {
    console.log('Loading levels for user:', req.user.id);
    
    const result = await pool.query(`
      SELECT 
        l.id, l.title, l.description, l.difficulty, l.order_index, 
        l.points_reward, l.canvas_width, l.canvas_height, l.is_active,
        COALESCE(p.completed, false) as completed,
        COALESCE(p.best_accuracy, 0) as best_accuracy,
        COALESCE(p.attempts, 0) as attempts
      FROM layout_game_levels l
      LEFT JOIN layout_game_progress p ON l.id = p.level_id AND p.user_id = $1
      WHERE l.is_active = true
      ORDER BY l.order_index ASC, l.id ASC
    `, [req.user.id]);
    
    console.log('Levels with progress:', result.rows.map(r => ({ id: r.id, title: r.title, completed: r.completed, attempts: r.attempts })));
    
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения уровней:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить конкретный уровень с полными данными для игры
router.get('/levels/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        l.*,
        COALESCE(p.completed, false) as completed,
        COALESCE(p.best_accuracy, 0) as best_accuracy,
        COALESCE(p.attempts, 0) as attempts
      FROM layout_game_levels l
      LEFT JOIN layout_game_progress p ON l.id = p.level_id AND p.user_id = $1
      WHERE l.id = $2 AND l.is_active = true
    `, [req.user.id, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Уровень не найден' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка получения уровня:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Проверить верстку и сохранить результат
router.post('/levels/:id/check', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { accuracy } = req.body;
    
    console.log(`Check level ${id} for user ${req.user.id}, accuracy: ${accuracy}`);
    
    if (accuracy === undefined || accuracy < 0 || accuracy > 100) {
      return res.status(400).json({ error: 'Неверное значение accuracy' });
    }
    
    // Получить уровень
    const levelResult = await pool.query('SELECT * FROM layout_game_levels WHERE id = $1', [id]);
    if (levelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Уровень не найден' });
    }
    const level = levelResult.rows[0];
    
    // Проверить существующий прогресс
    const existingProgress = await pool.query(
      'SELECT * FROM layout_game_progress WHERE user_id = $1 AND level_id = $2',
      [req.user.id, id]
    );
    
    console.log('Existing progress:', existingProgress.rows[0] || 'none');
    
    const isCompleted = accuracy >= 95;
    let pointsAwarded = 0;
    let isNewCompletion = false;
    
    console.log('isCompleted (accuracy >= 95):', isCompleted);
    
    if (existingProgress.rows.length > 0) {
      const progress = existingProgress.rows[0];
      const newBestAccuracy = Math.max(progress.best_accuracy, accuracy);
      
      if (isCompleted && !progress.completed) {
        pointsAwarded = level.points_reward;
        isNewCompletion = true;
        
        await pool.query(
          'UPDATE users SET points = points + $1 WHERE id = $2',
          [pointsAwarded, req.user.id]
        );
      }
      
      await pool.query(`
        UPDATE layout_game_progress
        SET completed = $1,
            best_accuracy = $2,
            attempts = attempts + 1,
            completed_at = CASE WHEN $1 AND completed_at IS NULL THEN CURRENT_TIMESTAMP ELSE completed_at END,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $3 AND level_id = $4
      `, [isCompleted || progress.completed, newBestAccuracy, req.user.id, id]);
      
      console.log('Updated existing progress, completed:', isCompleted || progress.completed);
    } else {
      if (isCompleted) {
        pointsAwarded = level.points_reward;
        isNewCompletion = true;
        
        await pool.query(
          'UPDATE users SET points = points + $1 WHERE id = $2',
          [pointsAwarded, req.user.id]
        );
      }
      
      console.log('Inserting new progress for user_id:', req.user.id, 'level_id:', id);
      
      const insertResult = await pool.query(`
        INSERT INTO layout_game_progress (user_id, level_id, completed, best_accuracy, attempts, completed_at)
        VALUES ($1, $2, $3, $4, 1, $5)
        RETURNING *
      `, [req.user.id, id, isCompleted, accuracy, isCompleted ? new Date() : null]);
      
      console.log('Inserted new progress:', insertResult.rows[0]);
    }
    
    // Проверяем что данные реально сохранились
    const verifyProgress = await pool.query(
      'SELECT * FROM layout_game_progress WHERE user_id = $1 AND level_id = $2',
      [req.user.id, id]
    );
    console.log('Verified progress in DB:', verifyProgress.rows[0]);
    
    const responseData = {
      success: true,
      accuracy,
      completed: isCompleted,
      pointsAwarded,
      isNewCompletion,
      message: isCompleted 
        ? `Отлично! Уровень пройден с точностью ${accuracy.toFixed(1)}%` 
        : `Точность ${accuracy.toFixed(1)}%. Нужно минимум 95% для прохождения.`
    };
    
    console.log('Sending response:', responseData);
    
    res.json(responseData);
  } catch (error) {
    console.error('Ошибка проверки верстки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить статистику пользователя
router.get('/stats', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT l.id) as total_levels,
        COUNT(DISTINCT CASE WHEN p.completed THEN l.id END) as completed_levels,
        COALESCE(AVG(p.best_accuracy), 0) as average_accuracy,
        COALESCE(SUM(p.attempts), 0) as total_attempts
      FROM layout_game_levels l
      LEFT JOIN layout_game_progress p ON l.id = p.level_id AND p.user_id = $1
      WHERE l.is_active = true
    `, [req.user.id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
