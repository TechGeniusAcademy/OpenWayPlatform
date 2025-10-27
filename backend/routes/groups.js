import express from 'express';
import Group from '../models/Group.js';
import { authenticate, requireAdmin, requireTeacherOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Все маршруты требуют аутентификации
router.use(authenticate);

// Получить все группы (для учителей и админов)
router.get('/', requireTeacherOrAdmin, async (req, res) => {
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

export default router;
