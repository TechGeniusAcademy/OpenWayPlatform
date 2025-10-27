import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware для проверки JWT токена
export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
};

// Middleware для проверки роли администратора
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора.' });
  }
  next();
};

// Backwards-compatible alias: some routes import `authorizeAdmin`
export const authorizeAdmin = requireAdmin;

// Middleware для проверки роли учителя или администратора
export const requireTeacherOrAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Доступ запрещен. Требуются права учителя или администратора.' });
  }
  next();
};

// Middleware для проверки роли студента
export const requireStudent = (req, res, next) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Доступ запрещен. Требуются права студента.' });
  }
  next();
};

// Middleware для проверки роли тестера
export const requireTester = (req, res, next) => {
  if (req.user.role !== 'tester' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен. Требуются права тестера.' });
  }
  next();
};
