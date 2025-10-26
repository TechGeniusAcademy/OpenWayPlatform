import pool from './config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  try {
    console.log('Применяем миграцию для расширенных возможностей чата...');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add_reactions_and_edit.sql'),
      'utf8'
    );

    await pool.query(migrationSQL);
    
    console.log('✅ Миграция успешно применена!');
    console.log('Добавлены:');
    console.log('- Таблица message_reactions для реакций на сообщения');
    console.log('- Поля is_edited, edited_at для редактирования сообщений');
    console.log('- Поле reply_to_id для ответов на сообщения');
    
    process.exit(0);
  } catch (error) {
    console.error('Ошибка при применении миграции:', error);
    process.exit(1);
  }
}

applyMigration();
