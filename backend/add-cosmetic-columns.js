import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hakaton_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345',
});

async function addCosmeticColumns() {
  try {
    // Добавляем колонки для косметики (если они еще не существуют)
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS banner_url TEXT,
      ADD COLUMN IF NOT EXISTS avatar_frame TEXT
    `);
    console.log('✅ Колонки banner_url и avatar_frame добавлены в таблицу users');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await pool.end();
  }
}

addCosmeticColumns();
