import pool from './config/database.js';
import fs from 'fs/promises';

async function applyCasinoMigration() {
  try {
    const sql = await fs.readFile('./migrations/create_casino_games.sql', 'utf8');
    await pool.query(sql);
    console.log('✅ Casino games table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

applyCasinoMigration();
