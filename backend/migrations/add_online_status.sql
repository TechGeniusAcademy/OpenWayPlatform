-- Добавление полей для онлайн статуса пользователей
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT NOW();

-- Создание индекса для быстрого поиска онлайн пользователей
CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online, last_seen);

-- Комментарии
COMMENT ON COLUMN users.is_online IS 'Статус пользователя: онлайн или офлайн';
COMMENT ON COLUMN users.last_seen IS 'Время последней активности пользователя';
