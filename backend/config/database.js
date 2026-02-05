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

    // 4.6. Добавление колонки experience (опыт) в users, если её нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'experience'
        ) THEN
          ALTER TABLE users ADD COLUMN experience INTEGER DEFAULT 0 NOT NULL;
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

    // 8.6. Добавление колонки reply_to_id в messages, если её нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'messages' AND column_name = 'reply_to_id'
        ) THEN
          ALTER TABLE messages ADD COLUMN reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // 8.7. Добавление колонки is_edited в messages, если её нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'messages' AND column_name = 'is_edited'
        ) THEN
          ALTER TABLE messages ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;
    `);

    // 8.8. Добавление колонки edited_at в messages, если её нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'messages' AND column_name = 'edited_at'
        ) THEN
          ALTER TABLE messages ADD COLUMN edited_at TIMESTAMP;
        END IF;
      END $$;
    `);

    // 8.9. Создание таблицы реакций на сообщения
    await pool.query(`
      CREATE TABLE IF NOT EXISTS message_reactions (
        id SERIAL PRIMARY KEY,
        message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        emoji VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(message_id, user_id, emoji)
      );
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
      CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id);
      CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
      CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
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
        attachments JSONB DEFAULT '[]', -- прикреплённые файлы
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
        checked_by INTEGER REFERENCES users(id),
        checked_at TIMESTAMP,
        reason TEXT, -- причина принятия/отклонения
        points_earned INTEGER DEFAULT 0
      );
    `);

    // Добавляем колонку attachments если её нет (для существующих баз данных)
    await pool.query(`
      ALTER TABLE homework_submissions 
      ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
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
        option_a TEXT,
        option_b TEXT,
        option_c TEXT,
        option_d TEXT,
        correct_option VARCHAR(1),
        category VARCHAR(100),
        difficulty VARCHAR(50) DEFAULT 'medium', -- 'easy', 'medium', 'hard'
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Добавление колонок для вариантов ответа если их нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'game_questions' AND column_name = 'option_a'
        ) THEN
          ALTER TABLE game_questions 
          ADD COLUMN option_a TEXT,
          ADD COLUMN option_b TEXT,
          ADD COLUMN option_c TEXT,
          ADD COLUMN option_d TEXT,
          ADD COLUMN correct_option VARCHAR(1);
        END IF;
      END $$;
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
        required_experience INTEGER DEFAULT 0,
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

    // Добавить колонку required_experience если её нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'shop_items' AND column_name = 'required_experience'
        ) THEN
          ALTER TABLE shop_items ADD COLUMN required_experience INTEGER DEFAULT 0;
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

    // Таблица 26: История баллов (points_history)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS points_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        points_change INTEGER NOT NULL,
        reason TEXT,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Таблица 27: Проекты IDE (projects)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        language VARCHAR(50) DEFAULT 'html',
        file_system JSONB DEFAULT '[]'::jsonb,
        files_count INTEGER DEFAULT 3,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Таблица 28: Отправки проектов на проверку (project_submissions)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_submissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        project_name VARCHAR(255) NOT NULL,
        project_data JSONB NOT NULL,
        type VARCHAR(50) NOT NULL, -- 'homework' или 'project'
        homework_id INTEGER REFERENCES homeworks(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewed', 'approved', 'rejected'
        feedback TEXT,
        grade INTEGER,
        reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Таблица 29: Дизайн-проекты (design_projects)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS design_projects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        elements JSONB DEFAULT '[]'::jsonb,
        canvas_size JSONB DEFAULT '{"width": 1920, "height": 1080}'::jsonb,
        thumbnail TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Добавление canvas_size в design_projects если его нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'design_projects' AND column_name = 'canvas_size'
        ) THEN
          ALTER TABLE design_projects ADD COLUMN canvas_size JSONB DEFAULT '{"width": 1920, "height": 1080}'::jsonb;
        END IF;
      END $$;
    `);

    // Индексы для магазина и истории баллов
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_shop_items_type ON shop_items(item_type);
      CREATE INDEX IF NOT EXISTS idx_user_purchases_user ON user_purchases(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online, last_seen);
      CREATE INDEX IF NOT EXISTS idx_points_history_user_id ON points_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_points_history_created_at ON points_history(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
      CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON project_submissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_status ON project_submissions(status);
      CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON project_submissions(submitted_at DESC);
      CREATE INDEX IF NOT EXISTS idx_design_projects_user_id ON design_projects(user_id);
      CREATE INDEX IF NOT EXISTS idx_design_projects_updated_at ON design_projects(updated_at DESC);
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

    // Таблица для онлайн шахматных игр
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chess_games (
        id SERIAL PRIMARY KEY,
        white_player_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        black_player_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        challenger_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        position TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        move_history JSONB DEFAULT '[]',
        bet_amount INTEGER DEFAULT 0,
        white_time_left INTEGER DEFAULT 0,
        black_time_left INTEGER DEFAULT 0,
        current_turn_start TIMESTAMP,
        result VARCHAR(20),
        end_reason VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        ended_at TIMESTAMP,
        last_move_at TIMESTAMP
      );
    `);

    // Индексы для шахматных игр
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chess_games_white_player ON chess_games(white_player_id);
      CREATE INDEX IF NOT EXISTS idx_chess_games_black_player ON chess_games(black_player_id);
      CREATE INDEX IF NOT EXISTS idx_chess_games_status ON chess_games(status);
      CREATE INDEX IF NOT EXISTS idx_chess_games_created_at ON chess_games(created_at DESC);
    `);

    // Таблица 26: Обновления (Updates/Changelog)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS updates (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        content TEXT,
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

    // Таблица 27: Технические задания
    await pool.query(`
      CREATE TABLE IF NOT EXISTS technical_specs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        project_type VARCHAR(50) DEFAULT 'web',
        description TEXT,
        goals TEXT,
        target_audience TEXT,
        functional_requirements TEXT,
        technical_requirements TEXT,
        design_requirements TEXT,
        deadline DATE,
        budget VARCHAR(100),
        additional_info TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Индексы для таблицы технических заданий
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_technical_specs_user_id ON technical_specs(user_id);
      CREATE INDEX IF NOT EXISTS idx_technical_specs_created_at ON technical_specs(created_at DESC);
    `);

    // Таблица 28: Игра "Верстка" - уровни
    await pool.query(`
      CREATE TABLE IF NOT EXISTS layout_game_levels (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        difficulty INTEGER DEFAULT 1,
        order_index INTEGER DEFAULT 0,
        points_reward INTEGER DEFAULT 10,
        image_url TEXT,
        target_html TEXT,
        target_css TEXT,
        canvas_width INTEGER DEFAULT 800,
        canvas_height INTEGER DEFAULT 600,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        is_active BOOLEAN DEFAULT true
      );
    `);

    // Добавить новые колонки если их нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'layout_game_levels' AND column_name = 'target_html'
        ) THEN
          ALTER TABLE layout_game_levels ADD COLUMN target_html TEXT;
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'layout_game_levels' AND column_name = 'target_css'
        ) THEN
          ALTER TABLE layout_game_levels ADD COLUMN target_css TEXT;
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'layout_game_levels' AND column_name = 'canvas_width'
        ) THEN
          ALTER TABLE layout_game_levels ADD COLUMN canvas_width INTEGER DEFAULT 800;
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'layout_game_levels' AND column_name = 'canvas_height'
        ) THEN
          ALTER TABLE layout_game_levels ADD COLUMN canvas_height INTEGER DEFAULT 600;
        END IF;
        
        -- Сделать image_url необязательным
        ALTER TABLE layout_game_levels ALTER COLUMN image_url DROP NOT NULL;
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);

    // Таблица 29: Игра "Верстка" - прогресс пользователей
    await pool.query(`
      CREATE TABLE IF NOT EXISTS layout_game_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        level_id INTEGER REFERENCES layout_game_levels(id) ON DELETE CASCADE,
        completed BOOLEAN DEFAULT false,
        best_accuracy DECIMAL(5,2) DEFAULT 0,
        attempts INTEGER DEFAULT 0,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, level_id)
      );
    `);

    // Индексы для игры "Верстка"
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_layout_game_levels_active ON layout_game_levels(is_active);
      CREATE INDEX IF NOT EXISTS idx_layout_game_levels_order ON layout_game_levels(order_index);
      CREATE INDEX IF NOT EXISTS idx_layout_game_progress_user ON layout_game_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_layout_game_progress_level ON layout_game_progress(level_id);
    `);

    // Таблицы для игры "JavaScript"
    await pool.query(`
      CREATE TABLE IF NOT EXISTS js_game_levels (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        difficulty INT DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 8),
        points_reward INT DEFAULT 10,
        experience_reward INT DEFAULT 0,
        task_description TEXT NOT NULL,
        initial_code TEXT DEFAULT '',
        solution_code TEXT,
        tests JSONB NOT NULL DEFAULT '[]',
        hints JSONB DEFAULT '[]',
        time_limit INT DEFAULT 5000,
        order_index INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS js_game_progress (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        level_id INT NOT NULL REFERENCES js_game_levels(id) ON DELETE CASCADE,
        submitted_code TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        attempts INT DEFAULT 0,
        tests_passed INT DEFAULT 0,
        tests_total INT DEFAULT 0,
        solved_at TIMESTAMP,
        points_awarded INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, level_id)
      );

      CREATE INDEX IF NOT EXISTS idx_js_game_progress_user ON js_game_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_js_game_progress_level ON js_game_progress(level_id);
      CREATE INDEX IF NOT EXISTS idx_js_game_levels_order ON js_game_levels(order_index);
    `);

    // Миграция: добавление experience_reward если его нет
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'js_game_levels' AND column_name = 'experience_reward') THEN
          ALTER TABLE js_game_levels ADD COLUMN experience_reward INT DEFAULT 0;
        END IF;
        -- Расширяем ограничение difficulty до 8
        ALTER TABLE js_game_levels DROP CONSTRAINT IF EXISTS js_game_levels_difficulty_check;
        ALTER TABLE js_game_levels ADD CONSTRAINT js_game_levels_difficulty_check CHECK (difficulty BETWEEN 1 AND 8);
      END $$;
    `);

    // Миграция: добавление experience_reward для flexchan_levels если его нет
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flexchan_levels' AND column_name = 'experience_reward') THEN
          ALTER TABLE flexchan_levels ADD COLUMN experience_reward INT DEFAULT 0;
        END IF;
      END $$;
    `);

    // Таблица уровней пользователей
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_levels (
        id SERIAL PRIMARY KEY,
        level_number INTEGER NOT NULL UNIQUE,
        rank_name VARCHAR(100),
        experience_required INTEGER NOT NULL DEFAULT 0,
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_levels_number ON user_levels(level_number);
      CREATE INDEX IF NOT EXISTS idx_user_levels_xp ON user_levels(experience_required);
    `);

    // Миграция: добавление rank_name если его нет
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_levels' AND column_name = 'rank_name') THEN
          ALTER TABLE user_levels ADD COLUMN rank_name VARCHAR(100);
        END IF;
      END $$;
    `);

    // Таблица достижений
    await pool.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        icon VARCHAR(100) NOT NULL,
        icon_color VARCHAR(50) DEFAULT '#667eea',
        rarity VARCHAR(50) DEFAULT 'common',
        points_reward INTEGER DEFAULT 0,
        experience_reward INTEGER DEFAULT 0,
        requirement_type VARCHAR(100),
        requirement_value INTEGER DEFAULT 1,
        is_secret BOOLEAN DEFAULT false,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
      CREATE INDEX IF NOT EXISTS idx_achievements_code ON achievements(code);
    `);

    // Таблица полученных достижений пользователей
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, achievement_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON user_achievements(achievement_id);
    `);

    // Таблица музыки
    await pool.query(`
      CREATE TABLE IF NOT EXISTS music (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        artist VARCHAR(255),
        cover_url VARCHAR(500),
        duration INTEGER DEFAULT 0,
        lyrics TEXT,
        file_url VARCHAR(500) NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_music_title ON music(title);
      CREATE INDEX IF NOT EXISTS idx_music_artist ON music(artist);
    `);

    // Таблица лайков музыки
    await pool.query(`
      CREATE TABLE IF NOT EXISTS music_likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        music_id INTEGER REFERENCES music(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, music_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_music_likes_user ON music_likes(user_id);
      CREATE INDEX IF NOT EXISTS idx_music_likes_music ON music_likes(music_id);
    `);

    // Таблицы курсов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        detailed_description TEXT,
        thumbnail_url VARCHAR(500),
        duration_hours INTEGER DEFAULT 0,
        difficulty_level VARCHAR(50) DEFAULT 'beginner',
        is_published BOOLEAN DEFAULT false,
        required_level INTEGER DEFAULT 0,
        price INTEGER DEFAULT 0,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published);
      CREATE INDEX IF NOT EXISTS idx_courses_created_by ON courses(created_by);
    `);

    // Миграция: добавление required_level и price в courses если их нет
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'required_level') THEN
          ALTER TABLE courses ADD COLUMN required_level INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'price') THEN
          ALTER TABLE courses ADD COLUMN price INTEGER DEFAULT 0;
        END IF;
      END $$;
    `);

    // Таблица категорий курсов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(50),
        order_number INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Связь курсов с категориями
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'category_id') THEN
          ALTER TABLE courses ADD COLUMN category_id INTEGER REFERENCES course_categories(id);
        END IF;
      END $$;
    `);

    // Таблица уроков курса
    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_lessons (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        video_url VARCHAR(500),
        order_number INTEGER NOT NULL,
        duration_minutes INTEGER DEFAULT 0,
        timecodes JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_course_lessons_course ON course_lessons(course_id);
      CREATE INDEX IF NOT EXISTS idx_course_lessons_order ON course_lessons(order_number);
    `);

    // Миграция: добавление timecodes в course_lessons если их нет
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_lessons' AND column_name = 'timecodes') THEN
          ALTER TABLE course_lessons ADD COLUMN timecodes JSONB DEFAULT '[]';
        END IF;
      END $$;
    `);

    // Таблица прогресса студентов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        lesson_id INTEGER REFERENCES course_lessons(id) ON DELETE CASCADE,
        completed BOOLEAN DEFAULT false,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        UNIQUE(user_id, lesson_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_course_progress_user ON course_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_course_progress_course ON course_progress(course_id);
    `);

    // Таблица записи на курсы
    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_enrollments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, course_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON course_enrollments(user_id);
      CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);
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
