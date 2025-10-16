import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const { Pool } = pg;

// Подключение к PostgreSQL без указания конкретной базы для создания БД
const createDatabaseIfNotExists = async () => {
  const adminPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'postgres', // Подключаемся к дефолтной БД postgres
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    // Проверяем существование базы данных
    const result = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [process.env.DB_NAME]
    );

    if (result.rows.length === 0) {
      // Создаем базу данных, если её нет
      await adminPool.query(`CREATE DATABASE ${process.env.DB_NAME}`);
      console.log(`✅ База данных "${process.env.DB_NAME}" создана успешно`);
    } else {
      console.log(`✅ База данных "${process.env.DB_NAME}" уже существует`);
    }
  } catch (error) {
    console.error('❌ Ошибка при создании базы данных:', error.message);
    throw error;
  } finally {
    await adminPool.end();
  }
};

// Основной пул для работы с созданной БД
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Инициализация базы данных
export const initDatabase = async () => {
  try {
    // 1. Создаем базу данных если её нет
    await createDatabaseIfNotExists();

    // 2. Создание таблицы пользователей
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'student',
        full_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Создание таблицы групп
    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Добавление колонки group_id в users, если её нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'group_id'
        ) THEN
          ALTER TABLE users ADD COLUMN group_id INTEGER;
        END IF;
      END $$;
    `);

    // 4.5. Добавление колонки points в users, если её нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'points'
        ) THEN
          ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0 NOT NULL;
        END IF;
      END $$;
    `);

    // 5. Добавление внешнего ключа для связи пользователей с группами
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_group'
        ) THEN
          ALTER TABLE users 
          ADD CONSTRAINT fk_users_group 
          FOREIGN KEY (group_id) 
          REFERENCES groups(id) 
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // 6. Создание таблицы чатов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL, -- 'private' или 'group'
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Создание таблицы участников чата
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_participants (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_pinned BOOLEAN DEFAULT FALSE,
        last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(chat_id, user_id)
      );
    `);

    // 8. Создание таблицы сообщений
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT,
        message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'code', 'file'
        code_language VARCHAR(50),
        file_name VARCHAR(255),
        file_path VARCHAR(500),
        file_size INTEGER,
        is_pinned BOOLEAN DEFAULT FALSE,
        pinned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        pinned_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8.5. Добавление колонки last_read_at в chat_participants, если её нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'chat_participants' AND column_name = 'last_read_at'
        ) THEN
          ALTER TABLE chat_participants ADD COLUMN last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
      END $$;
    `);

    // 9. Создание индексов
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_group_id ON users(group_id);
      CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
      CREATE INDEX IF NOT EXISTS idx_chats_type ON chats(type);
      CREATE INDEX IF NOT EXISTS idx_chats_group_id ON chats(group_id);
      CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
      CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
      CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    `);

    console.log('✅ Таблицы созданы успешно');

    // 10. Создание администратора по умолчанию
    // 8. Создание таблицы тестов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tests (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL, -- 'choice' или 'code'
        time_limit INTEGER DEFAULT 0, -- в минутах, 0 = без ограничения
        points_correct INTEGER DEFAULT 1,
        points_wrong INTEGER DEFAULT 0,
        can_retry BOOLEAN DEFAULT false,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Создание таблицы вопросов теста
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_questions (
        id SERIAL PRIMARY KEY,
        test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        question_type VARCHAR(50) NOT NULL, -- 'choice' или 'code'
        question_order INTEGER DEFAULT 0,
        code_template TEXT, -- для вопросов типа code
        code_solution TEXT, -- правильное решение для проверки
        code_language VARCHAR(50), -- javascript, python и т.д.
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. Создание таблицы вариантов ответа
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_question_options (
        id SERIAL PRIMARY KEY,
        question_id INTEGER REFERENCES test_questions(id) ON DELETE CASCADE,
        option_text TEXT NOT NULL,
        is_correct BOOLEAN DEFAULT false,
        option_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 11. Создание таблицы назначений тестов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_assignments (
        id SERIAL PRIMARY KEY,
        test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        assigned_by INTEGER REFERENCES users(id),
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(test_id, group_id)
      );
    `);

    // 12. Создание таблицы попыток прохождения тестов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_attempts (
        id SERIAL PRIMARY KEY,
        test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        score INTEGER DEFAULT 0,
        points_earned INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'expired'
        time_spent INTEGER DEFAULT 0 -- в секундах
      );
    `);

    // 13. Создание таблицы ответов на вопросы
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_answers (
        id SERIAL PRIMARY KEY,
        attempt_id INTEGER REFERENCES test_attempts(id) ON DELETE CASCADE,
        question_id INTEGER REFERENCES test_questions(id) ON DELETE CASCADE,
        answer_text TEXT,
        selected_option_id INTEGER REFERENCES test_question_options(id) ON DELETE SET NULL,
        code_answer TEXT, -- для вопросов с кодом
        is_correct BOOLEAN,
        answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 14. Создание таблицы домашних заданий
    await pool.query(`
      CREATE TABLE IF NOT EXISTS homeworks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT, -- Rich text HTML контент
        points INTEGER DEFAULT 0, -- баллы за выполнение
        deadline TIMESTAMP, -- дедлайн для сдачи
        is_closed BOOLEAN DEFAULT false, -- закрыто вручную
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 15. Создание таблицы назначений домашних заданий
    await pool.query(`
      CREATE TABLE IF NOT EXISTS homework_assignments (
        id SERIAL PRIMARY KEY,
        homework_id INTEGER REFERENCES homeworks(id) ON DELETE CASCADE,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        assigned_by INTEGER REFERENCES users(id),
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(homework_id, group_id)
      );
    `);

    // 16. Создание таблицы сдачи домашних заданий
    await pool.query(`
      CREATE TABLE IF NOT EXISTS homework_submissions (
        id SERIAL PRIMARY KEY,
        homework_id INTEGER REFERENCES homeworks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        submission_text TEXT, -- текст ответа студента
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
        checked_by INTEGER REFERENCES users(id),
        checked_at TIMESTAMP,
        reason TEXT, -- причина принятия/отклонения
        points_earned INTEGER DEFAULT 0
      );
    `);

    await createDefaultAdmin();

    console.log('✅ База данных полностью инициализирована');
  } catch (error) {
    console.error('❌ Ошибка инициализации базы данных:', error);
    throw error;
  }
};

// Создание администратора по умолчанию
const createDefaultAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    
    // Проверяем, существует ли уже администратор
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existingAdmin.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(
        process.env.ADMIN_PASSWORD || 'admin123',
        10
      );

      await pool.query(
        `INSERT INTO users (username, email, password, role, full_name) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          process.env.ADMIN_USERNAME || 'admin',
          adminEmail,
          hashedPassword,
          'admin',
          process.env.ADMIN_FULL_NAME || 'Администратор'
        ]
      );

      console.log('✅ Администратор по умолчанию создан');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Пароль: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    } else {
      console.log('✅ Администратор уже существует');
    }
  } catch (error) {
    console.error('❌ Ошибка создания администратора:', error.message);
    // Не бросаем ошибку, чтобы сервер продолжил работу
  }
};

export default pool;
