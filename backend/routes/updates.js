import express from 'express';
import Update from '../models/Update.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Получить все опубликованные обновления
router.get('/', authenticate, async (req, res) => {
  try {
    const updates = await Update.getPublished();
    res.json({ updates });
  } catch (error) {
    console.error('Ошибка получения обновлений:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить последнее обновление
router.get('/latest', authenticate, async (req, res) => {
  try {
    const update = await Update.getLatest();
    res.json({ update });
  } catch (error) {
    console.error('Ошибка получения последнего обновления:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить обновление по ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const update = await Update.getById(req.params.id);
    
    if (!update || !update.published) {
      return res.status(404).json({ error: 'Обновление не найдено' });
    }
    
    res.json({ update });
  } catch (error) {
    console.error('Ошибка получения обновления:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
