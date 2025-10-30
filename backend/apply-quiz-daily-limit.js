import pool from './config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  try {
    console.log('📝 Применение миграции дневного лимита квиза...');
    
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add_quiz_daily_limit.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    
    console.log('✅ Миграция дневного лимита применена успешно!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при применении миграции:', error);
    process.exit(1);
  }
}

applyMigration();
