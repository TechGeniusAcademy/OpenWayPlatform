import pool from '../config/database.js';

const runMigration = async () => {
  try {
    console.log('Creating FlexChan tables...');
    
    // Таблица уровней FlexChan
    await pool.query(`
      CREATE TABLE IF NOT EXISTS flexchan_levels (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          initial_code TEXT NOT NULL,
          solution JSONB NOT NULL DEFAULT '[]',
          items JSONB NOT NULL DEFAULT '[]',
          targets JSONB NOT NULL DEFAULT '[]',
          hint TEXT,
          points INTEGER DEFAULT 10,
          level_order INTEGER NOT NULL,
          difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ flexchan_levels table created');

    // Таблица прогресса учеников
    await pool.query(`
      CREATE TABLE IF NOT EXISTS flexchan_progress (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          level_id INTEGER NOT NULL REFERENCES flexchan_levels(id) ON DELETE CASCADE,
          completed BOOLEAN DEFAULT false,
          attempts INTEGER DEFAULT 0,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, level_id)
      )
    `);
    console.log('✓ flexchan_progress table created');

    // Индексы
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_flexchan_levels_order ON flexchan_levels(level_order)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_flexchan_levels_active ON flexchan_levels(is_active)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_flexchan_progress_user ON flexchan_progress(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_flexchan_progress_level ON flexchan_progress(level_id)`);
    console.log('✓ Indexes created');

    // Проверяем, есть ли уже уровни
    const existing = await pool.query('SELECT COUNT(*) FROM flexchan_levels');
    if (parseInt(existing.rows[0].count) === 0) {
      // Вставляем начальные уровни
      await pool.query(`
        INSERT INTO flexchan_levels (title, description, initial_code, solution, items, targets, hint, points, level_order, difficulty) VALUES
        ('justify-content: flex-end', 'Переместите элементы в конец контейнера', '.container {\n  display: flex;\n  {{EDIT}}\n}', '["justify-content: flex-end", "justify-content:flex-end"]', '[{"type": "girl", "startPos": {"row": 4, "col": 0}}]', '[{"row": 4, "col": 9}]', 'Используйте justify-content', 10, 1, 'easy'),
        ('justify-content: center', 'Переместите элементы в центр', '.container {\n  display: flex;\n  {{EDIT}}\n}', '["justify-content: center", "justify-content:center"]', '[{"type": "girl", "startPos": {"row": 4, "col": 0}}]', '[{"row": 4, "col": 4}]', 'Используйте justify-content', 10, 2, 'easy'),
        ('justify-content: space-between', 'Распределите элементы с пространством между ними', '.container {\n  display: flex;\n  {{EDIT}}\n}', '["justify-content: space-between", "justify-content:space-between"]', '[{"type": "girl", "startPos": {"row": 4, "col": 4}}, {"type": "boy", "startPos": {"row": 4, "col": 5}}]', '[{"row": 4, "col": 0}, {"row": 4, "col": 9}]', 'Используйте justify-content', 15, 3, 'easy'),
        ('align-items: flex-end', 'Переместите элементы вниз', '.container {\n  display: flex;\n  {{EDIT}}\n}', '["align-items: flex-end", "align-items:flex-end"]', '[{"type": "girl", "startPos": {"row": 0, "col": 4}}]', '[{"row": 9, "col": 4}]', 'Используйте align-items', 10, 4, 'easy'),
        ('align-items: center', 'Переместите элементы в центр по вертикали', '.container {\n  display: flex;\n  {{EDIT}}\n}', '["align-items: center", "align-items:center"]', '[{"type": "girl", "startPos": {"row": 0, "col": 4}}]', '[{"row": 4, "col": 4}]', 'Используйте align-items', 10, 5, 'easy'),
        ('Комбинация justify + align', 'Переместите элемент в правый нижний угол', '.container {\n  display: flex;\n  {{EDIT}}\n  {{EDIT}}\n}', '["justify-content: flex-end", "align-items: flex-end"]', '[{"type": "girl", "startPos": {"row": 0, "col": 0}}]', '[{"row": 9, "col": 9}]', 'Комбинируйте justify-content и align-items', 20, 6, 'medium'),
        ('Центрирование', 'Поместите элемент точно в центр', '.container {\n  display: flex;\n  {{EDIT}}\n  {{EDIT}}\n}', '["justify-content: center", "align-items: center"]', '[{"type": "girl", "startPos": {"row": 0, "col": 0}}]', '[{"row": 4, "col": 4}]', 'Комбинируйте justify-content и align-items', 20, 7, 'medium'),
        ('flex-direction: column', 'Расположите элементы в колонку', '.container {\n  display: flex;\n  {{EDIT}}\n}', '["flex-direction: column", "flex-direction:column"]', '[{"type": "girl", "startPos": {"row": 4, "col": 0}}, {"type": "boy", "startPos": {"row": 4, "col": 1}}]', '[{"row": 0, "col": 0}, {"row": 1, "col": 0}]', 'Используйте flex-direction', 15, 8, 'medium'),
        ('flex-direction: row-reverse', 'Расположите элементы в обратном порядке', '.container {\n  display: flex;\n  {{EDIT}}\n}', '["flex-direction: row-reverse", "flex-direction:row-reverse"]', '[{"type": "girl", "startPos": {"row": 4, "col": 0}}, {"type": "boy", "startPos": {"row": 4, "col": 1}}]', '[{"row": 4, "col": 9}, {"row": 4, "col": 8}]', 'Используйте flex-direction', 15, 9, 'medium'),
        ('Комплексный уровень', 'Центрируйте элементы и поменяйте их местами', '.container {\n  display: flex;\n  {{EDIT}}\n  {{EDIT}}\n}\n.girl {\n  {{EDIT}}\n}', '["justify-content: center", "align-items: center", "order:"]', '[{"type": "girl", "startPos": {"row": 0, "col": 0}}, {"type": "boy", "startPos": {"row": 0, "col": 1}}]', '[{"row": 4, "col": 5}, {"row": 4, "col": 4}]', 'Комбинируйте несколько свойств', 30, 10, 'hard')
      `);
      console.log('✓ 10 initial levels inserted');
    } else {
      console.log('ℹ Levels already exist, skipping seed data');
    }

    console.log('\n✅ FlexChan migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
};

runMigration();
