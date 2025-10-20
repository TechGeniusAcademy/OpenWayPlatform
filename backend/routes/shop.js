import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Все маршруты требуют аутентификации
router.use(authenticate);

// Получить все предметы магазина
router.get('/items', async (req, res) => {
  try {
    const { type } = req.query; // 'frame' или 'banner'
    
    let query = 'SELECT * FROM shop_items';
    const params = [];
    
    if (type) {
      query += ' WHERE item_type = $1';
      params.push(type);
    }
    
    query += ' ORDER BY price ASC';
    
    const result = await pool.query(query, params);
    res.json({ items: result.rows });
  } catch (error) {
    console.error('Ошибка получения предметов магазина:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить купленные предметы пользователя
router.get('/purchases', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT item_key FROM user_purchases WHERE user_id = $1',
      [req.user.id]
    );
    
    const purchasedItems = result.rows.map(row => row.item_key);
    res.json({ purchases: purchasedItems });
  } catch (error) {
    console.error('Ошибка получения покупок:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Купить предмет
router.post('/purchase', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { itemKey } = req.body;
    
    if (!itemKey) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'itemKey обязателен' });
    }
    
    // Проверяем, существует ли предмет
    const itemResult = await client.query(
      'SELECT * FROM shop_items WHERE item_key = $1',
      [itemKey]
    );
    
    if (itemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Предмет не найден' });
    }
    
    const item = itemResult.rows[0];
    
    // Проверяем, не куплен ли уже предмет
    const purchaseCheck = await client.query(
      'SELECT * FROM user_purchases WHERE user_id = $1 AND item_key = $2',
      [req.user.id, itemKey]
    );
    
    if (purchaseCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Предмет уже куплен' });
    }
    
    // Получаем баллы пользователя
    const userResult = await client.query(
      'SELECT total_points FROM points WHERE user_id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      // Если у пользователя нет записи в points, создаем с 0 баллами
      await client.query(
        'INSERT INTO points (user_id, total_points) VALUES ($1, 0)',
        [req.user.id]
      );
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Недостаточно баллов' });
    }
    
    const userPoints = userResult.rows[0].total_points;
    
    if (userPoints < item.price) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Недостаточно баллов',
        required: item.price,
        current: userPoints
      });
    }
    
    // Списываем баллы
    await client.query(
      'UPDATE points SET total_points = total_points - $1 WHERE user_id = $2',
      [item.price, req.user.id]
    );
    
    // Добавляем покупку
    await client.query(
      'INSERT INTO user_purchases (user_id, item_key) VALUES ($1, $2)',
      [req.user.id, itemKey]
    );
    
    // Получаем обновленные баллы
    const updatedPoints = await client.query(
      'SELECT total_points FROM points WHERE user_id = $1',
      [req.user.id]
    );
    
    await client.query('COMMIT');
    
    res.json({ 
      message: 'Предмет успешно куплен',
      item,
      remainingPoints: updatedPoints.rows[0].total_points
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка покупки предмета:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  } finally {
    client.release();
  }
});

// Применить рамку к аватару
router.post('/apply-frame', async (req, res) => {
  try {
    const { frameKey } = req.body;
    
    if (!frameKey) {
      return res.status(400).json({ error: 'frameKey обязателен' });
    }
    
    // Проверяем, куплена ли рамка (или это 'none')
    if (frameKey !== 'none') {
      const purchaseCheck = await pool.query(
        'SELECT * FROM user_purchases WHERE user_id = $1 AND item_key = $2',
        [req.user.id, frameKey]
      );
      
      if (purchaseCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Рамка не куплена' });
      }
    }
    
    // Применяем рамку
    await pool.query(
      'UPDATE users SET avatar_frame = $1 WHERE id = $2',
      [frameKey, req.user.id]
    );
    
    res.json({ 
      message: 'Рамка успешно применена',
      frameKey
    });
  } catch (error) {
    console.error('Ошибка применения рамки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Применить баннер к профилю
router.post('/apply-banner', async (req, res) => {
  try {
    const { bannerKey } = req.body;
    
    if (!bannerKey) {
      return res.status(400).json({ error: 'bannerKey обязателен' });
    }
    
    // Проверяем, куплен ли баннер (или это 'default')
    if (bannerKey !== 'default') {
      const purchaseCheck = await pool.query(
        'SELECT * FROM user_purchases WHERE user_id = $1 AND item_key = $2',
        [req.user.id, bannerKey]
      );
      
      if (purchaseCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Баннер не куплен' });
      }
    }
    
    // Применяем баннер
    await pool.query(
      'UPDATE users SET profile_banner = $1 WHERE id = $2',
      [bannerKey, req.user.id]
    );
    
    res.json({ 
      message: 'Баннер успешно применен',
      bannerKey
    });
  } catch (error) {
    console.error('Ошибка применения баннера:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
