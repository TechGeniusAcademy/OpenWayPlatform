import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import { authenticate } from '../middleware/auth.js';
import { io } from '../server.js';

const router = express.Router();

// Настройка хранилища файлов
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'uploads', 'chat-files');

// Создаем директорию если её нет
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Декодируем имя файла из latin1 → utf8 (multer читает заголовки как latin1)
const decodeFilename = (name) => Buffer.from(name, 'latin1').toString('utf8');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    file.originalname = decodeFilename(file.originalname);
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
// Получить все чаты (для админов и CSS редакторов)
router.get('/admin/all', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'css_editor') {
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
router.get('/unread-count', authenticate, async (req, res) => {
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
router.get('/', authenticate, async (req, res) => {
  try {
    const chats = await Chat.getUserChats(req.user.id);
    res.json({ chats });
  } catch (error) {
    console.error('Ошибка получения чатов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создать или получить приватный чат
// Получить или создать приватный чат
router.post('/private', authenticate, async (req, res) => {
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
router.post('/group', authenticate, async (req, res) => {
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

    // Ensure the requesting user is a participant (handles late-added students)
    await pool.query(
      `INSERT INTO chat_participants (chat_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (chat_id, user_id) DO NOTHING`,
      [chat.id, req.user.id]
    );

    res.json({ chat });
  } catch (error) {
    console.error('Ошибка создания группового чата:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить сообщения чата
router.get('/:chatId/messages', authenticate, async (req, res) => {
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

// Получить новые сообщения после определённого ID (для polling)
router.get('/:chatId/messages/new/:afterId', authenticate, async (req, res) => {
  try {
    const { chatId, afterId } = req.params;
    
    const result = await pool.query(
      `SELECT 
        m.*,
        u.username as sender_username,
        u.full_name as sender_full_name,
        u.avatar_url as sender_avatar_url,
        u.avatar_frame as sender_avatar_frame,
        u.username_style as sender_username_style,
        u.message_color as sender_message_color,
        pinner.username as pinned_by_username,
        pinner.full_name as pinned_by_full_name,
        reply_msg.content as reply_to_content,
        reply_sender.full_name as reply_to_sender_name
       FROM messages m
       INNER JOIN users u ON m.sender_id = u.id
       LEFT JOIN users pinner ON m.pinned_by = pinner.id
       LEFT JOIN messages reply_msg ON m.reply_to_id = reply_msg.id
       LEFT JOIN users reply_sender ON reply_msg.sender_id = reply_sender.id
       WHERE m.chat_id = $1 AND m.id > $2
       ORDER BY m.created_at ASC`,
      [chatId, afterId]
    );

    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Ошибка получения новых сообщений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Отметить сообщения как прочитанные
// Отметить сообщения как прочитанные
router.put('/:chatId/mark-read', authenticate, async (req, res) => {
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
router.get('/:chatId/pinned', authenticate, async (req, res) => {
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
router.post('/:chatId/messages', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, messageType, codeLanguage, replyTo } = req.body;
    const file = req.file;

    // Если есть файл, создаем сообщение с файлом
    if (file) {
      const filePath = `/uploads/chat-files/${file.filename}`;
      
      // Определяем тип: используем переданный или определяем по MIME
      let fileMessageType = messageType || 'file';
      if (!messageType && file.mimetype.startsWith('image/')) {
        fileMessageType = 'image';
      }
      
      const message = await Message.create({
        chatId,
        senderId: req.user.id,
        content: file.originalname,
        messageType: fileMessageType,
        filePath,
        fileName: file.originalname,
        fileSize: file.size
      });

      // Получаем полное сообщение
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

      // Отправляем через WebSocket
      io.to(`chat-${chatId}`).emit('new-message', fullMessage);

      // Уведомления участникам
      const participantsResult = await pool.query(
        'SELECT user_id FROM chat_participants WHERE chat_id = $1',
        [chatId]
      );

      participantsResult.rows.forEach(participant => {
        io.to(`user-${participant.user_id}`).emit('chat-message-notification', fullMessage);
      });

      return res.status(201).json({ message: fullMessage });
    }

    // Обычное текстовое сообщение
    if (!content) {
      return res.status(400).json({ error: 'Содержимое сообщения обязательно' });
    }

    const message = await Message.create({
      chatId,
      senderId: req.user.id,
      content,
      messageType: messageType || 'text',
      codeLanguage,
      replyTo
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
        u.message_color as sender_message_color,
        reply_msg.content as reply_to_content,
        reply_sender.full_name as reply_to_sender_name
       FROM messages m
       INNER JOIN users u ON m.sender_id = u.id
       LEFT JOIN messages reply_msg ON m.reply_to_id = reply_msg.id
       LEFT JOIN users reply_sender ON reply_msg.sender_id = reply_sender.id
       WHERE m.id = $1`,
      [message.id]
    );

    const fullMessage = fullMessageResult.rows[0];

    // Отправляем сообщение через WebSocket всем участникам чата
    io.to(`chat-${chatId}`).emit('new-message', fullMessage);
    console.log(`💬 Сообщение отправлено в чат ${chatId} через WebSocket`);

    // Получаем всех участников чата для отправки уведомлений
    const participantsResult = await pool.query(
      'SELECT user_id FROM chat_participants WHERE chat_id = $1',
      [chatId]
    );

    console.log(`📨 Отправка уведомлений для чата ${chatId}:`);
    console.log(`   Участников: ${participantsResult.rows.length}`);
    console.log(`   Отправитель: ${req.user.id}`);
    
    // Отправляем уведомление всем участникам чата (включая отправителя для синхронизации)
    participantsResult.rows.forEach(participant => {
      const roomName = `user-${participant.user_id}`;
      console.log(`   🔔 Отправка в комнату: ${roomName}`);
      io.to(roomName).emit('chat-message-notification', fullMessage);
    });
    console.log(`✅ Уведомления о сообщении отправлены ${participantsResult.rows.length} участникам`);

    res.status(201).json({ message: fullMessage });
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Загрузить файл
router.post('/:chatId/upload', authenticate, upload.single('file'), async (req, res) => {
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

    // Отправляем сообщение с файлом через WebSocket всем участникам чата
    io.to(`chat-${chatId}`).emit('new-message', fullMessage);
    console.log(`📎 Файл отправлен в чат ${chatId} через WebSocket`);

    // Получаем всех участников чата для отправки уведомлений
    const participantsResult = await pool.query(
      'SELECT user_id FROM chat_participants WHERE chat_id = $1',
      [chatId]
    );

    // Отправляем уведомление всем участникам чата
    participantsResult.rows.forEach(participant => {
      io.to(`user-${participant.user_id}`).emit('chat-message-notification', fullMessage);
    });
    console.log(`🔔 Уведомления о файле отправлены ${participantsResult.rows.length} участникам`);

    res.status(201).json({ message: fullMessage });
  } catch (error) {
    console.error('Ошибка загрузки файла:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Закрепить/открепить сообщение
router.put('/messages/:messageId/pin', authenticate, async (req, res) => {
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

    // Отправляем событие через WebSocket всем участникам чата
    io.to(`chat-${message.chat_id}`).emit('message-pinned', {
      messageId: message.id,
      chatId: message.chat_id,
      isPinned: message.is_pinned
    });

    res.json({ message });
  } catch (error) {
    console.error('Ошибка закрепления сообщения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Добавить/убрать реакцию на сообщение
router.post('/messages/:messageId/reaction', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ error: 'Не указана реакция' });
    }

    // Проверяем, есть ли уже такая реакция от этого пользователя
    const existingReaction = await pool.query(
      'SELECT * FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
      [messageId, req.user.id, emoji]
    );

    if (existingReaction.rows.length > 0) {
      // Убираем реакцию
      await pool.query(
        'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
        [messageId, req.user.id, emoji]
      );
    } else {
      // Добавляем реакцию
      await pool.query(
        'INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)',
        [messageId, req.user.id, emoji]
      );
    }

    // Получаем все реакции для этого сообщения
    const reactions = await pool.query(
      `SELECT emoji, COUNT(*) as count, 
              array_agg(u.full_name) as user_names
       FROM message_reactions mr
       JOIN users u ON mr.user_id = u.id
       WHERE mr.message_id = $1
       GROUP BY emoji`,
      [messageId]
    );

    const reactionData = reactions.rows.map(r => ({
      emoji: r.emoji,
      count: parseInt(r.count),
      user_names: r.user_names
    }));

    // Получаем chat_id сообщения для отправки события
    const messageData = await pool.query(
      'SELECT chat_id FROM messages WHERE id = $1',
      [messageId]
    );

    if (messageData.rows.length > 0) {
      // Отправляем событие через WebSocket всем участникам чата
      io.to(`chat-${messageData.rows[0].chat_id}`).emit('reaction-updated', {
        messageId: parseInt(messageId),
        reactions: reactionData
      });
    }

    res.json({ reactions: reactionData });
  } catch (error) {
    console.error('Ошибка добавления реакции:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Редактировать сообщение
router.put('/messages/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Содержимое сообщения не может быть пустым' });
    }

    // Проверяем, что пользователь является автором сообщения
    const messageCheck = await pool.query(
      'SELECT * FROM messages WHERE id = $1 AND sender_id = $2',
      [messageId, req.user.id]
    );

    if (messageCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Вы можете редактировать только свои сообщения' });
    }

    // Обновляем сообщение
    const result = await pool.query(
      `UPDATE messages 
       SET content = $1, is_edited = true, edited_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [content.trim(), messageId]
    );

    res.json({ message: result.rows[0] });
  } catch (error) {
    console.error('Ошибка редактирования сообщения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Закрепить/открепить чат
router.put('/:chatId/pin', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const result = await Chat.togglePinChat(chatId, req.user.id);
    res.json({ is_pinned: result.is_pinned });
  } catch (error) {
    console.error('Ошибка закрепления чата:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удалить всю переписку (только для текущего пользователя — он покидает чат и его сообщения скрываются)
router.delete('/:chatId', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Проверяем, что пользователь является участником этого чата
    const participantCheck = await pool.query(
      'SELECT * FROM chat_participants WHERE chat_id = $1 AND user_id = $2',
      [chatId, userId]
    );
    if (participantCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Вы не являетесь участником этого чата' });
    }

    // Проверяем тип чата — групповые не удаляем, только покидаем
    const chatInfo = await pool.query('SELECT type FROM chats WHERE id = $1', [chatId]);
    if (!chatInfo.rows.length) return res.status(404).json({ error: 'Чат не найден' });
    if (chatInfo.rows[0].type === 'group') {
      return res.status(400).json({ error: 'Нельзя удалить групповой чат' });
    }

    // Удаляем все сообщения чата и сам чат (оба участника теряют переписку)
    await pool.query('DELETE FROM messages WHERE chat_id = $1', [chatId]);
    await pool.query('DELETE FROM chat_participants WHERE chat_id = $1', [chatId]);
    await pool.query('DELETE FROM chats WHERE id = $1', [chatId]);

    res.json({ ok: true });
  } catch (error) {
    console.error('Ошибка удаления чата:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удалить сообщение
// Удалить сообщение
router.delete('/messages/:messageId', authenticate, async (req, res) => {
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

// Добавить реакцию к сообщению
router.post('/messages/:messageId/reactions', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    if (!emoji) {
      return res.status(400).json({ error: 'Не указана реакция' });
    }

    // Получаем чат ID сообщения
    const messageResult = await pool.query(
      'SELECT chat_id FROM messages WHERE id = $1',
      [messageId]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }

    const chatId = messageResult.rows[0].chat_id;

    // Добавляем/удаляем реакцию
    const result = await pool.query(
      `INSERT INTO message_reactions (message_id, user_id, emoji)
       VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id, emoji) 
       DO DELETE WHERE message_reactions.message_id = $1 
         AND message_reactions.user_id = $2 
         AND message_reactions.emoji = $3
       RETURNING *`,
      [messageId, userId, emoji]
    );

    // Получаем все реакции сообщения
    const reactionsResult = await pool.query(
      `SELECT emoji, user_id, 
        (SELECT full_name FROM users WHERE id = user_id) as user_name
       FROM message_reactions 
       WHERE message_id = $1`,
      [messageId]
    );

    // Отправляем обновление через WebSocket
    io.to(`chat-${chatId}`).emit('chat:reaction-added', {
      chatId,
      messageId,
      reactions: reactionsResult.rows
    });

    res.json({ reactions: reactionsResult.rows });
  } catch (error) {
    console.error('Ошибка добавления реакции:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
