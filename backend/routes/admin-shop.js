import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';
import { authenticate, authorizeAdmin, requireTesterOrTeacherOrAdmin } from '../middleware/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Настройка multer для загрузки изображений предметов магазина
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/shop');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'shop-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Разрешены только изображения (JPEG, PNG, GIF, WebP)'));
    }
  }
});

// Получить все предметы магазина (для админа, тестера, CSS редактора)
router.get('/items', authenticate, requireTesterOrTeacherOrAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM shop_items ORDER BY item_type, created_at DESC'
    );
    res.json({ items: result.rows });
  } catch (error) {
    console.error('Ошибка получения предметов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать новый предмет
router.post('/items', authenticate, authorizeAdmin, upload.single('image'), async (req, res) => {
  try {
    const { item_type, item_key, name, description, price, required_experience } = req.body;
    
    if (!item_type || !item_key || !name || !price) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    if (!['frame', 'banner'].includes(item_type)) {
      return res.status(400).json({ error: 'Тип должен быть frame или banner' });
    }

    const image_url = req.file ? '/uploads/shop/' + req.file.filename : null;

    const result = await pool.query(
      `INSERT INTO shop_items (item_type, item_key, name, description, price, required_experience, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [item_type, item_key, name, description, parseInt(price), parseInt(required_experience) || 0, image_url]
    );

    res.json({ 
      message: 'Предмет успешно создан',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка создания предмета:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Предмет с таким ключом уже существует' });
    } else {
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
});

// Обновить предмет
router.put('/items/:id', authenticate, authorizeAdmin, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { item_type, item_key, name, description, price, required_experience } = req.body;

    // Получаем текущий предмет
    const currentItem = await pool.query('SELECT * FROM shop_items WHERE id = $1', [id]);
    
    if (currentItem.rows.length === 0) {
      return res.status(404).json({ error: 'Предмет не найден' });
    }

    let image_url = currentItem.rows[0].image_url;

    // Если загружено новое изображение, удаляем старое и сохраняем новое
    if (req.file) {
      // Удаляем старый файл
      if (image_url) {
        const oldFilePath = path.join(__dirname, '../..', image_url);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      image_url = '/uploads/shop/' + req.file.filename;
    }

    const result = await pool.query(
      `UPDATE shop_items 
       SET item_type = $1, item_key = $2, name = $3, description = $4, price = $5, required_experience = $6, image_url = $7
       WHERE id = $8
       RETURNING *`,
      [item_type, item_key, name, description, parseInt(price), parseInt(required_experience) || 0, image_url, id]
    );

    res.json({ 
      message: 'Предмет успешно обновлен',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка обновления предмета:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Предмет с таким ключом уже существует' });
    } else {
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
});

// Удалить предмет
router.delete('/items/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Получаем предмет для удаления файла
    const item = await pool.query('SELECT * FROM shop_items WHERE id = $1', [id]);
    
    if (item.rows.length === 0) {
      return res.status(404).json({ error: 'Предмет не найден' });
    }

    // Удаляем файл изображения
    if (item.rows[0].image_url) {
      const filePath = path.join(__dirname, '../..', item.rows[0].image_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Удаляем из базы данных
    await pool.query('DELETE FROM shop_items WHERE id = $1', [id]);

    res.json({ message: 'Предмет успешно удален' });
  } catch (error) {
    console.error('Ошибка удаления предмета:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
