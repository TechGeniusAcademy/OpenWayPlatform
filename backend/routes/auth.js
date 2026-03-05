import express from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();

// Генерация JWT токена с уникальным jti
const generateToken = (userId, role) => {
  const jti = randomUUID();
  const token = jwt.sign(
    { userId, role, jti },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  return { token, jti };
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
    const { token, jti } = generateToken(user.id, user.role);

    // Сохраняем сессию
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || null;
    const ua = req.headers['user-agent'] || null;
    await pool.query(
      'INSERT INTO user_sessions (user_id, jti, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
      [user.id, jti, ip, ua]
    );

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
        message_color: req.user.message_color || 'none',
        is_group_leader: req.user.is_group_leader || false
      }
    });
  } catch (error) {
    console.error('Ошибка получения данных пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Выход — удаляем текущую сессию
router.post('/logout', authenticate, async (req, res) => {
  try {
    if (req.jti) {
      await pool.query('DELETE FROM user_sessions WHERE jti = $1', [req.jti]);
    }
  } catch (_) { /* ignore */ }
  res.json({ message: 'Успешный выход' });
});

// Получить все активные сессии пользователя
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, ip_address, user_agent, created_at, last_used_at,
              (jti = $2) AS is_current
       FROM user_sessions
       WHERE user_id = $1
       ORDER BY last_used_at DESC`,
      [req.user.id, req.jti || '']
    );
    res.json({ sessions: rows });
  } catch (err) {
    console.error('sessions list error:', err);
    res.status(500).json({ error: 'Ошибка получения сессий' });
  }
});

// Удалить конкретную сессию
router.delete('/sessions/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM user_sessions WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Сессия не найдена' });
    res.json({ message: 'Сессия завершена' });
  } catch (err) {
    console.error('session delete error:', err);
    res.status(500).json({ error: 'Ошибка удаления сессии' });
  }
});

// Удалить все сессии кроме текущей
router.delete('/sessions', authenticate, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM user_sessions WHERE user_id = $1 AND jti != $2',
      [req.user.id, req.jti || '']
    );
    res.json({ message: 'Все другие сессии завершены' });
  } catch (err) {
    console.error('sessions delete all error:', err);
    res.status(500).json({ error: 'Ошибка удаления сессий' });
  }
});

export default router;
