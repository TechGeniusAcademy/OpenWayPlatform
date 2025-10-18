import pool from '../config/database.js';

class GameQuestion {
  // Получить все вопросы
  static async getAll() {
    const result = await pool.query(
      'SELECT * FROM game_questions ORDER BY created_at DESC'
    );
    return result.rows;
  }

  // Получить вопрос по ID
  static async getById(id) {
    const result = await pool.query(
      'SELECT * FROM game_questions WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  // Создать вопрос
  static async create(questionData) {
    const { question, category, difficulty, created_by } = questionData;
    
    const result = await pool.query(
      `INSERT INTO game_questions (question, category, difficulty, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [question, category, difficulty || 'medium', created_by]
    );
    
    return result.rows[0];
  }

  // Обновить вопрос
  static async update(id, questionData) {
    const { question, category, difficulty } = questionData;
    
    const result = await pool.query(
      `UPDATE game_questions 
       SET question = $1, category = $2, difficulty = $3
       WHERE id = $4
       RETURNING *`,
      [question, category, difficulty, id]
    );
    
    return result.rows[0];
  }

  // Удалить вопрос
  static async delete(id) {
    await pool.query('DELETE FROM game_questions WHERE id = $1', [id]);
  }

  // Получить случайный вопрос, не использованный в сессии
  static async getRandomForSession(sessionId, difficulty = null) {
    try {
      let query = `
        SELECT gq.* 
        FROM game_questions gq
        WHERE gq.id NOT IN (
          SELECT DISTINCT gr.question_id
          FROM game_rounds gr
          WHERE gr.session_id = $1 AND gr.question_id IS NOT NULL
        )
      `;
      
      let params = [sessionId];
      
      if (difficulty) {
        query += ' AND gq.difficulty = $2';
        params.push(difficulty);
      }
      
      query += ' ORDER BY RANDOM() LIMIT 1';
      
      const result = await pool.query(query, params);
      return result.rows[0];
    } catch (error) {
      // Если ошибка (например, колонка question_id не существует), возвращаем null
      console.error('Ошибка в getRandomForSession:', error.message);
      return null;
    }
  }

  // Получить случайный вопрос (старый метод для совместимости)
  static async getRandom(difficulty = null) {
    let query = 'SELECT * FROM game_questions';
    let params = [];
    
    if (difficulty) {
      query += ' WHERE difficulty = $1';
      params = [difficulty];
    }
    
    query += ' ORDER BY RANDOM() LIMIT 1';
    
    const result = await pool.query(query, params);
    return result.rows[0];
  }

  // Получить вопросы по категории
  static async getByCategory(category) {
    const result = await pool.query(
      'SELECT * FROM game_questions WHERE category = $1 ORDER BY created_at DESC',
      [category]
    );
    return result.rows;
  }

  // Получить статистику вопросов
  static async getStatistics() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN difficulty = 'easy' THEN 1 END) as easy,
        COUNT(CASE WHEN difficulty = 'medium' THEN 1 END) as medium,
        COUNT(CASE WHEN difficulty = 'hard' THEN 1 END) as hard,
        COUNT(DISTINCT category) as categories
      FROM game_questions
    `);
    
    return result.rows[0];
  }
}

export default GameQuestion;
