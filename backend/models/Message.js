import pool from '../config/database.js';

class Message {
  // Создать новое сообщение
  static async create({ chatId, senderId, content, messageType = 'text', codeLanguage, fileName, filePath, fileSize, replyTo }) {
    try {
      const result = await pool.query(
        `INSERT INTO messages 
         (chat_id, sender_id, content, message_type, code_language, file_name, file_path, file_size, reply_to_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING *`,
        [chatId, senderId, content, messageType, codeLanguage, fileName, filePath, fileSize, replyTo || null]
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
         WHERE m.chat_id = $1
         ORDER BY m.created_at DESC
         LIMIT $2 OFFSET $3`,
        [chatId, limit, offset]
      );

      // Получаем реакции для всех сообщений
      const messageIds = result.rows.map(row => row.id);
      
      if (messageIds.length > 0) {
        const reactionsResult = await pool.query(
          `SELECT 
            mr.message_id,
            mr.emoji,
            COUNT(*) as count,
            array_agg(u.full_name) as user_names
           FROM message_reactions mr
           JOIN users u ON mr.user_id = u.id
           WHERE mr.message_id = ANY($1)
           GROUP BY mr.message_id, mr.emoji`,
          [messageIds]
        );

        // Группируем реакции по message_id
        const reactionsByMessage = {};
        reactionsResult.rows.forEach(reaction => {
          if (!reactionsByMessage[reaction.message_id]) {
            reactionsByMessage[reaction.message_id] = [];
          }
          reactionsByMessage[reaction.message_id].push({
            emoji: reaction.emoji,
            count: parseInt(reaction.count),
            user_names: reaction.user_names
          });
        });

        // Добавляем реакции к сообщениям
        result.rows.forEach(message => {
          message.reactions = reactionsByMessage[message.id] || [];
        });
      }

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
          u.avatar_frame as sender_avatar_frame,
          u.username_style as sender_username_style,
          u.message_color as sender_message_color,
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
      // Получаем информацию о сообщении
      const messageResult = await pool.query(
        `SELECT chat_id, is_pinned FROM messages WHERE id = $1`,
        [messageId]
      );

      if (messageResult.rows.length === 0) {
        throw new Error('Message not found');
      }

      const { chat_id, is_pinned } = messageResult.rows[0];

      // Если сообщение открепляется - просто откалываем его
      if (is_pinned) {
        const result = await pool.query(
          `UPDATE messages 
           SET is_pinned = false, pinned_by = NULL, pinned_at = NULL
           WHERE id = $1
           RETURNING *`,
          [messageId]
        );
        return result.rows[0];
      }

      // Если сообщение закрепляется - сначала открепляем все другие в этом чате
      await pool.query(
        `UPDATE messages 
         SET is_pinned = false, pinned_by = NULL, pinned_at = NULL
         WHERE chat_id = $1 AND is_pinned = true`,
        [chat_id]
      );

      // Затем закрепляем новое сообщение
      const result = await pool.query(
        `UPDATE messages 
         SET is_pinned = true, pinned_by = $2::INTEGER, pinned_at = CURRENT_TIMESTAMP
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
