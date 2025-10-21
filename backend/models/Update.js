import pool from '../config/database.js';

class Update {
  // Получить все обновления (для админа)
  static async getAll() {
    const result = await pool.query(
      'SELECT * FROM updates ORDER BY created_at DESC'
    );
    return result.rows;
  }

  // Получить только опубликованные обновления (для студентов)
  static async getPublished() {
    const result = await pool.query(
      'SELECT * FROM updates WHERE published = true ORDER BY created_at DESC'
    );
    return result.rows;
  }

  // Получить обновление по ID
  static async getById(id) {
    const result = await pool.query(
      'SELECT * FROM updates WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  // Создать новое обновление
  static async create(updateData) {
    const { version, title, description, content, published } = updateData;
    const result = await pool.query(
      `INSERT INTO updates (version, title, description, content, published, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [version, title, description, content, published || false]
    );
    return result.rows[0];
  }

  // Обновить обновление
  static async update(id, updateData) {
    const { version, title, description, content, published } = updateData;
    const result = await pool.query(
      `UPDATE updates 
       SET version = $1, title = $2, description = $3, content = $4, 
           published = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [version, title, description, content, published, id]
    );
    return result.rows[0];
  }

  // Удалить обновление
  static async delete(id) {
    await pool.query('DELETE FROM updates WHERE id = $1', [id]);
  }

  // Получить последнее опубликованное обновление
  static async getLatest() {
    const result = await pool.query(
      'SELECT * FROM updates WHERE published = true ORDER BY created_at DESC LIMIT 1'
    );
    return result.rows[0];
  }
}

export default Update;
