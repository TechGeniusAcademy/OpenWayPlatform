import pool from './config/database.js';

async function addForeignKey() {
  try {
    console.log('📝 Добавление FK для category_id в quiz_battles...');
    
    // Проверяем, существует ли constraint
    const checkConstraint = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'quiz_battles' 
      AND constraint_type = 'FOREIGN KEY' 
      AND constraint_name = 'quiz_battles_category_id_fkey'
    `);
    
    if (checkConstraint.rows.length === 0) {
      await pool.query(`
        ALTER TABLE quiz_battles 
        ADD CONSTRAINT quiz_battles_category_id_fkey 
        FOREIGN KEY (category_id) 
        REFERENCES game_categories(id) 
        ON DELETE SET NULL
      `);
      console.log('✅ FK constraint добавлен успешно!');
    } else {
      console.log('ℹ️ FK constraint уже существует');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при добавлении FK:', error);
    process.exit(1);
  }
}

addForeignKey();
