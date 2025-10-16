import express from 'express';
import Points from '../models/Points.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Все маршруты требуют аутентификации
router.use(authenticate);

// Добавить баллы студенту (только админы)
router.post('/add', requireAdmin, async (req, res) => {
  try {
    const { userId, points, reason } = req.body;

    if (!userId || points === undefined) {
      return res.status(400).json({ 
        error: 'Необходимо указать userId и points' 
      });
    }

    if (typeof points !== 'number' || points === 0) {
      return res.status(400).json({ 
        error: 'Количество баллов должно быть числом и не равно 0' 
      });
    }

    const updatedUser = await Points.addPoints(userId, points, reason);

    if (!updatedUser) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      message: `Баллы ${points > 0 ? 'добавлены' : 'списаны'} успешно`,
      user: updatedUser
    });
  } catch (error) {
    console.error('Ошибка добавления баллов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Установить баллы студенту (только админы)
router.put('/set', requireAdmin, async (req, res) => {
  try {
    const { userId, points } = req.body;

    if (!userId || points === undefined) {
      return res.status(400).json({ 
        error: 'Необходимо указать userId и points' 
      });
    }

    if (typeof points !== 'number' || points < 0) {
      return res.status(400).json({ 
        error: 'Количество баллов должно быть неотрицательным числом' 
      });
    }

    const updatedUser = await Points.setPoints(userId, points);

    if (!updatedUser) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      message: 'Баллы установлены успешно',
      user: updatedUser
    });
  } catch (error) {
    console.error('Ошибка установки баллов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить топ студентов по баллам (доступно всем авторизованным)
router.get('/top-students', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const topStudents = await Points.getTopStudents(limit);
    
    res.json({ students: topStudents });
  } catch (error) {
    console.error('Ошибка получения топа студентов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить топ групп по баллам (доступно всем авторизованным)
router.get('/top-groups', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const topGroups = await Points.getTopGroups(limit);
    
    res.json({ groups: topGroups });
  } catch (error) {
    console.error('Ошибка получения топа групп:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить баллы студента
router.get('/student/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Студенты могут видеть только свои баллы, админы - любые
    if (req.user.role === 'student' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const student = await Points.getStudentPoints(userId);
    
    if (!student) {
      return res.status(404).json({ error: 'Студент не найден' });
    }

    res.json({ student });
  } catch (error) {
    console.error('Ошибка получения баллов студента:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
