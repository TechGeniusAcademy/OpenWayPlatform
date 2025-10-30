import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  try {
    console.log('📝 Применение миграции категорий...');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'create_game_categories.sql'),
      'utf8'
    );
    
    await pool.query(migrationSQL);
    
    console.log('✅ Миграция категорий применена успешно!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при применении миграции:', error);
    process.exit(1);
  }
}

applyMigration();
