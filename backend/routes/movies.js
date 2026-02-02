import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import pool from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Путь для хранения видео на дополнительном диске
const VIDEOS_PATH = process.env.NODE_ENV === 'production' 
  ? '/mnt/storage/movies/videos'
  : path.join(__dirname, '../uploads/movies/videos');

const COVERS_PATH = process.env.NODE_ENV === 'production'
  ? '/mnt/storage/movies/covers'
  : path.join(__dirname, '../uploads/movies/covers');

// Создаем директории если не существуют
[VIDEOS_PATH, COVERS_PATH].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Настройка multer для загрузки обложек
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, COVERS_PATH);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cover-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Настройка multer для загрузки видео
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, VIDEOS_PATH);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'movie-' + uniqueSuffix + ext);
  }
});

// Мультизагрузка: обложка + видео
const uploadFields = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === 'cover') {
        cb(null, COVERS_PATH);
      } else if (file.fieldname === 'video') {
        cb(null, VIDEOS_PATH);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname).toLowerCase();
      if (file.fieldname === 'cover') {
        cb(null, 'cover-' + uniqueSuffix + ext);
      } else {
        cb(null, 'movie-' + uniqueSuffix + ext);
      }
    }
  }),
  limits: { 
    fileSize: 10 * 1024 * 1024 * 1024 // 10GB для видео
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'cover') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Обложка должна быть изображением'), false);
      }
    } else if (file.fieldname === 'video') {
      const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Недопустимый формат видео. Разрешены: mp4, webm, ogg, mov, avi, mkv'), false);
      }
    } else {
      cb(null, true);
    }
  }
}).fields([
  { name: 'cover', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]);

// Инициализация таблицы
const initMoviesTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS movies (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        video_url TEXT,
        video_file TEXT,
        cover_url TEXT,
        year INTEGER,
        genre VARCHAR(100),
        duration INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Добавляем колонку video_file если её нет
    await pool.query(`
      ALTER TABLE movies ADD COLUMN IF NOT EXISTS video_file TEXT
    `);
    
    console.log('Таблица movies готова');
  } catch (error) {
    console.error('Ошибка создания таблицы movies:', error);
  }
};

initMoviesTable();

// Получить все фильмы (для админа)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, u.username as created_by_name
      FROM movies m
      LEFT JOIN users u ON m.created_by = u.id
      ORDER BY m.created_at DESC
    `);
    
    res.json({ movies: result.rows });
  } catch (error) {
    console.error('Ошибка получения фильмов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить активные фильмы (для пользователей)
router.get('/library', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, description, video_url, video_file, cover_url, year, genre, duration
      FROM movies
      WHERE is_active = true
      ORDER BY created_at DESC
    `);
    
    res.json({ movies: result.rows });
  } catch (error) {
    console.error('Ошибка получения фильмов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить один фильм
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT * FROM movies WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Фильм не найден' });
    }
    
    res.json({ movie: result.rows[0] });
  } catch (error) {
    console.error('Ошибка получения фильма:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать фильм (только админ)
router.post('/', authenticate, requireAdmin, uploadFields, async (req, res) => {
  try {
    const { title, description, video_url, year, genre, duration } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Название обязательно' });
    }
    
    // Проверяем наличие либо ссылки, либо файла
    const videoFile = req.files?.video?.[0];
    if (!video_url && !videoFile) {
      return res.status(400).json({ error: 'Укажите ссылку на видео или загрузите файл' });
    }
    
    const coverFile = req.files?.cover?.[0];
    const coverUrl = coverFile 
      ? (process.env.NODE_ENV === 'production' 
          ? `/storage/movies/covers/${coverFile.filename}` 
          : `/uploads/movies/covers/${coverFile.filename}`)
      : null;
    
    const videoFilePath = videoFile 
      ? (process.env.NODE_ENV === 'production'
          ? `/storage/movies/videos/${videoFile.filename}`
          : `/uploads/movies/videos/${videoFile.filename}`)
      : null;
    
    const result = await pool.query(`
      INSERT INTO movies (title, description, video_url, video_file, cover_url, year, genre, duration, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      title, 
      description, 
      video_url || null, 
      videoFilePath, 
      coverUrl, 
      year || null, 
      genre || null, 
      duration || null, 
      req.user.id
    ]);
    
    res.status(201).json({ movie: result.rows[0] });
  } catch (error) {
    console.error('Ошибка создания фильма:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить фильм (только админ)
router.put('/:id', authenticate, requireAdmin, uploadFields, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, video_url, year, genre, duration, is_active } = req.body;
    
    // Получаем текущий фильм
    const currentMovie = await pool.query('SELECT * FROM movies WHERE id = $1', [id]);
    if (currentMovie.rows.length === 0) {
      return res.status(404).json({ error: 'Фильм не найден' });
    }
    
    const current = currentMovie.rows[0];
    let coverUrl = current.cover_url;
    let videoFilePath = current.video_file;
    
    const coverFile = req.files?.cover?.[0];
    const videoFile = req.files?.video?.[0];
    
    // Если загружена новая обложка
    if (coverFile) {
      // Удаляем старую обложку
      if (coverUrl) {
        const oldCoverPath = process.env.NODE_ENV === 'production'
          ? `/mnt${coverUrl}`
          : path.join(__dirname, '..', coverUrl);
        if (fs.existsSync(oldCoverPath)) {
          fs.unlinkSync(oldCoverPath);
        }
      }
      coverUrl = process.env.NODE_ENV === 'production'
        ? `/storage/movies/covers/${coverFile.filename}`
        : `/uploads/movies/covers/${coverFile.filename}`;
    }
    
    // Если загружено новое видео
    if (videoFile) {
      // Удаляем старое видео
      if (videoFilePath) {
        const oldVideoPath = process.env.NODE_ENV === 'production'
          ? `/mnt${videoFilePath}`
          : path.join(__dirname, '..', videoFilePath);
        if (fs.existsSync(oldVideoPath)) {
          fs.unlinkSync(oldVideoPath);
        }
      }
      videoFilePath = process.env.NODE_ENV === 'production'
        ? `/storage/movies/videos/${videoFile.filename}`
        : `/uploads/movies/videos/${videoFile.filename}`;
    }
    
    // Если передана ссылка, очищаем файл
    const finalVideoUrl = video_url || current.video_url;
    const finalVideoFile = video_url ? null : videoFilePath;
    
    const result = await pool.query(`
      UPDATE movies 
      SET title = $1, description = $2, video_url = $3, video_file = $4, cover_url = $5, 
          year = $6, genre = $7, duration = $8, is_active = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [
      title || current.title,
      description !== undefined ? description : current.description,
      finalVideoUrl,
      finalVideoFile,
      coverUrl,
      year || current.year,
      genre || current.genre,
      duration || current.duration,
      is_active !== undefined ? is_active : current.is_active,
      id
    ]);
    
    res.json({ movie: result.rows[0] });
  } catch (error) {
    console.error('Ошибка обновления фильма:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить фильм (только админ)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Получаем фильм для удаления файлов
    const movie = await pool.query('SELECT cover_url, video_file FROM movies WHERE id = $1', [id]);
    
    if (movie.rows.length === 0) {
      return res.status(404).json({ error: 'Фильм не найден' });
    }
    
    // Удаляем обложку
    if (movie.rows[0].cover_url) {
      const coverPath = process.env.NODE_ENV === 'production'
        ? `/mnt${movie.rows[0].cover_url}`
        : path.join(__dirname, '..', movie.rows[0].cover_url);
      if (fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
      }
    }
    
    // Удаляем видеофайл
    if (movie.rows[0].video_file) {
      const videoPath = process.env.NODE_ENV === 'production'
        ? `/mnt${movie.rows[0].video_file}`
        : path.join(__dirname, '..', movie.rows[0].video_file);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    }
    
    await pool.query('DELETE FROM movies WHERE id = $1', [id]);
    
    res.json({ message: 'Фильм удален' });
  } catch (error) {
    console.error('Ошибка удаления фильма:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Переключить статус фильма
router.patch('/:id/toggle', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE movies 
      SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Фильм не найден' });
    }
    
    res.json({ movie: result.rows[0] });
  } catch (error) {
    console.error('Ошибка переключения статуса:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Стриминг видео с поддержкой Range requests
router.get('/stream/:filename', authenticate, async (req, res) => {
  try {
    const { filename } = req.params;
    
    const videoPath = process.env.NODE_ENV === 'production'
      ? path.join('/mnt/storage/movies/videos', filename)
      : path.join(__dirname, '../uploads/movies/videos', filename);
    
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Видео не найдено' });
    }
    
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    // Определяем MIME type
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska'
    };
    const contentType = mimeTypes[ext] || 'video/mp4';
    
    if (range) {
      // Частичная загрузка (для перемотки)
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      const file = fs.createReadStream(videoPath, { start, end });
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });
      
      file.pipe(res);
    } else {
      // Полная загрузка
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
      });
      
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    console.error('Ошибка стриминга видео:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
