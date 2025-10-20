import pool from '../config/database.js';

class Chat {
  // Создать или получить приватный чат между двумя пользователями
  static async getOrCreatePrivateChat(userId1, userId2) {
    try {
      // Проверяем существует ли уже чат между этими пользователями
      const existingChat = await pool.query(
        `SELECT c.* FROM chats c
         INNER JOIN chat_participants cp1 ON c.id = cp1.chat_id AND cp1.user_id = $1
         INNER JOIN chat_participants cp2 ON c.id = cp2.chat_id AND cp2.user_id = $2
         WHERE c.type = 'private'
         LIMIT 1`,
        [userId1, userId2]
      );

      if (existingChat.rows.length > 0) {
        return existingChat.rows[0];
      }

      // Создаем новый приватный чат
      const newChat = await pool.query(
        `INSERT INTO chats (type) VALUES ('private') RETURNING *`
      );

      const chatId = newChat.rows[0].id;

      // Добавляем участников
      await pool.query(
        `INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2), ($1, $3)`,
        [chatId, userId1, userId2]
      );

      return newChat.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Получить или создать групповой чат для группы
  static async getOrCreateGroupChat(groupId) {
    try {
      // Проверяем существует ли чат для этой группы
      const existingChat = await pool.query(
        `SELECT * FROM chats WHERE type = 'group' AND group_id = $1`,
        [groupId]
      );

      if (existingChat.rows.length > 0) {
        return existingChat.rows[0];
      }

      // Создаем новый групповой чат
      const groupInfo = await pool.query(
        `SELECT name FROM groups WHERE id = $1`,
        [groupId]
      );

      const newChat = await pool.query(
        `INSERT INTO chats (type, group_id, name) 
         VALUES ('group', $1, $2) 
         RETURNING *`,
        [groupId, `Группа: ${groupInfo.rows[0]?.name || 'Без названия'}`]
      );

      // Добавляем всех участников группы в чат
      await pool.query(
        `INSERT INTO chat_participants (chat_id, user_id)
         SELECT $1, id FROM users WHERE group_id = $2 AND role = 'student'`,
        [newChat.rows[0].id, groupId]
      );

      return newChat.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Получить все чаты пользователя
  static async getUserChats(userId) {
    try {
      const result = await pool.query(
        `SELECT 
          c.id,
          c.type,
          c.name,
          c.group_id,
          cp.is_pinned,
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
          (
            SELECT COUNT(*) FROM messages 
            WHERE chat_id = c.id 
            AND sender_id != $1
            AND created_at > COALESCE((
              SELECT last_read_at FROM chat_participants 
              WHERE chat_id = c.id AND user_id = $1
            ), '1970-01-01')
          ) as unread_count,
          CASE 
            WHEN c.type = 'private' THEN (
              SELECT json_build_object(
                'id', u.id,
                'username', u.username,
                'full_name', u.full_name,
                'avatar_url', u.avatar_url,
                'avatar_frame', u.avatar_frame,
                'username_style', u.username_style,
                'message_color', u.message_color
              )
              FROM chat_participants cp2
              INNER JOIN users u ON cp2.user_id = u.id
              WHERE cp2.chat_id = c.id AND cp2.user_id != $1
              LIMIT 1
            )
            ELSE NULL
          END as other_user
         FROM chats c
         INNER JOIN chat_participants cp ON c.id = cp.chat_id
         WHERE cp.user_id = $1
         ORDER BY cp.is_pinned DESC, c.updated_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Закрепить/открепить чат
  static async togglePinChat(chatId, userId) {
    try {
      const result = await pool.query(
        `UPDATE chat_participants 
         SET is_pinned = NOT is_pinned 
         WHERE chat_id = $1 AND user_id = $2
         RETURNING is_pinned`,
        [chatId, userId]
      );

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Добавить участника в групповой чат
  static async addParticipant(chatId, userId) {
    try {
      const result = await pool.query(
        `INSERT INTO chat_participants (chat_id, user_id) 
         VALUES ($1, $2) 
         ON CONFLICT (chat_id, user_id) DO NOTHING
         RETURNING *`,
        [chatId, userId]
      );

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

export default Chat;
