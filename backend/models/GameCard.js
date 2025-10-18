import pool from '../config/database.js';

class GameCard {
  // Получить все карточки
  static async getAll() {
    const result = await pool.query(
      'SELECT * FROM game_cards ORDER BY drop_chance DESC, created_at DESC'
    );
    return result.rows;
  }

  // Получить карточку по ID
  static async getById(id) {
    const result = await pool.query(
      'SELECT * FROM game_cards WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  // Создать карточку
  static async create(cardData) {
    const { name, description, image_url, card_type, effect_value, drop_chance, team, created_by } = cardData;
    
    const result = await pool.query(
      `INSERT INTO game_cards (name, description, image_url, card_type, effect_value, drop_chance, team, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, description, image_url, card_type, effect_value, drop_chance, team, created_by]
    );
    
    return result.rows[0];
  }

  // Обновить карточку
  static async update(id, cardData) {
    const { name, description, image_url, card_type, effect_value, drop_chance, team } = cardData;
    
    const result = await pool.query(
      `UPDATE game_cards 
       SET name = $1, description = $2, image_url = $3, card_type = $4, 
           effect_value = $5, drop_chance = $6, team = $7
       WHERE id = $8
       RETURNING *`,
      [name, description, image_url, card_type, effect_value, drop_chance, team, id]
    );
    
    return result.rows[0];
  }

  // Удалить карточку
  static async delete(id) {
    await pool.query('DELETE FROM game_cards WHERE id = $1', [id]);
  }

  // Получить случайную карточку (по шансам)
  static async getRandomCard() {
    // Получаем все карточки
    const result = await pool.query('SELECT * FROM game_cards ORDER BY RANDOM() LIMIT 1');
    
    if (result.rows.length === 0) return null;
    
    return result.rows[0];
  }
}

export default GameCard;
