import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Получить все уровни
router.get('/levels', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM flexchan_levels 
      ORDER BY level_order ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching flexchan levels:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить один уровень
router.get('/levels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM flexchan_levels WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Level not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching level:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Создать новый уровень (только админ)
router.post('/levels', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      initial_code,
      solution,
      items,
      targets,
      hint,
      points,
      level_order,
      difficulty
    } = req.body;
    
    const result = await pool.query(`
      INSERT INTO flexchan_levels 
      (title, description, initial_code, solution, items, targets, hint, points, level_order, difficulty)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      title,
      description,
      initial_code,
      JSON.stringify(solution),
      JSON.stringify(items),
      JSON.stringify(targets),
      hint,
      points || 10,
      level_order,
      difficulty || 'medium'
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating level:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Обновить уровень (только админ)
router.put('/levels/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      initial_code,
      solution,
      items,
      targets,
      hint,
      points,
      level_order,
      difficulty,
      is_active
    } = req.body;
    
    const result = await pool.query(`
      UPDATE flexchan_levels 
      SET title = $1, description = $2, initial_code = $3, solution = $4,
          items = $5, targets = $6, hint = $7, points = $8, 
          level_order = $9, difficulty = $10, is_active = $11,
          updated_at = NOW()
      WHERE id = $12
      RETURNING *
    `, [
      title,
      description,
      initial_code,
      JSON.stringify(solution),
      JSON.stringify(items),
      JSON.stringify(targets),
      hint,
      points,
      level_order,
      difficulty,
      is_active !== false,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Level not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating level:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Удалить уровень (только админ)
router.delete('/levels/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM flexchan_levels WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Level not found' });
    }
    
    res.json({ message: 'Level deleted successfully' });
  } catch (error) {
    console.error('Error deleting level:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Переупорядочить уровни (только админ)
router.post('/levels/reorder', authenticate, requireAdmin, async (req, res) => {
  try {
    const { levels } = req.body; // [{id: 1, order: 1}, {id: 2, order: 2}]
    
    for (const level of levels) {
      await pool.query(
        'UPDATE flexchan_levels SET level_order = $1 WHERE id = $2',
        [level.order, level.id]
      );
    }
    
    res.json({ message: 'Levels reordered successfully' });
  } catch (error) {
    console.error('Error reordering levels:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Сохранить прогресс ученика
router.post('/progress', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { level_id, completed, attempts } = req.body;
    
    // Проверяем, есть ли уже запись
    const existing = await pool.query(
      'SELECT * FROM flexchan_progress WHERE user_id = $1 AND level_id = $2',
      [userId, level_id]
    );
    
    if (existing.rows.length > 0) {
      // Обновляем
      const result = await pool.query(`
        UPDATE flexchan_progress 
        SET completed = $1, attempts = attempts + $2, completed_at = CASE WHEN $1 THEN NOW() ELSE completed_at END
        WHERE user_id = $3 AND level_id = $4
        RETURNING *
      `, [completed, attempts || 1, userId, level_id]);
      
      res.json(result.rows[0]);
    } else {
      // Создаём новую запись
      const result = await pool.query(`
        INSERT INTO flexchan_progress (user_id, level_id, completed, attempts, completed_at)
        VALUES ($1, $2, $3, $4, CASE WHEN $3 THEN NOW() ELSE NULL END)
        RETURNING *
      `, [userId, level_id, completed, attempts || 1]);
      
      // Если уровень пройден - начисляем баллы
      if (completed) {
        const levelResult = await pool.query(
          'SELECT points FROM flexchan_levels WHERE id = $1',
          [level_id]
        );
        
        if (levelResult.rows.length > 0) {
          const points = levelResult.rows[0].points;
          await pool.query(
            'UPDATE users SET points = points + $1 WHERE id = $2',
            [points, userId]
          );
          
          // Записываем в историю баллов
          await pool.query(`
            INSERT INTO points_history (user_id, amount, reason, created_at)
            VALUES ($1, $2, $3, NOW())
          `, [userId, points, `FlexChan: пройден уровень ${level_id}`]);
        }
      }
      
      res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить прогресс ученика
router.get('/progress', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT fp.*, fl.title, fl.points
      FROM flexchan_progress fp
      JOIN flexchan_levels fl ON fp.level_id = fl.id
      WHERE fp.user_id = $1
      ORDER BY fl.level_order ASC
    `, [userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Статистика для админа
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    // Общая статистика
    const totalLevels = await pool.query('SELECT COUNT(*) FROM flexchan_levels WHERE is_active = true');
    const totalCompletions = await pool.query('SELECT COUNT(*) FROM flexchan_progress WHERE completed = true');
    const totalAttempts = await pool.query('SELECT SUM(attempts) FROM flexchan_progress');
    const uniquePlayers = await pool.query('SELECT COUNT(DISTINCT user_id) FROM flexchan_progress');
    
    // Статистика по уровням
    const levelStats = await pool.query(`
      SELECT 
        fl.id,
        fl.title,
        fl.level_order,
        fl.difficulty,
        fl.points,
        COUNT(fp.id) as total_attempts,
        COUNT(CASE WHEN fp.completed THEN 1 END) as completions,
        ROUND(AVG(fp.attempts), 1) as avg_attempts
      FROM flexchan_levels fl
      LEFT JOIN flexchan_progress fp ON fl.id = fp.level_id
      WHERE fl.is_active = true
      GROUP BY fl.id
      ORDER BY fl.level_order ASC
    `);
    
    // Топ игроков
    const topPlayers = await pool.query(`
      SELECT 
        u.id,
        u.username as name,
        u.avatar_url,
        COUNT(CASE WHEN fp.completed THEN 1 END) as completed_levels,
        SUM(CASE WHEN fp.completed THEN fl.points ELSE 0 END) as earned_points
      FROM users u
      JOIN flexchan_progress fp ON u.id = fp.user_id
      JOIN flexchan_levels fl ON fp.level_id = fl.id
      GROUP BY u.id, u.username, u.avatar_url
      ORDER BY completed_levels DESC, earned_points DESC
      LIMIT 10
    `);
    
    res.json({
      totalLevels: parseInt(totalLevels.rows[0].count),
      totalCompletions: parseInt(totalCompletions.rows[0].count),
      totalAttempts: parseInt(totalAttempts.rows[0].sum || 0),
      uniquePlayers: parseInt(uniquePlayers.rows[0].count),
      levelStats: levelStats.rows,
      topPlayers: topPlayers.rows
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
