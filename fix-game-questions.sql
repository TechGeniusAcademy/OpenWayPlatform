-- Добавить колонку created_by в таблицу game_questions
ALTER TABLE game_questions 
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Установить значение по умолчанию для существующих записей
UPDATE game_questions 
SET created_by = (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
WHERE created_by IS NULL;
