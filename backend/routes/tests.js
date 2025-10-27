import express from 'express';
import { authenticate, requireTeacherOrAdmin } from '../middleware/auth.js';
import Test from '../models/Test.js';
import TestAttempt from '../models/TestAttempt.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.use(authenticate);

// ========== STUDENT ENDPOINTS (должны быть ПЕРЕД общими маршрутами) ==========

// Получить тесты, назначенные студенту
router.get('/student/assigned', async (req, res) => {
  try {
    const tests = await Test.getAssignedToStudent(req.user.id);
    res.json({ tests });
  } catch (error) {
    console.error('Ошибка получения назначенных тестов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить историю попыток студента
router.get('/student/history', async (req, res) => {
  try {
    const history = await TestAttempt.getUserHistory(req.user.id);
    res.json({ history });
  } catch (error) {
    console.error('Ошибка получения истории:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ========== ADMIN ENDPOINTS ==========

// Получить все тесты (только админ)
router.get('/', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const tests = await Test.getAll();
    res.json({ tests });
  } catch (error) {
    console.error('Ошибка получения тестов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить тест по ID
router.get('/:id', async (req, res) => {
  try {
    const test = await Test.getById(req.params.id);
    
    if (!test) {
      return res.status(404).json({ error: 'Тест не найден' });
    }

    // Для студентов скрываем правильные ответы
    if (req.user.role === 'student') {
      test.questions = test.questions.map(q => {
        if (q.options) {
          q.options = q.options.map(o => ({
            id: o.id,
            option_text: o.option_text,
            option_order: o.option_order
          }));
        }
        // Скрываем решение для студентов
        delete q.code_solution;
        return q;
      });
    }

    res.json({ test });
  } catch (error) {
    console.error('Ошибка получения теста:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создать тест (учителя и админы)
router.post('/', requireTeacherOrAdmin, async (req, res) => {
  try {
    const { test: testData, questions } = req.body;
    testData.created_by = req.user.id;

    const test = await Test.create(testData, questions);
    res.status(201).json({ test });
  } catch (error) {
    console.error('Ошибка создания теста:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновить тест (только админ)
router.put('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { test: testData, questions } = req.body;
    const test = await Test.update(req.params.id, testData, questions);
    
    res.json({ test });
  } catch (error) {
    console.error('Ошибка обновления теста:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удалить тест (только админ)
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    await Test.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления теста:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Назначить тест группе (только админ)
router.post('/:id/assign', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { groupId } = req.body;
    await Test.assignToGroup(req.params.id, groupId, req.user.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка назначения теста:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Отменить назначение теста группе (только админ)
router.delete('/:id/assign/:groupId', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    await Test.unassignFromGroup(req.params.id, req.params.groupId);
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка отмены назначения теста:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить назначения теста (только админ)
router.get('/:id/assignments', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const assignments = await Test.getAssignments(req.params.id);
    res.json({ assignments });
  } catch (error) {
    console.error('Ошибка получения назначений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить историю попыток по тесту (только админ)
router.get('/:id/history', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const history = await TestAttempt.getTestHistory(req.params.id);
    res.json({ history });
  } catch (error) {
    console.error('Ошибка получения истории:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Переназначить тест ученику (только админ)
router.post('/:testId/reassign/:userId', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    await TestAttempt.reassign(req.params.testId, req.params.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка переназначения теста:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Начать тест
router.post('/:id/start', async (req, res) => {
  try {
    // Проверяем, назначен ли тест студенту
    const assignedTests = await Test.getAssignedToStudent(req.user.id);
    const testExists = assignedTests.find(t => t.id === parseInt(req.params.id));
    
    if (!testExists) {
      return res.status(403).json({ error: 'Тест не назначен вам' });
    }

    // Проверяем, есть ли активная попытка
    const activeAttempt = await TestAttempt.getActive(req.params.id, req.user.id);
    
    if (activeAttempt) {
      return res.json({ attempt: activeAttempt });
    }

    // Проверяем, можно ли перепроходить тест
    const test = await Test.getById(req.params.id);
    const attempts = await TestAttempt.getUserHistory(req.user.id);
    const completedAttempts = attempts.filter(a => a.test_id === parseInt(req.params.id) && a.status === 'completed');

    if (completedAttempts.length > 0 && !test.can_retry) {
      return res.status(403).json({ error: 'Вы уже прошли этот тест. Перепрохождение запрещено.' });
    }

    // Создаем новую попытку
    const attempt = await TestAttempt.start(req.params.id, req.user.id);
    res.json({ attempt });
  } catch (error) {
    console.error('Ошибка начала теста:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Сохранить ответ на вопрос
router.post('/attempt/:attemptId/answer', async (req, res) => {
  try {
    const { questionId, answer } = req.body;
    
    // Проверяем, принадлежит ли попытка пользователю
    const attempt = await TestAttempt.getDetails(req.params.attemptId);
    
    if (!attempt || attempt.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ error: 'Попытка уже завершена' });
    }

    const savedAnswer = await TestAttempt.saveAnswer(req.params.attemptId, questionId, answer);
    res.json({ answer: savedAnswer });
  } catch (error) {
    console.error('Ошибка сохранения ответа:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Завершить тест
router.post('/attempt/:attemptId/complete', async (req, res) => {
  try {
    const { timeSpent } = req.body;
    
    // Проверяем попытку
    const attemptDetails = await TestAttempt.getDetails(req.params.attemptId);
    
    if (!attemptDetails || attemptDetails.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    if (attemptDetails.status !== 'in_progress') {
      return res.status(400).json({ error: 'Попытка уже завершена' });
    }

    // Получаем тест и проверяем ответы
    const test = await Test.getById(attemptDetails.test_id);
    let correctAnswers = 0;
    let totalQuestions = test.questions.length;

    for (const question of test.questions) {
      const userAnswer = attemptDetails.answers.find(a => a.question_id === question.id);
      
      if (!userAnswer) continue;

      let isCorrect = false;

      if (question.question_type === 'choice') {
        // Проверяем ответ с вариантами
        const correctOption = question.options.find(o => o.is_correct);
        isCorrect = userAnswer.selected_option_id === correctOption?.id;
      } else if (question.question_type === 'code') {
        // Для кода нужна компиляция и сравнение
        // Пока ставим is_correct из того, что пришло от клиента
        // TODO: Реализовать серверную проверку кода
        isCorrect = userAnswer.is_correct || false;
      }

      if (isCorrect) {
        correctAnswers++;
      }

      // Обновляем правильность ответа в БД
      await TestAttempt.saveAnswer(req.params.attemptId, question.id, {
        ...userAnswer,
        is_correct: isCorrect
      });
    }

    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const pointsEarned = (correctAnswers * test.points_correct) + 
                        ((totalQuestions - correctAnswers) * test.points_wrong);

    const completedAttempt = await TestAttempt.complete(
      req.params.attemptId,
      score,
      pointsEarned,
      timeSpent
    );

    res.json({ 
      attempt: completedAttempt,
      score,
      correctAnswers,
      totalQuestions,
      pointsEarned
    });
  } catch (error) {
    console.error('Ошибка завершения теста:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить детали попытки
router.get('/attempt/:attemptId', async (req, res) => {
  try {
    const attempt = await TestAttempt.getDetails(req.params.attemptId);
    
    if (!attempt) {
      return res.status(404).json({ error: 'Попытка не найдена' });
    }

    // Проверяем доступ
    if (req.user.role !== 'admin' && attempt.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    res.json({ attempt });
  } catch (error) {
    console.error('Ошибка получения деталей попытки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Проверить код (упрощенная версия для JavaScript)
router.post('/check-code', async (req, res) => {
  try {
    const { code, solution, language } = req.body;

    if (language !== 'javascript') {
      return res.status(400).json({ error: 'Пока поддерживается только JavaScript' });
    }

    // Простая проверка: сравниваем результаты выполнения
    // ВНИМАНИЕ: Это небезопасно для продакшена! Используйте песочницу (vm2, Docker и т.д.)
    try {
      const userResult = eval(code);
      const correctResult = eval(solution);
      
      const isCorrect = JSON.stringify(userResult) === JSON.stringify(correctResult);
      
      res.json({ 
        isCorrect,
        userResult,
        correctResult
      });
    } catch (execError) {
      res.json({ 
        isCorrect: false,
        error: execError.message
      });
    }
  } catch (error) {
    console.error('Ошибка проверки кода:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
