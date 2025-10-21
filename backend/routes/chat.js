import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Настройка хранилища файлов
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'uploads', 'chat-files');

// Создаем директорию если её нет
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// Скачать файл (БЕЗ аутентификации, т.к. браузер не отправляет токены при скачивании)
router.get('/files/*', async (req, res) => {
  try {
    // req.path будет '/files/uploads/chat-files/filename'
    // Убираем '/files/' в начале, чтобы получить 'uploads/chat-files/filename'
    const relativePath = req.path.replace('/files/', '');
    const filePath = path.join(__dirname, '..', relativePath);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    const fileName = path.basename(filePath);
    const originalFileName = fileName.split('-').slice(2).join('-'); // Убираем timestamp-random префикс

    // Устанавливаем заголовки для принудительного скачивания
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalFileName)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Отправляем файл
    res.sendFile(filePath);
  } catch (error) {
    console.error('Ошибка скачивания файла:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Все маршруты ниже требуют аутентификации
router.use(authenticate);

// Получить все чаты (только для админов)
router.get('/admin/all', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const result = await pool.query(
      `SELECT 
        c.id,
        c.type,
        c.name,
        c.group_id,
        (
          SELECT json_build_object(
            'id', m.id,
            'content', m.content,
            'message_type', m.message_type,
            'sender_id', m.sender_id,
            'sender_name', u.full_name,
            'created_at', m.created_at
          )
          FROM messages m
          INNER JOIN users u ON m.sender_id = u.id
          WHERE m.chat_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) as last_message,
        (SELECT COUNT(*) FROM messages WHERE chat_id = c.id) as message_count
       FROM chats c
       ORDER BY c.updated_at DESC`
    );

    res.json({ chats: result.rows });
  } catch (error) {
    console.error('Ошибка получения всех чатов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить количество непрочитанных сообщений
router.get('/unread-count', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COALESCE(SUM(
        CASE 
          WHEN cp.last_read_at IS NULL THEN 
            (SELECT COUNT(*) FROM messages WHERE chat_id = cp.chat_id AND sender_id != $1)
          ELSE 
            (SELECT COUNT(*) FROM messages WHERE chat_id = cp.chat_id AND sender_id != $1 AND created_at > cp.last_read_at)
        END
      ), 0) as unread_count
      FROM chat_participants cp
      WHERE cp.user_id = $1`,
      [req.user.id]
    );
    
    const unreadCount = parseInt(result.rows[0]?.unread_count || 0);
    res.json({ unreadCount });
  } catch (error) {
    console.error('Ошибка получения количества непрочитанных:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить все чаты пользователя
router.get('/', async (req, res) => {
  try {
    const chats = await Chat.getUserChats(req.user.id);
    res.json({ chats });
  } catch (error) {
    console.error('Ошибка получения чатов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создать или получить приватный чат
router.post('/private', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId обязателен' });
    }

    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'Нельзя создать чат с самим собой' });
    }

    const chat = await Chat.getOrCreatePrivateChat(req.user.id, userId);
    res.json({ chat });
  } catch (error) {
    console.error('Ошибка создания приватного чата:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить или создать групповой чат
router.post('/group', async (req, res) => {
  try {
    const { groupId } = req.body;

    if (!groupId) {
      return res.status(400).json({ error: 'groupId обязателен' });
    }

    // Проверяем что пользователь состоит в этой группе
    if (req.user.role === 'student' && req.user.group_id !== parseInt(groupId)) {
      return res.status(403).json({ error: 'Вы не состоите в этой группе' });
    }

    const chat = await Chat.getOrCreateGroupChat(groupId);
    res.json({ chat });
  } catch (error) {
    console.error('Ошибка создания группового чата:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить сообщения чата
router.get('/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const messages = await Message.getChatMessages(chatId, limit, offset);
    res.json({ messages });
  } catch (error) {
    console.error('Ошибка получения сообщений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Отметить сообщения как прочитанные
router.put('/:chatId/mark-read', async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    await pool.query(
      `UPDATE chat_participants 
       SET last_read_at = NOW() 
       WHERE chat_id = $1 AND user_id = $2`,
      [chatId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка при пометке сообщений как прочитанные:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить закрепленные сообщения
router.get('/:chatId/pinned', async (req, res) => {
  try {
    const { chatId } = req.params;
    const pinnedMessages = await Message.getPinnedMessages(chatId);
    res.json({ messages: pinnedMessages });
  } catch (error) {
    console.error('Ошибка получения закрепленных сообщений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Отправить текстовое сообщение
router.post('/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, messageType, codeLanguage } = req.body;

    if (!content && messageType !== 'file') {
      return res.status(400).json({ error: 'Содержимое сообщения обязательно' });
    }

    const message = await Message.create({
      chatId,
      senderId: req.user.id,
      content,
      messageType: messageType || 'text',
      codeLanguage
    });

    // Получаем полное сообщение с данными отправителя
    const pool = (await import('../config/database.js')).default;
    const fullMessageResult = await pool.query(
      `SELECT 
        m.*,
        u.username as sender_username,
        u.full_name as sender_full_name,
        u.avatar_url as sender_avatar_url,
        u.avatar_frame as sender_avatar_frame,
        u.username_style as sender_username_style,
        u.message_color as sender_message_color
       FROM messages m
       INNER JOIN users u ON m.sender_id = u.id
       WHERE m.id = $1`,
      [message.id]
    );

    const fullMessage = fullMessageResult.rows[0];

    res.status(201).json({ message: fullMessage });
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Загрузить файл
router.post('/:chatId/upload', upload.single('file'), async (req, res) => {
  try {
    const { chatId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const message = await Message.create({
      chatId,
      senderId: req.user.id,
      content: req.body.caption || '',
      messageType: 'file',
      fileName: file.originalname,
      filePath: `/uploads/chat-files/${file.filename}`,
      fileSize: file.size
    });

    // Получаем полное сообщение с данными отправителя
    const pool = (await import('../config/database.js')).default;
    const fullMessageResult = await pool.query(
      `SELECT 
        m.*,
        u.username as sender_username,
        u.full_name as sender_full_name,
        u.avatar_url as sender_avatar_url,
        u.avatar_frame as sender_avatar_frame,
        u.username_style as sender_username_style,
        u.message_color as sender_message_color
       FROM messages m
       INNER JOIN users u ON m.sender_id = u.id
       WHERE m.id = $1`,
      [message.id]
    );

    const fullMessage = fullMessageResult.rows[0];

    res.status(201).json({ message: fullMessage });
  } catch (error) {
    console.error('Ошибка загрузки файла:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Закрепить/открепить сообщение
router.put('/messages/:messageId/pin', async (req, res) => {
  try {
    const { messageId } = req.params;

    // Только админы могут закреплять сообщения в групповых чатах
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Только администраторы могут закреплять сообщения' });
    }

    const message = await Message.togglePin(messageId, req.user.id);

    if (!message) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }

    res.json({ message });
  } catch (error) {
    console.error('Ошибка закрепления сообщения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Закрепить/открепить чат
router.put('/:chatId/pin', async (req, res) => {
  try {
    const { chatId } = req.params;
    const result = await Chat.togglePinChat(chatId, req.user.id);
    res.json({ is_pinned: result.is_pinned });
  } catch (error) {
    console.error('Ошибка закрепления чата:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удалить сообщение
router.delete('/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.delete(messageId, req.user.id);

    if (!message) {
      return res.status(404).json({ error: 'Сообщение не найдено или у вас нет прав на удаление' });
    }

    // Удаляем файл если это файловое сообщение
    if (message.message_type === 'file' && message.file_path) {
      const filePath = path.join(__dirname, '..', message.file_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({ message: 'Сообщение удалено' });
  } catch (error) {
    console.error('Ошибка удаления сообщения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
