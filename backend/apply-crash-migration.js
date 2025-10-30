import pool from './config/database.js';

console.log('📝 Применение миграции для Crash игры...');

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Создание таблицы crash_games...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS crash_games (
        id SERIAL PRIMARY KEY,
        crash_point DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'waiting',
        current_multiplier DECIMAL(10, 2) DEFAULT 1.00,
        started_at TIMESTAMP,
        crashed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('Создание таблицы crash_bets...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS crash_bets (
        id SERIAL PRIMARY KEY,
        game_id INTEGER REFERENCES crash_games(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        bet_amount INTEGER NOT NULL,
        cashout_multiplier DECIMAL(10, 2),
        win_amount INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        cashed_out_at TIMESTAMP
      );
    `);
    
    console.log('Создание таблицы crash_history...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS crash_history (
        id SERIAL PRIMARY KEY,
        game_id INTEGER REFERENCES crash_games(id),
        crash_point DECIMAL(10, 2),
        total_bets INTEGER DEFAULT 0,
        total_wagered INTEGER DEFAULT 0,
        total_payout INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('Создание индексов...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_crash_games_status ON crash_games(status);
      CREATE INDEX IF NOT EXISTS idx_crash_games_created ON crash_games(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_crash_bets_game ON crash_bets(game_id);
      CREATE INDEX IF NOT EXISTS idx_crash_bets_user ON crash_bets(user_id);
      CREATE INDEX IF NOT EXISTS idx_crash_bets_status ON crash_bets(status);
      CREATE INDEX IF NOT EXISTS idx_crash_history_created ON crash_history(created_at DESC);
    `);
    
    await client.query('COMMIT');
    console.log('✅ Миграция для Crash игры применена успешно!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка при применении миграции:', error);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

applyMigration();
