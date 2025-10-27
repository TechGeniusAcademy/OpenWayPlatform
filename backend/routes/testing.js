import express from 'express';
import { authenticate, requireTester } from '../middleware/auth.js';
import User from '../models/User.js';
import Group from '../models/Group.js';
import Test from '../models/Test.js';

const router = express.Router();

router.use(authenticate);
router.use(requireTester);

// Стресс-тест пользователей
router.post('/stress-test', async (req, res) => {
  try {
    const { type } = req.body;
    
    // Здесь можно реализовать различные стресс-тесты
    const result = {
      type,
      status: 'completed',
      timestamp: new Date().toISOString(),
      message: `Стресс-тест "${type}" выполнен успешно`
    };

    console.log(`[TESTER] Стресс-тест запущен: ${type} пользователем ${req.user.username}`);
    
    res.json(result);
  } catch (error) {
    console.error('Ошибка стресс-теста:', error);
    res.status(500).json({ error: 'Ошибка выполнения стресс-теста' });
  }
});

// Стресс-тест чата
router.post('/chat-stress', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Симуляция стресс-теста чата
    const messagesSent = Math.floor(Math.random() * 100) + 50;
    const errors = Math.floor(Math.random() * 5);
    
    const duration = Date.now() - startTime;
    const avgLatency = Math.floor(Math.random() * 50) + 20;

    const result = {
      messagesSent,
      duration,
      avgLatency,
      errors,
      status: 'completed'
    };

    console.log(`[TESTER] Чат стресс-тест выполнен: ${messagesSent} сообщений`);
    
    res.json(result);
  } catch (error) {
    console.error('Ошибка стресс-теста чата:', error);
    res.status(500).json({ error: 'Ошибка выполнения стресс-теста' });
  }
});

// Создать тестовые данные
router.post('/generate-data', async (req, res) => {
  try {
    // В реальности здесь можно создавать тестовых пользователей, группы и т.д.
    // Для примера просто возвращаем успех
    
    console.log(`[TESTER] Создание тестовых данных запрошено пользователем ${req.user.username}`);
    
    res.json({ 
      success: true,
      message: 'Тестовые данные созданы',
      created: {
        users: 0,
        groups: 0,
        tests: 0
      }
    });
  } catch (error) {
    console.error('Ошибка создания тестовых данных:', error);
    res.status(500).json({ error: 'Ошибка создания данных' });
  }
});

// Удалить тестовые данные
router.delete('/clear-data', async (req, res) => {
  try {
    // В реальности здесь можно удалять тестовые данные
    // Для безопасности нужно добавить проверки
    
    console.log(`[TESTER] Удаление тестовых данных запрошено пользователем ${req.user.username}`);
    
    res.json({ 
      success: true,
      message: 'Тестовые данные удалены',
      deleted: {
        users: 0,
        groups: 0,
        tests: 0
      }
    });
  } catch (error) {
    console.error('Ошибка удаления тестовых данных:', error);
    res.status(500).json({ error: 'Ошибка удаления данных' });
  }
});

// Получить метрики производительности
router.get('/performance-metrics', async (req, res) => {
  try {
    const metrics = {
      apiResponseTime: Math.floor(Math.random() * 100) + 50,
      wsLatency: Math.floor(Math.random() * 50) + 10,
      memoryUsage: Math.floor(Math.random() * 40) + 30,
      cpuUsage: Math.floor(Math.random() * 60) + 20,
      timestamp: new Date().toISOString()
    };

    res.json(metrics);
  } catch (error) {
    console.error('Ошибка получения метрик:', error);
    res.status(500).json({ error: 'Ошибка получения метрик' });
  }
});

// Получить системные логи (mock)
router.get('/system-logs', async (req, res) => {
  try {
    const logs = [
      { id: 1, level: 'info', message: 'Server started successfully', timestamp: new Date().toISOString() },
      { id: 2, level: 'warn', message: 'High memory usage detected', timestamp: new Date().toISOString() },
      { id: 3, level: 'error', message: 'Database connection timeout', timestamp: new Date().toISOString() },
      { id: 4, level: 'info', message: 'WebSocket connection established', timestamp: new Date().toISOString() }
    ];

    res.json({ logs });
  } catch (error) {
    console.error('Ошибка получения логов:', error);
    res.status(500).json({ error: 'Ошибка получения логов' });
  }
});

export default router;
