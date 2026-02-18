import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function addSubcategories() {
  try {
    console.log('📝 Добавление таблицы подкатегорий...');
    
    // Для проверки подключения и конфигурации
    console.log('Используемая БД:', process.env.DB_NAME);
    console.log('Пользователь БД:', process.env.DB_USER);

    // Создание таблицы подкатегорий
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kb_subcategories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category_id INTEGER NOT NULL REFERENCES kb_categories(id) ON DELETE CASCADE,
        icon VARCHAR(10) DEFAULT '📄',
        description TEXT,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      );
    `);

    console.log('✅ Таблица kb_subcategories создана');

    // Добавление колонки subcategory_id в таблицу статей
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'kb_articles' AND column_name = 'subcategory_id'
        ) THEN
          ALTER TABLE kb_articles ADD COLUMN subcategory_id INTEGER REFERENCES kb_subcategories(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    console.log('✅ Колонка subcategory_id добавлена в kb_articles');

    // Создание индексов
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_kb_subcategories_category_id ON kb_subcategories(category_id);
      CREATE INDEX IF NOT EXISTS idx_kb_subcategories_deleted_at ON kb_subcategories(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_kb_articles_subcategory_id ON kb_articles(subcategory_id);
    `);

    console.log('✅ Индексы созданы');

    console.log('✅ Миграция подкатегорий выполнена успешно');
  } catch (error) {
    console.error('❌ Ошибка при добавлении подкатегорий:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

export default addSubcategories;
