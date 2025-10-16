import express from 'express';
import User from '../models/User.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Все маршруты требуют аутентификации
router.use(authenticate);

// Получить всех пользователей (студенты видят только других студентов)
router.get('/', async (req, res) => {
  try {
    const users = await User.getAll();
    
    // Если студент - показываем только других студентов
    if (req.user.role === 'student') {
      const studentsOnly = users.filter(u => u.role === 'student');
      return res.json({ users: studentsOnly });
    }
    
    // Админы видят всех
    res.json({ users });
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создать нового пользователя (регистрация админом)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role, full_name } = req.body;

    // Валидация
    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: 'Username, email и пароль обязательны' 
      });
    }

    // Проверка на существование
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    }

    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ error: 'Пользователь с таким username уже существует' });
    }

    // Создание пользователя
    const newUser = await User.create({
      username,
      email,
      password,
      role: role || 'student',
      full_name
    });

    res.status(201).json({
      message: 'Пользователь успешно создан',
      user: newUser
    });
  } catch (error) {
    console.error('Ошибка создания пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить пользователя по ID (доступно всем для просмотра профилей)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновить пользователя (только админы)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role, full_name } = req.body;
    const updates = {};

    if (username) updates.username = username;
    if (email) updates.email = email;
    if (password) updates.password = password;
    if (role) updates.role = role;
    if (full_name !== undefined) updates.full_name = full_name;

    const updatedUser = await User.update(req.params.id, updates);
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      message: 'Пользователь успешно обновлен',
      user: updatedUser
    });
  } catch (error) {
    console.error('Ошибка обновления пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удалить пользователя (только админы)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const deletedUser = await User.delete(req.params.id);
    
    if (!deletedUser) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ message: 'Пользователь успешно удален' });
  } catch (error) {
    console.error('Ошибка удаления пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
