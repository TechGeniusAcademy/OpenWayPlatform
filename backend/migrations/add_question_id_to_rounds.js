import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function migrate() {
  try {
    console.log('🔄 Начинаем миграцию: добавление question_id в game_rounds...');

    // Проверяем, существует ли уже колонка
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'game_rounds' 
      AND column_name = 'question_id'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ Колонка question_id уже существует');
    } else {
      // Добавляем колонку
      await pool.query(`
        ALTER TABLE game_rounds 
        ADD COLUMN question_id INTEGER REFERENCES game_questions(id)
      `);
      console.log('✅ Колонка question_id успешно добавлена');
    }

    console.log('✅ Миграция завершена успешно!');
  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
  } finally {
    await pool.end();
  }
}

migrate();
