import express from 'express';
import Update from '../models/Update.js';
import { authenticate, requireAdmin, requireTesterOrTeacherOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Получить все обновления (админ, тестер, CSS редактор)
router.get('/', authenticate, requireTesterOrTeacherOrAdmin, async (req, res) => {
  try {
    const updates = await Update.getAll();
    res.json({ updates });
  } catch (error) {
    console.error('Ошибка получения обновлений:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить обновление по ID (админ, тестер, CSS редактор)
router.get('/:id', authenticate, requireTesterOrTeacherOrAdmin, async (req, res) => {
  try {
    const update = await Update.getById(req.params.id);
    if (!update) {
      return res.status(404).json({ error: 'Обновление не найдено' });
    }
    res.json({ update });
  } catch (error) {
    console.error('Ошибка получения обновления:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать новое обновление
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { version, title, description, content, published } = req.body;

    if (!version || !title || !content) {
      return res.status(400).json({ error: 'Заполните обязательные поля' });
    }

    const update = await Update.create({
      version,
      title,
      description,
      content,
      published
    });

    res.status(201).json({ update });
  } catch (error) {
    console.error('Ошибка создания обновления:', error);
    res.status(500).json({ error: 'Ошибка создания обновления' });
  }
});

// Обновить обновление
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { version, title, description, content, published } = req.body;

    if (!version || !title || !content) {
      return res.status(400).json({ error: 'Заполните обязательные поля' });
    }

    const update = await Update.update(req.params.id, {
      version,
      title,
      description,
      content,
      published
    });

    if (!update) {
      return res.status(404).json({ error: 'Обновление не найдено' });
    }

    res.json({ update });
  } catch (error) {
    console.error('Ошибка обновления:', error);
    res.status(500).json({ error: 'Ошибка обновления' });
  }
});

// Удалить обновление
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await Update.delete(req.params.id);
    res.json({ message: 'Обновление удалено' });
  } catch (error) {
    console.error('Ошибка удаления обновления:', error);
    res.status(500).json({ error: 'Ошибка удаления обновления' });
  }
});

export default router;
