import express from 'express';
import TypingResult from '../models/TypingResult.js';
import { authenticate, requireTeacherOrAdmin, requireTesterOrTeacherOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Все маршруты требуют аутентификации
router.use(authenticate);

// ========== STUDENT ENDPOINTS ==========

// Сохранить результат теста печати
router.post('/results', async (req, res) => {
  try {
    const { text_length, time_seconds, wpm, accuracy, errors } = req.body;

    // Валидация данных
    if (!text_length || !time_seconds || wpm === undefined || accuracy === undefined) {
      return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
    }

    if (text_length <= 0 || time_seconds <= 0 || wpm < 0 || accuracy < 0 || accuracy > 100) {
      return res.status(400).json({ error: 'Некорректные значения данных' });
    }

    const result = await TypingResult.create(req.user.id, {
      text_length,
      time_seconds,
      wpm,
      accuracy,
      errors: errors || 0
    });

    res.json({ 
      success: true, 
      result: {
        id: result.id,
        wpm: result.wpm,
        accuracy: result.accuracy,
        created_at: result.created_at
      }
    });
  } catch (error) {
    console.error('Ошибка сохранения результата:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить историю результатов пользователя
router.get('/my-results', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const results = await TypingResult.getByUserId(req.user.id, limit);
    
    res.json({ results });
  } catch (error) {
    console.error('Ошибка получения результатов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить статистику пользователя
router.get('/my-stats', async (req, res) => {
  try {
    const stats = await TypingResult.getUserStats(req.user.id);
    res.json({ stats });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить прогресс пользователя
router.get('/my-progress', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const progress = await TypingResult.getUserProgress(req.user.id, days);
    res.json({ progress });
  } catch (error) {
    console.error('Ошибка получения прогресса:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить топ результаты (доступно всем)
router.get('/top', async (req, res) => {
  try {
    const type = req.query.type || 'wpm'; // wpm или accuracy
    const limit = parseInt(req.query.limit) || 10;
    
    if (!['wpm', 'accuracy'].includes(type)) {
      return res.status(400).json({ error: 'Некорректный тип сортировки' });
    }

    const topResults = await TypingResult.getTopResults(type, limit);
    
    // Убираем чувствительную информацию для студентов
    if (req.user.role === 'student') {
      const sanitizedResults = topResults.map(result => ({
        id: result.id,
        wpm: result.wpm,
        accuracy: result.accuracy,
        text_length: result.text_length,
        time_seconds: result.time_seconds,
        username: result.username,
        full_name: result.full_name,
        group_name: result.group_name,
        created_at: result.created_at
      }));
      return res.json({ results: sanitizedResults });
    }

    res.json({ results: topResults });
  } catch (error) {
    console.error('Ошибка получения топ результатов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ========== ADMIN ENDPOINTS ==========

// Получить общую статистику для админ панели
router.get('/admin/statistics', requireTesterOrTeacherOrAdmin, async (req, res) => {
  try {
    const allResults = await TypingResult.getAll(1000);
    
    const statistics = {
      totalTests: allResults.length,
      uniqueUsers: new Set(allResults.map(r => r.user_id)).size,
      averageWpm: Math.round(allResults.reduce((sum, r) => sum + r.wpm, 0) / allResults.length || 0),
      averageAccuracy: Math.round(allResults.reduce((sum, r) => sum + r.accuracy, 0) / allResults.length || 0),
      bestWpm: Math.max(...allResults.map(r => r.wpm), 0),
      bestAccuracy: Math.max(...allResults.map(r => r.accuracy), 0)
    };

    res.json(statistics);
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить статистику пользователей
router.get('/admin/users', requireTesterOrTeacherOrAdmin, async (req, res) => {
  try {
    const { period = 'all', sortBy = 'wpm', order = 'desc' } = req.query;
    
    // Получаем все результаты
    const allResults = await TypingResult.getAll(10000);
    
    // Группируем по пользователям
    const userMap = new Map();
    
    allResults.forEach(result => {
      if (!userMap.has(result.user_id)) {
        userMap.set(result.user_id, {
          id: result.user_id,
          userId: result.user_id,
          username: result.username || 'Unknown',
          email: result.email || '',
          fullName: result.full_name || '',
          testsCount: 0,
          totalWpm: 0,
          totalAccuracy: 0,
          bestWpm: 0,
          bestAccuracy: 0,
          results: []
        });
      }
      
      const userData = userMap.get(result.user_id);
      userData.testsCount++;
      userData.totalWpm += result.wpm;
      userData.totalAccuracy += result.accuracy;
      userData.bestWpm = Math.max(userData.bestWpm, result.wpm);
      userData.bestAccuracy = Math.max(userData.bestAccuracy, result.accuracy);
      userData.results.push(result);
    });
    
    // Вычисляем средние значения
    const userStats = Array.from(userMap.values()).map(user => ({
      ...user,
      averageWpm: Math.round(user.totalWpm / user.testsCount),
      averageAccuracy: Math.round(user.totalAccuracy / user.testsCount),
      lastTestDate: user.results[user.results.length - 1]?.created_at
    }));
    
    // Сортировка
    userStats.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'wpm':
          aVal = a.averageWpm;
          bVal = b.averageWpm;
          break;
        case 'accuracy':
          aVal = a.averageAccuracy;
          bVal = b.averageAccuracy;
          break;
        case 'testsCount':
          aVal = a.testsCount;
          bVal = b.testsCount;
          break;
        default:
          aVal = a.averageWpm;
          bVal = b.averageWpm;
      }
      return order === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    res.json(userStats);
  } catch (error) {
    console.error('Ошибка получения статистики пользователей:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить статистику по группам
router.get('/admin/groups', requireTesterOrTeacherOrAdmin, async (req, res) => {
  try {
    const groupStats = await TypingResult.getGroupStats();
    res.json(groupStats || []);
  } catch (error) {
    console.error('Ошибка получения статистики групп:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить историю тестов пользователя
router.get('/admin/user/:userId/history', requireTeacherOrAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Некорректный ID пользователя' });
    }

    const results = await TypingResult.getByUserId(userId, 50);
    res.json(results);
  } catch (error) {
    console.error('Ошибка получения истории пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить все результаты (только админ)
router.get('/all-results', requireTeacherOrAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const results = await TypingResult.getAll(limit);
    
    res.json({ results });
  } catch (error) {
    console.error('Ошибка получения всех результатов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить статистику по группам (только админ)
router.get('/group-stats', requireTeacherOrAdmin, async (req, res) => {
  try {
    const groupStats = await TypingResult.getGroupStats();
    res.json({ groupStats });
  } catch (error) {
    console.error('Ошибка получения статистики по группам:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить статистику конкретного пользователя (только админ)
router.get('/user/:userId/stats', requireTeacherOrAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Некорректный ID пользователя' });
    }

    const stats = await TypingResult.getUserStats(userId);
    const results = await TypingResult.getByUserId(userId, 20);
    
    res.json({ stats, results });
  } catch (error) {
    console.error('Ошибка получения статистики пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить прогресс конкретного пользователя (только админ)
router.get('/user/:userId/progress', requireTeacherOrAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const days = parseInt(req.query.days) || 30;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Некорректный ID пользователя' });
    }

    const progress = await TypingResult.getUserProgress(userId, days);
    res.json({ progress });
  } catch (error) {
    console.error('Ошибка получения прогресса пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удалить результат (только админ)
router.delete('/results/:id', requireTeacherOrAdmin, async (req, res) => {
  try {
    const resultId = parseInt(req.params.id);
    
    if (isNaN(resultId)) {
      return res.status(400).json({ error: 'Некорректный ID результата' });
    }

    const deletedResult = await TypingResult.delete(resultId);
    
    if (!deletedResult) {
      return res.status(404).json({ error: 'Результат не найден' });
    }

    res.json({ 
      success: true, 
      message: 'Результат успешно удален',
      deletedResult: {
        id: deletedResult.id,
        user_id: deletedResult.user_id,
        created_at: deletedResult.created_at
      }
    });
  } catch (error) {
    console.error('Ошибка удаления результата:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить общую статистику системы (только админ)
router.get('/system-stats', requireTeacherOrAdmin, async (req, res) => {
  try {
    // Можно добавить дополнительные системные метрики
    const allResults = await TypingResult.getAll(1000);
    
    const systemStats = {
      total_tests: allResults.length,
      unique_users: new Set(allResults.map(r => r.user_id)).size,
      avg_wpm: Math.round(allResults.reduce((sum, r) => sum + r.wpm, 0) / allResults.length || 0),
      avg_accuracy: Math.round(allResults.reduce((sum, r) => sum + r.accuracy, 0) / allResults.length || 0),
      best_wpm: Math.max(...allResults.map(r => r.wpm), 0),
      best_accuracy: Math.max(...allResults.map(r => r.accuracy), 0)
    };

    res.json({ systemStats });
  } catch (error) {
    console.error('Ошибка получения системной статистики:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
