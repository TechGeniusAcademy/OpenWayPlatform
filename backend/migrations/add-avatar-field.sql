-- Добавляем поле avatar_url в таблицу users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255);

COMMENT ON COLUMN users.avatar_url IS 'URL аватара пользователя';
