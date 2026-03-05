import express from 'express';
import Group from '../models/Group.js';
import pool from '../config/database.js';
import { authenticate, requireAdmin, requireTeacherOrAdmin, requireTesterOrTeacherOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Все маршруты требуют аутентификации
router.use(authenticate);

// Получить все группы (для учителей, тестеров и админов)
router.get('/', requireTesterOrTeacherOrAdmin, async (req, res) => {
  try {
    const groups = await Group.getAll();
    res.json({ groups });
  } catch (error) {
    console.error('Ошибка получения групп:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить группу по ID с учениками (доступно студентам для своей группы и админам)
router.get('/:id', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    
    // Проверка прав: студент может видеть только свою группу
    if (req.user.role === 'student' && req.user.group_id !== groupId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const group = await Group.getWithStudents(groupId);
    
    if (!group) {
      return res.status(404).json({ error: 'Группа не найдена' });
    }

    res.json({ group });
  } catch (error) {
    console.error('Ошибка получения группы:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создать новую группу (учителя и админы)
router.post('/', requireTeacherOrAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    // Валидация
    if (!name) {
      return res.status(400).json({ 
        error: 'Название группы обязательно' 
      });
    }

    // Создание группы
    const newGroup = await Group.create({
      name,
      description: description || ''
    });

    res.status(201).json({
      message: 'Группа успешно создана',
      group: newGroup
    });
  } catch (error) {
    console.error('Ошибка создания группы:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновить группу (учителя и админы)
router.put('/:id', requireTeacherOrAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;

    const updatedGroup = await Group.update(req.params.id, updates);
    
    if (!updatedGroup) {
      return res.status(404).json({ error: 'Группа не найдена' });
    }

    res.json({
      message: 'Группа успешно обновлена',
      group: updatedGroup
    });
  } catch (error) {
    console.error('Ошибка обновления группы:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удалить группу (учителя и админы)
router.delete('/:id', requireTeacherOrAdmin, async (req, res) => {
  try {
    const deletedGroup = await Group.delete(req.params.id);
    
    if (!deletedGroup) {
      return res.status(404).json({ error: 'Группа не найдена' });
    }

    res.json({ message: 'Группа успешно удалена' });
  } catch (error) {
    console.error('Ошибка удаления группы:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Добавить студентов в группу (учителя и админы)
router.post('/:id/students', requireTeacherOrAdmin, async (req, res) => {
  try {
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ 
        error: 'Необходимо указать массив ID студентов' 
      });
    }

    const addedStudents = await Group.addStudents(req.params.id, studentIds);

    res.json({
      message: 'Студенты успешно добавлены в группу',
      students: addedStudents
    });
  } catch (error) {
    console.error('Ошибка добавления студентов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить студентов без группы (учителя и админы)
router.get('/students/available', requireTeacherOrAdmin, async (req, res) => {
  try {
    const students = await Group.getStudentsWithoutGroup();
    res.json({ students });
  } catch (error) {
    console.error('Ошибка получения студентов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Назначить старосту группы (учителя и админы)
router.put('/:id/leader', requireTeacherOrAdmin, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const { userId } = req.body;

    if (!userId) {
      // Снять старосту
      const group = await Group.clearLeader(groupId);
      if (!group) return res.status(404).json({ error: 'Группа не найдена' });
      return res.json({ message: 'Статус старосты снят', group });
    }

    const group = await Group.setLeader(groupId, parseInt(userId));
    if (!group) return res.status(404).json({ error: 'Группа не найдена или студент не в группе' });
    res.json({ message: 'Староста назначен', group });
  } catch (error) {
    console.error('Ошибка назначения старосты:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удалить студента из группы (учителя и админы)
router.delete('/:groupId/students/:studentId', requireTeacherOrAdmin, async (req, res) => {
  try {
    const removedStudent = await Group.removeStudent(req.params.studentId);
    
    if (!removedStudent) {
      return res.status(404).json({ error: 'Студент не найден' });
    }

    res.json({ message: 'Студент успешно удален из группы' });
  } catch (error) {
    console.error('Ошибка удаления студента:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ── Данные посещаемости для старосты (только свой группы) ──
router.get('/:id/starosta/attendance', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    if (req.user.role === 'student' && (!req.user.is_group_leader || req.user.group_id !== groupId)) {
      return res.status(403).json({ error: 'Только для старосты группы' });
    }

    const studentsRes = await pool.query(`
      SELECT u.id, u.username, u.full_name, u.avatar_url,
        COALESCE(COUNT(a.id), 0)                                                          AS total_marked,
        COALESCE(COUNT(CASE WHEN a.status = 'present' THEN 1 END), 0)                    AS present_count,
        COALESCE(COUNT(CASE WHEN a.status = 'absent'  THEN 1 END), 0)                    AS absent_count,
        COALESCE(COUNT(CASE WHEN a.status = 'late'    THEN 1 END), 0)                    AS late_count
      FROM users u
      LEFT JOIN attendance a        ON a.student_id = u.id
      LEFT JOIN schedule_lessons sl ON a.lesson_id  = sl.id AND sl.group_id = $1
      WHERE u.group_id = $1 AND u.role = 'student'
      GROUP BY u.id, u.username, u.full_name, u.avatar_url
      ORDER BY absent_count DESC, u.full_name
    `, [groupId]);

    const lessonsRes = await pool.query(`
      SELECT sl.id, sl.title, sl.lesson_time, a.lesson_date,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) AS present_count,
        COUNT(CASE WHEN a.status = 'absent'  THEN 1 END) AS absent_count,
        COUNT(CASE WHEN a.status = 'late'    THEN 1 END) AS late_count
      FROM attendance a
      JOIN schedule_lessons sl ON a.lesson_id = sl.id
      WHERE sl.group_id = $1
      GROUP BY sl.id, sl.title, sl.lesson_time, a.lesson_date
      ORDER BY a.lesson_date DESC, sl.lesson_time DESC
      LIMIT 20
    `, [groupId]);

    res.json({ students: studentsRes.rows, lessons: lessonsRes.rows });
  } catch (error) {
    console.error('Ошибка посещаемости для старосты:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ── Домашние задания для старосты (кто сдал, кто нет) ──
router.get('/:id/starosta/homeworks', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    if (req.user.role === 'student' && (!req.user.is_group_leader || req.user.group_id !== groupId)) {
      return res.status(403).json({ error: 'Только для старосты группы' });
    }

    const hwRes = await pool.query(`
      SELECT
        h.id, h.title, h.description, h.deadline, h.status,
        (SELECT COUNT(*) FROM users WHERE group_id = $1 AND role = 'student') AS total_students,
        COUNT(DISTINCT hs.student_id)                                          AS submitted_count,
        COUNT(DISTINCT CASE WHEN hs.status = 'approved' THEN hs.student_id END) AS approved_count
      FROM homeworks h
      JOIN homework_assignments ha ON ha.homework_id = h.id AND ha.group_id = $1
      LEFT JOIN homework_submissions hs ON hs.homework_id = h.id
      GROUP BY h.id, h.title, h.description, h.deadline, h.status
      ORDER BY h.deadline ASC NULLS LAST, h.created_at DESC
      LIMIT 20
    `, [groupId]);

    // Для каждого ДЗ — кто именно не сдал
    const studentRes = await pool.query(`
      SELECT
        u.id, u.username, u.full_name, u.avatar_url,
        COUNT(DISTINCT h.id)   AS total_hw,
        COUNT(DISTINCT hs.homework_id) AS submitted_count
      FROM users u
      JOIN homework_assignments ha ON ha.group_id = $1
      JOIN homeworks h ON h.id = ha.homework_id
      LEFT JOIN homework_submissions hs ON hs.homework_id = h.id AND hs.student_id = u.id
      WHERE u.group_id = $1 AND u.role = 'student'
      GROUP BY u.id, u.username, u.full_name, u.avatar_url
      ORDER BY submitted_count ASC, u.full_name
    `, [groupId]);

    res.json({ homeworks: hwRes.rows, students: studentRes.rows });
  } catch (error) {
    console.error('Ошибка ДЗ для старосты:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
