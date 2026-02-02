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

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath;
    if (file.fieldname === 'cover') {
      uploadPath = path.join(__dirname, '../uploads/music/covers');
    } else if (file.fieldname === 'audio') {
      uploadPath = path.join(__dirname, '../uploads/music/audio');
    } else {
      uploadPath = path.join(__dirname, '../uploads/music');
    }
    
    // Создаем директорию если не существует
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB максимум
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'cover') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Обложка должна быть изображением'), false);
      }
    } else if (file.fieldname === 'audio') {
      if (file.mimetype.startsWith('audio/') || file.originalname.match(/\.(mp3|wav|ogg|m4a|flac)$/i)) {
        cb(null, true);
      } else {
        cb(new Error('Файл должен быть аудио'), false);
      }
    } else {
      cb(null, true);
    }
  }
});

// Получить все треки
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, u.username as created_by_name
      FROM music m
      LEFT JOIN users u ON m.created_by = u.id
      ORDER BY m.created_at DESC
    `);
    
    res.json({ tracks: result.rows });
  } catch (error) {
    console.error('Ошибка получения музыки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить один трек
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT m.*, u.username as created_by_name
      FROM music m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Трек не найден' });
    }
    
    res.json({ track: result.rows[0] });
  } catch (error) {
    console.error('Ошибка получения трека:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Добавить новый трек (только админ)
router.post('/', authenticate, requireAdmin, upload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, artist, duration, lyrics } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Название обязательно' });
    }
    
    if (!req.files || !req.files.audio) {
      return res.status(400).json({ error: 'Аудио файл обязателен' });
    }
    
    const audioFile = req.files.audio[0];
    const coverFile = req.files.cover ? req.files.cover[0] : null;
    
    const fileUrl = `/uploads/music/audio/${audioFile.filename}`;
    const coverUrl = coverFile ? `/uploads/music/covers/${coverFile.filename}` : null;
    
    const result = await pool.query(`
      INSERT INTO music (title, artist, cover_url, duration, lyrics, file_url, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      title,
      artist || null,
      coverUrl,
      parseInt(duration) || 0,
      lyrics || null,
      fileUrl,
      req.user.id
    ]);
    
    res.status(201).json({ 
      message: 'Трек успешно добавлен',
      track: result.rows[0] 
    });
  } catch (error) {
    console.error('Ошибка добавления трека:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить трек (только админ)
router.put('/:id', authenticate, requireAdmin, upload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, artist, duration, lyrics } = req.body;
    
    // Получаем текущий трек
    const currentTrack = await pool.query('SELECT * FROM music WHERE id = $1', [id]);
    if (currentTrack.rows.length === 0) {
      return res.status(404).json({ error: 'Трек не найден' });
    }
    
    const track = currentTrack.rows[0];
    
    // Определяем новые значения
    let fileUrl = track.file_url;
    let coverUrl = track.cover_url;
    
    if (req.files && req.files.audio) {
      // Удаляем старый файл
      const oldAudioPath = path.join(__dirname, '..', track.file_url);
      if (fs.existsSync(oldAudioPath)) {
        fs.unlinkSync(oldAudioPath);
      }
      fileUrl = `/uploads/music/audio/${req.files.audio[0].filename}`;
    }
    
    if (req.files && req.files.cover) {
      // Удаляем старую обложку
      if (track.cover_url) {
        const oldCoverPath = path.join(__dirname, '..', track.cover_url);
        if (fs.existsSync(oldCoverPath)) {
          fs.unlinkSync(oldCoverPath);
        }
      }
      coverUrl = `/uploads/music/covers/${req.files.cover[0].filename}`;
    }
    
    const result = await pool.query(`
      UPDATE music 
      SET title = $1, artist = $2, cover_url = $3, duration = $4, lyrics = $5, file_url = $6, updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [
      title || track.title,
      artist !== undefined ? artist : track.artist,
      coverUrl,
      duration !== undefined ? parseInt(duration) : track.duration,
      lyrics !== undefined ? lyrics : track.lyrics,
      fileUrl,
      id
    ]);
    
    res.json({ 
      message: 'Трек обновлен',
      track: result.rows[0] 
    });
  } catch (error) {
    console.error('Ошибка обновления трека:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить трек (только админ)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Получаем трек для удаления файлов
    const track = await pool.query('SELECT * FROM music WHERE id = $1', [id]);
    if (track.rows.length === 0) {
      return res.status(404).json({ error: 'Трек не найден' });
    }
    
    const trackData = track.rows[0];
    
    // Удаляем файлы
    if (trackData.file_url) {
      const audioPath = path.join(__dirname, '..', trackData.file_url);
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
    }
    
    if (trackData.cover_url) {
      const coverPath = path.join(__dirname, '..', trackData.cover_url);
      if (fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
      }
    }
    
    // Удаляем из БД
    await pool.query('DELETE FROM music WHERE id = $1', [id]);
    
    res.json({ message: 'Трек удален' });
  } catch (error) {
    console.error('Ошибка удаления трека:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить треки с информацией о лайках пользователя
router.get('/user/library', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT m.*, u.username as created_by_name,
        CASE WHEN ml.id IS NOT NULL THEN true ELSE false END as is_liked,
        (SELECT COUNT(*) FROM music_likes WHERE music_id = m.id) as likes_count
      FROM music m
      LEFT JOIN users u ON m.created_by = u.id
      LEFT JOIN music_likes ml ON m.id = ml.music_id AND ml.user_id = $1
      ORDER BY m.created_at DESC
    `, [userId]);
    
    res.json({ tracks: result.rows });
  } catch (error) {
    console.error('Ошибка получения библиотеки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить только лайкнутые треки
router.get('/user/liked', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT m.*, u.username as created_by_name,
        true as is_liked,
        (SELECT COUNT(*) FROM music_likes WHERE music_id = m.id) as likes_count
      FROM music m
      JOIN music_likes ml ON m.id = ml.music_id AND ml.user_id = $1
      LEFT JOIN users u ON m.created_by = u.id
      ORDER BY ml.created_at DESC
    `, [userId]);
    
    res.json({ tracks: result.rows });
  } catch (error) {
    console.error('Ошибка получения лайкнутых треков:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Лайкнуть/убрать лайк с трека
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Проверяем существование трека
    const track = await pool.query('SELECT id FROM music WHERE id = $1', [id]);
    if (track.rows.length === 0) {
      return res.status(404).json({ error: 'Трек не найден' });
    }
    
    // Проверяем, есть ли уже лайк
    const existingLike = await pool.query(
      'SELECT id FROM music_likes WHERE user_id = $1 AND music_id = $2',
      [userId, id]
    );
    
    let isLiked;
    if (existingLike.rows.length > 0) {
      // Убираем лайк
      await pool.query('DELETE FROM music_likes WHERE user_id = $1 AND music_id = $2', [userId, id]);
      isLiked = false;
    } else {
      // Добавляем лайк
      await pool.query('INSERT INTO music_likes (user_id, music_id) VALUES ($1, $2)', [userId, id]);
      isLiked = true;
    }
    
    // Получаем общее количество лайков
    const likesCount = await pool.query(
      'SELECT COUNT(*) FROM music_likes WHERE music_id = $1',
      [id]
    );
    
    res.json({ 
      isLiked, 
      likesCount: parseInt(likesCount.rows[0].count) 
    });
  } catch (error) {
    console.error('Ошибка лайка трека:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
