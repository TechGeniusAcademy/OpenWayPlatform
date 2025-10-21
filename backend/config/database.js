import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import createKnowledgeBaseTables from '../migrations/createKnowledgeBaseTables.js';
import addSubcategories from '../migrations/addSubcategories.js';

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
        avatar_url VARCHAR(255),
        avatar_frame VARCHAR(50) DEFAULT 'none',
        profile_banner VARCHAR(50) DEFAULT 'default',
        is_online BOOLEAN DEFAULT FALSE,
        last_seen TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2.5. Добавление колонок для косметики профиля, если их нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'avatar_frame'
        ) THEN
          ALTER TABLE users ADD COLUMN avatar_frame VARCHAR(50) DEFAULT 'none';
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'profile_banner'
        ) THEN
          ALTER TABLE users ADD COLUMN profile_banner VARCHAR(50) DEFAULT 'default';
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'is_online'
        ) THEN
          ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'last_seen'
        ) THEN
          ALTER TABLE users ADD COLUMN last_seen TIMESTAMP DEFAULT NOW();
        END IF;
      END $$;
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

    // 4.5. Добавление колонки для стиля никнейма, если её нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'username_style'
        ) THEN
          ALTER TABLE users ADD COLUMN username_style VARCHAR(50) DEFAULT 'none';
        END IF;
      END $$;
    `);

    // 4.6. Добавление колонки для цвета текста сообщений, если её нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'message_color'
        ) THEN
          ALTER TABLE users ADD COLUMN message_color VARCHAR(50) DEFAULT 'none';
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

    // 17. Создание таблицы результатов клавиатурного тренажера
    await pool.query(`
      CREATE TABLE IF NOT EXISTS typing_results (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        text_length INTEGER NOT NULL,
        time_seconds INTEGER NOT NULL,
        wpm INTEGER NOT NULL,
        accuracy DECIMAL(5,2) NOT NULL,
        errors INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Таблица 18: Карточки для игры
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_cards (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT,
        card_type VARCHAR(50) NOT NULL, -- 'skip_turn', 'transfer_question', 'extra_questions', 'double_points', 'steal_points', 'time_bonus', 'random_event'
        effect_value INTEGER DEFAULT 0, -- Значение эффекта (баллы, время и т.д.)
        drop_chance DECIMAL(5,2) NOT NULL DEFAULT 10.00, -- Шанс выпадения в процентах
        team VARCHAR(50), -- 'team_a', 'team_b', 'neutral'
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Таблица 19: Игровые сессии
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'preparing', -- 'preparing', 'in_progress', 'finished'
        current_team VARCHAR(50), -- 'team_a', 'team_b'
        team_a_score INTEGER DEFAULT 0,
        team_b_score INTEGER DEFAULT 0,
        current_round INTEGER DEFAULT 1,
        total_rounds INTEGER DEFAULT 10,
        created_by INTEGER REFERENCES users(id),
        started_at TIMESTAMP,
        finished_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Таблица 20: Участники игры (игроки в командах)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_participants (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES game_sessions(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        team VARCHAR(50) NOT NULL, -- 'team_a', 'team_b'
        points_earned INTEGER DEFAULT 0,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(session_id, user_id)
      );
    `);

    // Таблица 21: Раунды игры
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_rounds (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES game_sessions(id) ON DELETE CASCADE,
        round_number INTEGER NOT NULL,
        team VARCHAR(50) NOT NULL, -- Команда, которая играет в этом раунде
        card_id INTEGER REFERENCES game_cards(id),
        question_id INTEGER REFERENCES game_questions(id),
        question TEXT,
        answer TEXT,
        status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'answered_correct', 'answered_wrong', 'skipped', 'transferred'
        points_awarded INTEGER DEFAULT 0,
        time_limit INTEGER DEFAULT 60, -- Секунды на ответ
        started_at TIMESTAMP,
        answered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Таблица 22: Вопросы для игры
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_questions (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        category VARCHAR(100),
        difficulty VARCHAR(50) DEFAULT 'medium', -- 'easy', 'medium', 'hard'
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Таблица 23: Предметы магазина (рамки и баннеры)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shop_items (
        id SERIAL PRIMARY KEY,
        item_type VARCHAR(20) NOT NULL, -- 'frame', 'banner', 'username', или 'message_color'
        item_key VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        image_url VARCHAR(255), -- URL загруженной картинки (для frame/banner)
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Добавить колонку image_url если её нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'shop_items' AND column_name = 'image_url'
        ) THEN
          ALTER TABLE shop_items ADD COLUMN image_url VARCHAR(255);
        END IF;
      END $$;
    `);

    // Таблица 24: Покупки пользователей
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_purchases (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        item_key VARCHAR(50) NOT NULL,
        purchased_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, item_key)
      );
    `);

    // Таблица 25: Таблица баллов (points)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS points (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        total_points INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Индексы для магазина
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_shop_items_type ON shop_items(item_type);
      CREATE INDEX IF NOT EXISTS idx_user_purchases_user ON user_purchases(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online, last_seen);
    `);

    // Удаляем старые CSS-based предметы при инициализации
    await pool.query(`
      DELETE FROM shop_items WHERE image_url IS NULL;
    `);

    // Добавляем стили никнейма
    await pool.query(`
      INSERT INTO shop_items (item_type, item_key, name, description, price)
      VALUES 
        ('username', 'username-glow-blue', 'Голубое Свечение', 'Твой никнейм будет светиться голубым', 80),
        ('username', 'username-glow-pink', 'Розовое Свечение', 'Твой никнейм будет светиться розовым', 80),
        ('username', 'username-glow-green', 'Зелёное Свечение', 'Твой никнейм будет светиться зелёным', 80),
        ('username', 'username-rainbow', 'Радужный Градиент', 'Анимированный радужный эффект', 150),
        ('username', 'username-fire', 'Огненный Текст', 'Пылающий огненный эффект', 150),
        ('username', 'username-ice', 'Ледяной Текст', 'Холодный ледяной эффект', 150),
        ('username', 'username-neon', 'Неоновый', 'Яркий неоновый свет', 120),
        ('username', 'username-gold', 'Золотой', 'Роскошный золотой градиент', 100),
        ('username', 'username-shadow', 'С Тенью', 'Глубокая 3D тень', 90),
        ('username', 'username-font-bold', 'Жирный Шрифт', 'Увеличенная толщина текста', 60),
        ('username', 'username-font-italic', 'Курсив', 'Наклонный стиль текста', 60),
        ('username', 'username-font-mono', 'Моноширинный', 'Программистский шрифт', 70),
        ('username', 'username-font-fancy', 'Элегантный', 'Красивый декоративный шрифт', 90),
        ('username', 'username-glitch', 'Глитч Эффект', 'Цифровой сбой', 180),
        ('username', 'username-wave', 'Волна', 'Волнообразная анимация', 140)
      ON CONFLICT (item_key) DO NOTHING;
    `);

    // Добавляем цвета текста сообщений
    await pool.query(`
      INSERT INTO shop_items (item_type, item_key, name, description, price)
      VALUES 
        ('message_color', 'message-red', 'Красный', 'Красный цвет текста', 50),
        ('message_color', 'message-blue', 'Синий', 'Синий цвет текста', 50),
        ('message_color', 'message-green', 'Зелёный', 'Зелёный цвет текста', 50),
        ('message_color', 'message-purple', 'Фиолетовый', 'Фиолетовый цвет текста', 50),
        ('message_color', 'message-orange', 'Оранжевый', 'Оранжевый цвет текста', 50),
        ('message_color', 'message-pink', 'Розовый', 'Розовый цвет текста', 50),
        ('message_color', 'message-gradient-sunset', 'Закат', 'Градиент от оранжевого к розовому', 100),
        ('message_color', 'message-gradient-ocean', 'Океан', 'Градиент от синего к бирюзовому', 100),
        ('message_color', 'message-gradient-forest', 'Лес', 'Градиент от зелёного к салатовому', 100),
        ('message_color', 'message-gradient-fire', 'Огонь', 'Градиент от красного к жёлтому', 120),
        ('message_color', 'message-gradient-purple', 'Фиолетовый Закат', 'Градиент от фиолетового к розовому', 120),
        ('message_color', 'message-gradient-rainbow', 'Радуга', 'Радужный градиент', 150)
      ON CONFLICT (item_key) DO NOTHING;
    `);

    await createDefaultAdmin();

    // Создание таблиц базы знаний
    await createKnowledgeBaseTables();
    
    // Добавление подкатегорий
    await addSubcategories();

    // Таблица 26: Обновления (Updates/Changelog)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS updates (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        changes JSONB DEFAULT '[]',
        published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Индексы для таблицы обновлений
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_updates_published ON updates(published);
      CREATE INDEX IF NOT EXISTS idx_updates_created_at ON updates(created_at DESC);
    `);

    console.log('✅ База данных полностью инициализирована');
  } catch (error) {
    console.error('❌ Ошибка инициализации базы данных:', error);
    throw error;
  }
};

// Создание администратора по умолчанию
const createDefaultAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'alkawmaga@gmail.com';
    
    // Проверяем, существует ли уже администратор
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existingAdmin.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(
        process.env.ADMIN_PASSWORD || 'Hihet1597531782',
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
      console.log(`🔑 Пароль: ${process.env.ADMIN_PASSWORD || 'Hihet1597531782'}`);
    } else {
      console.log('✅ Администратор уже существует');
    }
  } catch (error) {
    console.error('❌ Ошибка создания администратора:', error.message);
    // Не бросаем ошибку, чтобы сервер продолжил работу
  }
};

export default pool;
