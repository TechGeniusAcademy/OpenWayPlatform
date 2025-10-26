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

async function clearChessGames() {
  try {
    const result = await pool.query(
      "DELETE FROM chess_games WHERE status IN ('pending', 'active')"
    );
    console.log(`✅ Удалено активных шахматных игр: ${result.rowCount}`);
  } catch (error) {
    console.error('❌ Ошибка при очистке:', error);
  } finally {
    await pool.end();
  }
}

clearChessGames();
