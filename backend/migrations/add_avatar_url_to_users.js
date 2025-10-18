import pool from '../config/database.js';

async function addAvatarUrlToUsers() {
  try {
    console.log('Добавление поля avatar_url в таблицу users...');
    
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255)
    `);
    
    console.log('✅ Поле avatar_url успешно добавлено!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при добавлении поля:', error);
    process.exit(1);
  }
}

addAvatarUrlToUsers();
