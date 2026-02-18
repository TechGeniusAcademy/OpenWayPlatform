import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, requireTeacherOrAdmin, requireTesterOrTeacherOrAdmin } from '../middleware/auth.js';
import Homework from '../models/Homework.js';
import HomeworkSubmission from '../models/HomeworkSubmission.js';

const router = express.Router();

// Настройка multer для загрузки файлов домашних заданий
const homeworkStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/homeworks';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `homework-${req.params.id}-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

const uploadHomework = multer({
  storage: homeworkStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB лимит
  fileFilter: (req, file, cb) => {
    // Разрешённые типы файлов
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/x-zip-compressed', 'multipart/x-zip', 'application/x-7z-compressed',
      'text/plain', 'text/html', 'text/css', 'text/javascript',
      'application/javascript',
      'application/json',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый тип файла'), false);
    }
  }
});

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

// Сдать домашнее задание с файлами
router.post('/:id/submit', uploadHomework.array('files', 10), async (req, res) => {
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

    // Собираем информацию о загруженных файлах
    const attachments = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: `/uploads/homeworks/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype
    })) : [];

    const submission = await HomeworkSubmission.submit(
      req.params.id,
      req.user.id,
      submissionText,
      attachments
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

// Получить все домашние задания (админ, учитель, тестер, CSS редактор)
router.get('/', requireTesterOrTeacherOrAdmin, async (req, res) => {
  try {
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

// Обновить домашнее задание (админ и учитель)
router.put('/:id', requireTeacherOrAdmin, async (req, res) => {
  try {
    const homework = await Homework.update(req.params.id, req.body);
    res.json({ homework });
  } catch (error) {
    console.error('Ошибка обновления домашнего задания:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удалить домашнее задание (админ и учитель)
router.delete('/:id', requireTeacherOrAdmin, async (req, res) => {
  try {
    await Homework.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления домашнего задания:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Закрыть/открыть домашнее задание вручную (админ и учитель)
router.patch('/:id/toggle-closed', requireTeacherOrAdmin, async (req, res) => {
  try {
    const { manually_closed } = req.body;
    const homework = await Homework.toggleClosed(req.params.id, manually_closed);
    res.json({ homework });
  } catch (error) {
    console.error('Ошибка изменения статуса домашнего задания:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Назначить домашнее задание группе (админ и учитель)
router.post('/:id/assign', requireTeacherOrAdmin, async (req, res) => {
  try {
    const { groupId } = req.body;
    await Homework.assignToGroup(req.params.id, groupId, req.user.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка назначения домашнего задания:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Отменить назначение домашнего задания группе (админ и учитель)
router.delete('/:id/assign/:groupId', requireTeacherOrAdmin, async (req, res) => {
  try {
    await Homework.unassignFromGroup(req.params.id, req.params.groupId);
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка отмены назначения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить назначения домашнего задания (админ и учитель)
router.get('/:id/assignments', requireTeacherOrAdmin, async (req, res) => {
  try {
    const assignments = await Homework.getAssignments(req.params.id);
    res.json({ assignments });
  } catch (error) {
    console.error('Ошибка получения назначений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить сдачи домашнего задания (админ и учитель)
router.get('/:id/submissions', requireTeacherOrAdmin, async (req, res) => {
  try {
    const submissions = await Homework.getSubmissions(req.params.id);
    res.json({ submissions });
  } catch (error) {
    console.error('Ошибка получения сдач:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Принять/отклонить сдачу домашнего задания (админ и учитель)
router.post('/submission/:submissionId/check', requireTeacherOrAdmin, async (req, res) => {
  try {
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
