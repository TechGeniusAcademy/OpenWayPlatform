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

async function addBetColumn() {
  try {
    await pool.query(`
      ALTER TABLE chess_games 
      ADD COLUMN IF NOT EXISTS bet_amount INTEGER DEFAULT 0
    `);
    console.log('✅ Колонка bet_amount добавлена в таблицу chess_games');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await pool.end();
  }
}

addBetColumn();
