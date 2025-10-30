-- Таблица битв
CREATE TABLE IF NOT EXISTS quiz_battles (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER NOT NULL REFERENCES users(id),
  category_id INTEGER REFERENCES game_categories(id) ON DELETE SET NULL,
  room_code VARCHAR(10) UNIQUE NOT NULL,
  status VARCHAR(20) CHECK (status IN ('waiting', 'in_progress', 'finished')) DEFAULT 'waiting',
  current_question_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP
);

-- Таблица игроков в битве
CREATE TABLE IF NOT EXISTS quiz_battle_players (
  id SERIAL PRIMARY KEY,
  battle_id INTEGER NOT NULL REFERENCES quiz_battles(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  score INTEGER DEFAULT 0,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(battle_id, user_id)
);

-- Таблица ответов
CREATE TABLE IF NOT EXISTS quiz_battle_answers (
  id SERIAL PRIMARY KEY,
  battle_id INTEGER NOT NULL REFERENCES quiz_battles(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  question_id INTEGER NOT NULL,
  answer VARCHAR(500),
  is_correct BOOLEAN DEFAULT FALSE,
  time_spent INTEGER,
  answered_at TIMESTAMP DEFAULT NOW()
);

-- Добавить колонки для вариантов ответа в game_questions если их нет
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

-- Индексы
CREATE INDEX IF NOT EXISTS idx_quiz_battles_room_code ON quiz_battles(room_code);
CREATE INDEX IF NOT EXISTS idx_quiz_battles_status ON quiz_battles(status);
CREATE INDEX IF NOT EXISTS idx_quiz_battle_players_battle ON quiz_battle_players(battle_id);
CREATE INDEX IF NOT EXISTS idx_quiz_battle_answers_battle ON quiz_battle_answers(battle_id);
