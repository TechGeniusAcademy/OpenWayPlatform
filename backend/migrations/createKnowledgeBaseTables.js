import pool from '../config/database.js';

async function createKnowledgeBaseTables() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Таблица категорий
    await client.query(`
      CREATE TABLE IF NOT EXISTS kb_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(10) DEFAULT '📚',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      )
    `);

    // Таблица статей
    await client.query(`
      CREATE TABLE IF NOT EXISTS kb_articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        category_id INTEGER REFERENCES kb_categories(id) ON DELETE CASCADE,
        description TEXT,
        content TEXT NOT NULL,
        published BOOLEAN DEFAULT true,
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      )
    `);

    // Индексы
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_kb_articles_category 
      ON kb_articles(category_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_kb_articles_published 
      ON kb_articles(published)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_kb_articles_deleted 
      ON kb_articles(deleted_at)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_kb_categories_deleted 
      ON kb_categories(deleted_at)
    `);

    await client.query('COMMIT');
    console.log('✅ Таблицы базы знаний успешно созданы');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка создания таблиц базы знаний:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default createKnowledgeBaseTables;
