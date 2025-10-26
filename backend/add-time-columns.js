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

async function addTimeColumns() {
  try {
    await pool.query(`
      ALTER TABLE chess_games 
      ADD COLUMN IF NOT EXISTS white_time_left INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS black_time_left INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS current_turn_start TIMESTAMP
    `);
    console.log('✅ Колонки таймера добавлены в таблицу chess_games');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await pool.end();
  }
}

addTimeColumns();
