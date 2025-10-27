import express from 'express';
import { authenticate, requireTeacherOrAdmin } from '../middleware/auth.js';
import Homework from '../models/Homework.js';
import HomeworkSubmission from '../models/HomeworkSubmission.js';

const router = express.Router();

router.use(authenticate);

// ========== STUDENT ENDPOINTS (должны быть ПЕРЕД общими маршрутами) ==========

// Получить домашние задания студента (для выбора в модалке)
router.get('/my', async (req, res) => {
  try {
    const homeworks = await Homework.getAssignedToStudent(req.user.id);
    res.json(homeworks);
  } catch (error) {
    console.error('Ошибка получения домашних заданий:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить домашние задания, назначенные студенту
router.get('/student/assigned', async (req, res) => {
  try {
    const homeworks = await Homework.getAssignedToStudent(req.user.id);
    res.json({ homeworks });
  } catch (error) {
    console.error('Ошибка получения домашних заданий:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Сдать домашнее задание
router.post('/:id/submit', async (req, res) => {
  try {
    const { submissionText } = req.body;
    
    // Проверяем, назначено ли домашнее задание студенту
    const assignedHomeworks = await Homework.getAssignedToStudent(req.user.id);
    const homeworkExists = assignedHomeworks.find(h => h.id === parseInt(req.params.id));
    
    if (!homeworkExists) {
      return res.status(403).json({ error: 'Домашнее задание не назначено вам' });
    }

    // Проверяем, не закрыто ли задание
    if (homeworkExists.status === 'closed' || homeworkExists.status === 'expired') {
      return res.status(403).json({ error: 'Домашнее задание закрыто для сдачи' });
    }

    const submission = await HomeworkSubmission.submit(
      req.params.id,
      req.user.id,
      submissionText
    );

    res.json({ submission });
  } catch (error) {
    console.error('Ошибка сдачи домашнего задания:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить историю сдач студента
router.get('/student/history', async (req, res) => {
  try {
    const history = await HomeworkSubmission.getUserHistory(req.user.id);
    res.json({ history });
  } catch (error) {
    console.error('Ошибка получения истории:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить свою отправленную работу по ID домашки
router.get('/:id/submission', async (req, res) => {
  try {
    const submission = await HomeworkSubmission.getByUserAndHomework(req.user.id, req.params.id);
    res.json(submission);
  } catch (error) {
    console.error('Ошибка получения отправленной работы:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ========== ADMIN ENDPOINTS ==========

// Получить все домашние задания (только админ)
router.get('/', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const homeworks = await Homework.getAll();
    res.json({ homeworks });
  } catch (error) {
    console.error('Ошибка получения домашних заданий:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить домашнее задание по ID
router.get('/:id', async (req, res) => {
  try {
    const homework = await Homework.getById(req.params.id);
    
    if (!homework) {
      return res.status(404).json({ error: 'Домашнее задание не найдено' });
    }

    res.json({ homework });
  } catch (error) {
    console.error('Ошибка получения домашнего задания:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создать домашнее задание (учителя и админы)
router.post('/', requireTeacherOrAdmin, async (req, res) => {
  try {
    const homeworkData = {
      ...req.body,
      created_by: req.user.id
    };

    const homework = await Homework.create(homeworkData);
    res.status(201).json({ homework });
  } catch (error) {
    console.error('Ошибка создания домашнего задания:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновить домашнее задание (только админ)
router.put('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const homework = await Homework.update(req.params.id, req.body);
    res.json({ homework });
  } catch (error) {
    console.error('Ошибка обновления домашнего задания:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удалить домашнее задание (только админ)
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    await Homework.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления домашнего задания:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Закрыть/открыть домашнее задание вручную (только админ)
router.patch('/:id/toggle-closed', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { isClosed } = req.body;
    const homework = await Homework.toggleClosed(req.params.id, isClosed);
    res.json({ homework });
  } catch (error) {
    console.error('Ошибка изменения статуса домашнего задания:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Назначить домашнее задание группе (только админ)
router.post('/:id/assign', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { groupId } = req.body;
    await Homework.assignToGroup(req.params.id, groupId, req.user.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка назначения домашнего задания:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Отменить назначение домашнего задания группе (только админ)
router.delete('/:id/assign/:groupId', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    await Homework.unassignFromGroup(req.params.id, req.params.groupId);
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка отмены назначения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить назначения домашнего задания (только админ)
router.get('/:id/assignments', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const assignments = await Homework.getAssignments(req.params.id);
    res.json({ assignments });
  } catch (error) {
    console.error('Ошибка получения назначений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить сдачи домашнего задания (только админ)
router.get('/:id/submissions', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const submissions = await Homework.getSubmissions(req.params.id);
    res.json({ submissions });
  } catch (error) {
    console.error('Ошибка получения сдач:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Принять/отклонить сдачу домашнего задания (только админ)
router.post('/submission/:submissionId/check', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { status, reason, pointsEarned } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Неверный статус' });
    }

    const submission = await HomeworkSubmission.check(
      req.params.submissionId,
      status,
      req.user.id,
      reason,
      pointsEarned
    );

    res.json({ submission });
  } catch (error) {
    console.error('Ошибка проверки домашнего задания:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить детали сдачи
router.get('/submission/:submissionId', async (req, res) => {
  try {
    const submission = await HomeworkSubmission.getDetails(req.params.submissionId);
    
    if (!submission) {
      return res.status(404).json({ error: 'Сдача не найдена' });
    }

    // Проверяем доступ
    if (req.user.role !== 'admin' && submission.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    res.json({ submission });
  } catch (error) {
    console.error('Ошибка получения деталей сдачи:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
