import pool from '../config/database.js';

class Message {
  // Создать новое сообщение
  static async create({ chatId, senderId, content, messageType = 'text', codeLanguage, fileName, filePath, fileSize }) {
    try {
      const result = await pool.query(
        `INSERT INTO messages 
         (chat_id, sender_id, content, message_type, code_language, file_name, file_path, file_size) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
        [chatId, senderId, content, messageType, codeLanguage, fileName, filePath, fileSize]
      );

      // Обновляем время последнего обновления чата
      await pool.query(
        `UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [chatId]
      );

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Получить сообщения чата
  static async getChatMessages(chatId, limit = 50, offset = 0) {
    try {
      const result = await pool.query(
        `SELECT 
          m.*,
          u.username as sender_username,
          u.full_name as sender_full_name,
          u.avatar_url as sender_avatar_url,
          pinner.username as pinned_by_username,
          pinner.full_name as pinned_by_full_name
         FROM messages m
         INNER JOIN users u ON m.sender_id = u.id
         LEFT JOIN users pinner ON m.pinned_by = pinner.id
         WHERE m.chat_id = $1
         ORDER BY m.created_at DESC
         LIMIT $2 OFFSET $3`,
        [chatId, limit, offset]
      );

      return result.rows.reverse(); // Возвращаем в прямом порядке (старые -> новые)
    } catch (error) {
      throw error;
    }
  }

  // Получить закрепленные сообщения чата
  static async getPinnedMessages(chatId) {
    try {
      const result = await pool.query(
        `SELECT 
          m.*,
          u.username as sender_username,
          u.full_name as sender_full_name,
          u.avatar_url as sender_avatar_url,
          pinner.username as pinned_by_username,
          pinner.full_name as pinned_by_full_name
         FROM messages m
         INNER JOIN users u ON m.sender_id = u.id
         LEFT JOIN users pinner ON m.pinned_by = pinner.id
         WHERE m.chat_id = $1 AND m.is_pinned = true
         ORDER BY m.pinned_at DESC`,
        [chatId]
      );

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Закрепить/открепить сообщение (только для админов в групповых чатах)
  static async togglePin(messageId, userId) {
    try {
      const result = await pool.query(
        `UPDATE messages 
         SET 
           is_pinned = NOT is_pinned,
           pinned_by = CASE WHEN is_pinned = false THEN $2 ELSE NULL END,
           pinned_at = CASE WHEN is_pinned = false THEN CURRENT_TIMESTAMP ELSE NULL END
         WHERE id = $1
         RETURNING *`,
        [messageId, userId]
      );

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Удалить сообщение
  static async delete(messageId, userId) {
    try {
      const result = await pool.query(
        `DELETE FROM messages 
         WHERE id = $1 AND sender_id = $2
         RETURNING *`,
        [messageId, userId]
      );

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Обновить сообщение
  static async update(messageId, userId, content) {
    try {
      const result = await pool.query(
        `UPDATE messages 
         SET content = $3, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 AND sender_id = $2
         RETURNING *`,
        [messageId, userId, content]
      );

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

export default Message;
