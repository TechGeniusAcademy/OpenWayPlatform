const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  try {
    console.log('🔄 Применение миграции для технических заданий...');

    const migrationPath = path.join(__dirname, 'migrations', 'create_technical_specs.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(migration);

    console.log('✅ Миграция успешно применена!');
    console.log('📋 Создана таблица technical_specs');

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка применения миграции:', error);
    process.exit(1);
  }
}

applyMigration();
