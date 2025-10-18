import pool from '../config/database.js';

class GameRound {
  // Создать новый раунд
  static async create(sessionId, roundNumber, team, cardId, questionId, question, timeLimit = 60) {
    const result = await pool.query(
      `INSERT INTO game_rounds (session_id, round_number, team, card_id, question_id, question, time_limit, started_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [sessionId, roundNumber, team, cardId, questionId, question, timeLimit]
    );
    
    return result.rows[0];
  }

  // Получить раунд по ID
  static async getById(id) {
    const result = await pool.query(
      `SELECT gr.*, gc.name as card_name, gc.description as card_description,
              gc.card_type, gc.effect_value, gc.image_url as card_image
       FROM game_rounds gr
       LEFT JOIN game_cards gc ON gr.card_id = gc.id
       WHERE gr.id = $1`,
      [id]
    );
    
    return result.rows[0];
  }

  // Получить все раунды сессии
  static async getBySession(sessionId) {
    const result = await pool.query(
      `SELECT gr.*, gc.name as card_name, gc.card_type
       FROM game_rounds gr
       LEFT JOIN game_cards gc ON gr.card_id = gc.id
       WHERE gr.session_id = $1
       ORDER BY gr.round_number ASC`,
      [sessionId]
    );
    
    return result.rows;
  }

  // Получить текущий активный раунд
  static async getCurrentRound(sessionId) {
    const result = await pool.query(
      `SELECT gr.*, gc.name as card_name, gc.description as card_description,
              gc.card_type, gc.effect_value, gc.image_url as card_image
       FROM game_rounds gr
       LEFT JOIN game_cards gc ON gr.card_id = gc.id
       WHERE gr.session_id = $1 AND gr.status = 'pending'
       ORDER BY gr.round_number DESC
       LIMIT 1`,
      [sessionId]
    );
    
    return result.rows[0];
  }

  // Завершить раунд (правильный ответ)
  static async answerCorrect(roundId, answer, pointsAwarded) {
    const result = await pool.query(
      `UPDATE game_rounds 
       SET status = 'answered_correct', answer = $1, points_awarded = $2, answered_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [answer, pointsAwarded, roundId]
    );
    
    return result.rows[0];
  }

  // Завершить раунд (неправильный ответ)
  static async answerWrong(roundId, answer, pointsAwarded) {
    const result = await pool.query(
      `UPDATE game_rounds 
       SET status = 'answered_wrong', answer = $1, points_awarded = $2, answered_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [answer, pointsAwarded, roundId]
    );
    
    return result.rows[0];
  }

  // Пропустить раунд
  static async skip(roundId) {
    const result = await pool.query(
      `UPDATE game_rounds 
       SET status = 'skipped', answered_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [roundId]
    );
    
    return result.rows[0];
  }

  // Передать вопрос другой команде
  static async transfer(roundId, newTeam) {
    const result = await pool.query(
      `UPDATE game_rounds 
       SET status = 'transferred', team = $1
       WHERE id = $2
       RETURNING *`,
      [newTeam, roundId]
    );
    
    return result.rows[0];
  }

  // Получить статистику раундов
  static async getStatistics(sessionId) {
    const result = await pool.query(
      `SELECT 
        team,
        COUNT(*) as total_rounds,
        COUNT(CASE WHEN status = 'answered_correct' THEN 1 END) as correct_answers,
        COUNT(CASE WHEN status = 'answered_wrong' THEN 1 END) as wrong_answers,
        COUNT(CASE WHEN status = 'skipped' THEN 1 END) as skipped,
        SUM(points_awarded) as total_points
       FROM game_rounds
       WHERE session_id = $1
       GROUP BY team`,
      [sessionId]
    );
    
    return result.rows;
  }
}

export default GameRound;
