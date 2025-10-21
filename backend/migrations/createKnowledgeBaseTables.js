import pool from '../config/database.js';

async function createKnowledgeBaseTables() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Таблица категорий
    await client.query(`
      CREATE TABLE IF NOT EXISTS kb_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(10) DEFAULT '📚',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      )
    `);

    // Таблица статей
    await client.query(`
      CREATE TABLE IF NOT EXISTS kb_articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        category_id INTEGER REFERENCES kb_categories(id) ON DELETE CASCADE,
        description TEXT,
        content TEXT NOT NULL,
        published BOOLEAN DEFAULT true,
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      )
    `);

    // Индексы
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_kb_articles_category 
      ON kb_articles(category_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_kb_articles_published 
      ON kb_articles(published)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_kb_articles_deleted 
      ON kb_articles(deleted_at)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_kb_categories_deleted 
      ON kb_categories(deleted_at)
    `);

    // Добавить тестовые данные если таблицы пустые
    const categoriesCount = await client.query('SELECT COUNT(*) FROM kb_categories WHERE deleted_at IS NULL');
    
    if (parseInt(categoriesCount.rows[0].count) === 0) {
      // Создать категории
      const categories = [
        ['Основы программирования', '💻', 'Базовые концепции программирования'],
        ['Web-разработка', '🌐', 'HTML, CSS, JavaScript и фреймворки'],
        ['Базы данных', '🗄️', 'SQL и NoSQL базы данных'],
        ['Алгоритмы', '🧮', 'Структуры данных и алгоритмы'],
        ['Git и GitHub', '🔀', 'Система контроля версий']
      ];

      for (const [name, icon, description] of categories) {
        await client.query(
          'INSERT INTO kb_categories (name, icon, description) VALUES ($1, $2, $3)',
          [name, icon, description]
        );
      }

      // Создать примеры статей
      await client.query(`
        INSERT INTO kb_articles (title, category_id, description, content, published) VALUES
        (
          'Введение в JavaScript',
          1,
          'Основы языка JavaScript для начинающих',
          '<h1>Введение в JavaScript</h1><p>JavaScript — это мощный язык программирования, который используется для создания интерактивных веб-страниц.</p><h2>Основные концепции</h2><h3>Переменные</h3><pre>let name = "Иван";\nconst age = 25;\nvar city = "Алматы";</pre><h3>Функции</h3><pre>function greet(name) {\n  return "Привет, " + name + "!";\n}\n\nconsole.log(greet("Мир"));</pre>',
          true
        ),
        (
          'HTML5 и семантическая верстка',
          2,
          'Современные стандарты HTML5',
          '<h1>HTML5 и семантическая верстка</h1><p>HTML5 предоставляет новые семантические элементы для структурирования контента.</p><h2>Основные теги</h2><ul><li>&lt;header&gt; - Заголовок страницы</li><li>&lt;nav&gt; - Навигация</li><li>&lt;main&gt; - Основной контент</li><li>&lt;article&gt; - Статья</li><li>&lt;section&gt; - Секция</li><li>&lt;footer&gt; - Подвал</li></ul>',
          true
        ),
        (
          'Основы SQL',
          3,
          'Язык структурированных запросов',
          '<h1>Основы SQL</h1><p>SQL (Structured Query Language) — язык для управления реляционными базами данных.</p><h2>Основные команды</h2><h3>SELECT</h3><pre>SELECT * FROM users;\nSELECT name, email FROM users WHERE age > 18;</pre><h3>INSERT</h3><pre>INSERT INTO users (name, email, age)\nVALUES (''Иван'', ''ivan@example.com'', 25);</pre>',
          true
        )
      `);

      console.log('✅ Тестовые данные базы знаний созданы');
    }

    await client.query('COMMIT');
    console.log('✅ Таблицы базы знаний успешно созданы');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка создания таблиц базы знаний:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default createKnowledgeBaseTables;
