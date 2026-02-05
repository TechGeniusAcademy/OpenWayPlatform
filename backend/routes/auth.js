import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Генерация JWT токена
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Вход (логин)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Валидация
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    // Поиск пользователя
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Проверка пароля
    const isValidPassword = await User.comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Генерация токена
    const token = generateToken(user.id, user.role);

    res.json({
      message: 'Успешный вход',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        group_id: user.group_id,
        points: user.points || 0,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение информации о текущем пользователе
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        full_name: req.user.full_name,
        group_id: req.user.group_id,
        points: req.user.points || 0,
        experience: req.user.experience || 0,
        created_at: req.user.created_at,
        avatar_url: req.user.avatar_url || null,
        avatar_frame: req.user.avatar_frame || 'none',
        profile_banner: req.user.profile_banner || 'default',
        username_style: req.user.username_style || 'none',
        message_color: req.user.message_color || 'none'
      }
    });
  } catch (error) {
    console.error('Ошибка получения данных пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Выход (опционально - для клиента)
router.post('/logout', authenticate, (req, res) => {
  res.json({ message: 'Успешный выход' });
});

export default router;
