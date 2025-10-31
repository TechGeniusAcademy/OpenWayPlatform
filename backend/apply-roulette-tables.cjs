const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'openway_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'openway_platform',
  password: process.env.DB_PASSWORD || 'admin',
  port: process.env.DB_PORT || 5432,
});

async function applyMigration() {
  try {
    console.log('🔄 Применение миграции для таблиц рулетки...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'migrations', 'create_roulette_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    await pool.query(sql);

    console.log('✅ Миграция успешно применена!');
    console.log('📊 Созданы таблицы:');
    console.log('   - roulette_games');
    console.log('   - roulette_bets');
    console.log('   - roulette_history');

    // Verify tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'roulette%'
      ORDER BY table_name;
    `);

    console.log('\n✅ Проверка таблиц:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

  } catch (error) {
    console.error('❌ Ошибка применения миграции:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
