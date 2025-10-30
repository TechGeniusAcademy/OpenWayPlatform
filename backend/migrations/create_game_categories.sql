-- Создание таблицы категорий для вопросов квиза

CREATE TABLE IF NOT EXISTS game_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Добавляем колонку category_id в game_questions, если её нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'game_questions' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE game_questions ADD COLUMN category_id INTEGER REFERENCES game_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Добавляем колонку difficulty в game_questions, если её нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'game_questions' AND column_name = 'difficulty'
  ) THEN
    ALTER TABLE game_questions ADD COLUMN difficulty VARCHAR(20) DEFAULT 'medium';
  END IF;
END $$;

-- Создаем несколько категорий по умолчанию
INSERT INTO game_categories (name, description) VALUES 
  ('История', 'Вопросы по истории Казахстана и мира'),
  ('География', 'Вопросы по географии'),
  ('Математика', 'Математические задачи и вопросы'),
  ('Литература', 'Вопросы по литературе'),
  ('Наука', 'Вопросы по естественным наукам')
ON CONFLICT (name) DO NOTHING;
