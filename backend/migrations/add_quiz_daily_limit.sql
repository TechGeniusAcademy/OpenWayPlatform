-- Добавляем колонку для отслеживания последней игры пользователя
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_quiz_battle_date TIMESTAMP;

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_users_last_quiz_battle 
ON users(last_quiz_battle_date);
