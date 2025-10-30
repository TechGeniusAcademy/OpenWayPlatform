import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function applyMigration() {
  try {
    console.log('🎰 Применение миграции для рулетки...');
    
    const migrationPath = path.join(__dirname, 'migrations', 'create_roulette_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(migrationSQL);
    
    console.log('✅ Миграция рулетки успешно применена!');
    console.log('✅ Таблицы созданы:');
    console.log('   - roulette_games');
    console.log('   - roulette_bets');
    console.log('   - roulette_history');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка применения миграции:', error);
    await pool.end();
    process.exit(1);
  }
}

applyMigration();
