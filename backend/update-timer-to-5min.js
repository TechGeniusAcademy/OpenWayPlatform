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

async function updateTimers() {
  try {
    // Обновляем все активные игры на новую систему (5 минут = 300 секунд)
    await pool.query(`
      UPDATE chess_games 
      SET white_time_left = 300, 
          black_time_left = 300,
          current_turn_start = NOW()
      WHERE status = 'active'
    `);
    console.log('✅ Таймеры обновлены до 5 минут (300 секунд) для всех активных игр');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await pool.end();
  }
}

updateTimers();
