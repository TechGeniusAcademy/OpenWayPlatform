import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import User from '../models/User.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Настройка multer для загрузки аватарок
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/avatars';
    // Создаем директорию если её нет
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB максимум
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Только изображения разрешены (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Все маршруты требуют аутентификации
router.use(authenticate);

// Получить список онлайн пользователей
router.get('/online', async (req, res) => {
  try {
    const result = await User.getOnlineUsers();
    res.json({ users: result });
  } catch (error) {
    console.error('Ошибка получения онлайн пользователей:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить всех пользователей (студенты видят только других студентов, учителя видят студентов)
router.get('/', async (req, res) => {
  try {
    const users = await User.getAll();
    
    // Если студент - показываем только других студентов
    if (req.user.role === 'student') {
      const studentsOnly = users.filter(u => u.role === 'student');
      return res.json({ users: studentsOnly });
    }
    
    // Если учитель - показываем студентов и учителей
    if (req.user.role === 'teacher') {
      const studentsAndTeachers = users.filter(u => u.role === 'student' || u.role === 'teacher');
      return res.json({ users: studentsAndTeachers });
    }

    // Если тестер - показываем всех (read-only)
    if (req.user.role === 'tester') {
      return res.json({ users });
    }

    // Если CSS редактор - показываем всех (read-only)
    if (req.user.role === 'css_editor') {
      return res.json({ users });
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

// Получить текущего пользователя (аутентифицированного)
router.get('/me', authenticate, async (req, res) => {
  try {
    console.log('[USERS] /me request from user ID:', req.user?.id);
    const user = await User.findById(req.user.id);
    
    if (!user) {
      console.log('[USERS] User not found:', req.user.id);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    console.log('[USERS] Returning user:', { id: user.id, username: user.username, points: user.points });
    res.json(user);
  } catch (error) {
    console.error('Ошибка получения текущего пользователя:', error);
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

// Загрузить свой аватар (доступно для всех пользователей)
router.post('/me/avatar', (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Обработка ошибок Multer
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          error: 'Размер файла слишком большой. Максимальный размер: 5 МБ' 
        });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      // Обработка других ошибок (например, неверный тип файла)
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    // Удаляем старый аватар если существует
    const user = await User.findById(req.user.id);
    if (user.avatar_url) {
      const oldFilePath = path.join(process.cwd(), user.avatar_url);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }
    
    // Обновляем пользователя с новым аватаром
    const updatedUser = await User.update(req.user.id, { avatar_url: avatarUrl });

    res.json({
      message: 'Аватарка успешно загружена',
      avatar_url: avatarUrl,
      user: updatedUser
    });
  } catch (error) {
    // Удаляем файл в случае ошибки
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Ошибка загрузки аватарки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Загрузить аватарку для пользователя (только админы)
router.post('/:id/avatar', requireAdmin, (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          error: 'Размер файла слишком большой. Максимальный размер: 5 МБ' 
        });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    // Обновляем пользователя с новым аватаром
    const updatedUser = await User.update(req.params.id, { avatar_url: avatarUrl });
    
    if (!updatedUser) {
      // Удаляем загруженный файл если пользователь не найден
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      message: 'Аватарка успешно загружена',
      avatar_url: avatarUrl,
      user: updatedUser
    });
  } catch (error) {
    // Удаляем файл в случае ошибки
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Ошибка загрузки аватарки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удалить аватарку пользователя (только админы)
router.delete('/:id/avatar', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Удаляем файл аватарки если он существует
    if (user.avatar_url) {
      const filePath = path.join(process.cwd(), user.avatar_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Обновляем пользователя, убирая аватарку
    const updatedUser = await User.update(req.params.id, { avatar_url: null });

    res.json({
      message: 'Аватарка успешно удалена',
      user: updatedUser
    });
  } catch (error) {
    console.error('Ошибка удаления аватарки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
