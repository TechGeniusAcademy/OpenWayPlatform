import pool from './config/database.js';

async function addColumn() {
  try {
    console.log('📝 Добавление колонки total_questions в quiz_battles...');
    
    await pool.query(`
      ALTER TABLE quiz_battles 
      ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0
    `);
    
    console.log('✅ Колонка total_questions добавлена успешно!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при добавлении колонки:', error);
    process.exit(1);
  }
}

addColumn();
