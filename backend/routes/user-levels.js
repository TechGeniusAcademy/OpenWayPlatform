import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Настройка multer для загрузки изображений уровней
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/levels');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'level-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Только изображения разрешены'));
    }
  }
});

// Проверка роли админа
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }
  next();
};

// Получить все уровни
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM user_levels
      ORDER BY level_number ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения уровней:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать новый уровень
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { level_number, rank_name, experience_required, image_url } = req.body;
    
    // Проверка на дубликат номера уровня
    const existing = await pool.query(
      'SELECT id FROM user_levels WHERE level_number = $1',
      [level_number]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Уровень с таким номером уже существует' });
    }
    
    const result = await pool.query(`
      INSERT INTO user_levels (level_number, rank_name, experience_required, image_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [level_number, rank_name || null, experience_required || 0, image_url || null]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания уровня:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить уровень
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { level_number, rank_name, experience_required, image_url } = req.body;
    
    // Проверка на дубликат номера уровня (исключая текущий)
    const existing = await pool.query(
      'SELECT id FROM user_levels WHERE level_number = $1 AND id != $2',
      [level_number, id]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Уровень с таким номером уже существует' });
    }
    
    const result = await pool.query(`
      UPDATE user_levels
      SET level_number = $1,
          rank_name = $2,
          experience_required = $3,
          image_url = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [level_number, rank_name || null, experience_required || 0, image_url || null, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Уровень не найден' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка обновления уровня:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить уровень
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Получаем уровень для удаления изображения
    const level = await pool.query('SELECT image_url FROM user_levels WHERE id = $1', [id]);
    
    if (level.rows.length > 0 && level.rows[0].image_url) {
      const imagePath = path.join(__dirname, '..', level.rows[0].image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await pool.query('DELETE FROM user_levels WHERE id = $1', [id]);
    res.json({ message: 'Уровень удален' });
  } catch (error) {
    console.error('Ошибка удаления уровня:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Загрузка изображения уровня
router.post('/upload-image', authenticate, adminOnly, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }
    
    const url = `/uploads/levels/${req.file.filename}`;
    res.json({ url });
  } catch (error) {
    console.error('Ошибка загрузки изображения:', error);
    res.status(500).json({ error: 'Ошибка загрузки' });
  }
});

// Получить уровень пользователя по его опыту
router.get('/current/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Получаем опыт пользователя
    const userResult = await pool.query('SELECT experience FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const userExperience = userResult.rows[0].experience || 0;
    
    // Находим текущий уровень пользователя
    const levelResult = await pool.query(`
      SELECT * FROM user_levels
      WHERE experience_required <= $1
      ORDER BY level_number DESC
      LIMIT 1
    `, [userExperience]);
    
    // Находим следующий уровень
    const nextLevelResult = await pool.query(`
      SELECT * FROM user_levels
      WHERE experience_required > $1
      ORDER BY level_number ASC
      LIMIT 1
    `, [userExperience]);
    
    res.json({
      current_level: levelResult.rows[0] || null,
      next_level: nextLevelResult.rows[0] || null,
      current_xp: userExperience
    });
  } catch (error) {
    console.error('Ошибка получения уровня пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
