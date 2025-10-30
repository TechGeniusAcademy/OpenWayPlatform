import pool from '../config/database.js';

const QuizBattle = {
  // Создать новую битву
  async create({ creatorId, categoryId, roomCode }) {
    const result = await pool.query(
      `INSERT INTO quiz_battles (creator_id, category_id, room_code, status) 
       VALUES ($1, $2, $3, 'waiting') 
       RETURNING *`,
      [creatorId, categoryId, roomCode]
    );
    return result.rows[0];
  },

  // Получить битву по ID
  async getById(id) {
    const result = await pool.query(
      `SELECT qb.*, 
              gc.name as category_name,
              COALESCE(
                json_agg(
                  json_build_object(
                    'user_id', qbp.user_id,
                    'username', u.username,
                    'score', qbp.score,
                    'avatar_url', u.avatar_url
                  )
                ) FILTER (WHERE qbp.user_id IS NOT NULL),
                '[]'::json
              ) as players
       FROM quiz_battles qb
       LEFT JOIN game_categories gc ON qb.category_id = gc.id
       LEFT JOIN quiz_battle_players qbp ON qb.id = qbp.battle_id
       LEFT JOIN users u ON qbp.user_id = u.id
       WHERE qb.id = $1
       GROUP BY qb.id, gc.name`,
      [id]
    );
    return result.rows[0];
  },

  // Получить битву по коду комнаты
  async getByRoomCode(roomCode) {
    const result = await pool.query(
      `SELECT qb.*, 
              gc.name as category_name,
              COALESCE(
                json_agg(
                  json_build_object(
                    'user_id', qbp.user_id,
                    'username', u.username,
                    'score', qbp.score,
                    'avatar_url', u.avatar_url
                  )
                ) FILTER (WHERE qbp.user_id IS NOT NULL),
                '[]'::json
              ) as players
       FROM quiz_battles qb
       LEFT JOIN game_categories gc ON qb.category_id = gc.id
       LEFT JOIN quiz_battle_players qbp ON qb.id = qbp.battle_id
       LEFT JOIN users u ON qbp.user_id = u.id
       WHERE qb.room_code = $1
       GROUP BY qb.id, gc.name`,
      [roomCode]
    );
    return result.rows[0];
  },

  // Получить активные битвы
  async getActive() {
    const result = await pool.query(
      `SELECT qb.*, 
              u.username as creator_name,
              gc.name as category_name,
              COUNT(qbp.user_id) as player_count
       FROM quiz_battles qb
       JOIN users u ON qb.creator_id = u.id
       LEFT JOIN game_categories gc ON qb.category_id = gc.id
       LEFT JOIN quiz_battle_players qbp ON qb.id = qbp.battle_id
       WHERE qb.status IN ('waiting', 'in_progress')
       GROUP BY qb.id, u.username, gc.name
       ORDER BY qb.created_at DESC
       LIMIT 10`
    );
    return result.rows;
  },

  // Добавить игрока
  async addPlayer(battleId, userId, username) {
    const result = await pool.query(
      `INSERT INTO quiz_battle_players (battle_id, user_id, score) 
       VALUES ($1, $2, 0) 
       ON CONFLICT (battle_id, user_id) DO NOTHING
       RETURNING *`,
      [battleId, userId]
    );
    return result.rows[0];
  },

  // Обновить статус
  async updateStatus(battleId, status) {
    const result = await pool.query(
      `UPDATE quiz_battles 
       SET status = $1, updated_at = NOW()
       WHERE id = $2 
       RETURNING *`,
      [status, battleId]
    );
    return result.rows[0];
  },

  // Обновить очки игрока
  async updatePlayerScore(battleId, userId, score) {
    const result = await pool.query(
      `UPDATE quiz_battle_players 
       SET score = score + $1
       WHERE battle_id = $2 AND user_id = $3
       RETURNING *`,
      [score, battleId, userId]
    );
    return result.rows[0];
  },

  // Установить текущий вопрос
  async setCurrentQuestion(battleId, questionId) {
    const result = await pool.query(
      `UPDATE quiz_battles 
       SET current_question_id = $1, updated_at = NOW()
       WHERE id = $2 
       RETURNING *`,
      [questionId, battleId]
    );
    return result.rows[0];
  },

  // Сохранить ответ игрока
  async saveAnswer(battleId, userId, questionId, answer, isCorrect, timeSpent) {
    const result = await pool.query(
      `INSERT INTO quiz_battle_answers 
       (battle_id, user_id, question_id, answer, is_correct, time_spent) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [battleId, userId, questionId, answer, isCorrect, timeSpent]
    );
    return result.rows[0];
  },

  // Завершить битву и начислить баллы
  async finishBattle(battleId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Получить игроков и их счет
      const playersResult = await client.query(
        `SELECT user_id, score 
         FROM quiz_battle_players 
         WHERE battle_id = $1 
         ORDER BY score DESC`,
        [battleId]
      );

      const players = playersResult.rows;
      if (players.length > 0) {
        const winner = players[0];
        const winnerPoints = 100;
        const participantPoints = 50;

        // Начислить баллы победителю
        await client.query(
          `INSERT INTO points_history (user_id, points_change, reason) 
           VALUES ($1, $2, $3)`,
          [winner.user_id, winnerPoints, `Победа в Битве Знаний (+${winnerPoints} баллов)`]
        );
        
        // Обновить баланс победителя
        await client.query(
          `UPDATE users 
           SET points = COALESCE(points, 0) + $1 
           WHERE id = $2`,
          [winnerPoints, winner.user_id]
        );

        // Начислить баллы остальным участникам
        for (let i = 1; i < players.length; i++) {
          await client.query(
            `INSERT INTO points_history (user_id, points_change, reason) 
             VALUES ($1, $2, $3)`,
            [players[i].user_id, participantPoints, `Участие в Битве Знаний (+${participantPoints} баллов)`]
          );
          
          // Обновить баланс участника
          await client.query(
            `UPDATE users 
             SET points = COALESCE(points, 0) + $1 
             WHERE id = $2`,
            [participantPoints, players[i].user_id]
          );
        }
      }

      // Обновить статус битвы
      await client.query(
        `UPDATE quiz_battles 
         SET status = 'finished', finished_at = NOW() 
         WHERE id = $1`,
        [battleId]
      );

      await client.query('COMMIT');
      return players;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};

export default QuizBattle;
