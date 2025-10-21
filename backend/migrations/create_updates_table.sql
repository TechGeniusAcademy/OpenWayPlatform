-- Создание таблицы обновлений
CREATE TABLE IF NOT EXISTS updates (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индекс для быстрого поиска опубликованных обновлений
CREATE INDEX idx_updates_published ON updates(published);
CREATE INDEX idx_updates_created_at ON updates(created_at DESC);

-- Комментарии
COMMENT ON TABLE updates IS 'Обновления платформы';
COMMENT ON COLUMN updates.version IS 'Версия обновления (например, 1.0.0)';
COMMENT ON COLUMN updates.title IS 'Заголовок обновления';
COMMENT ON COLUMN updates.description IS 'Краткое описание обновления';
COMMENT ON COLUMN updates.content IS 'Полное содержание обновления в HTML';
COMMENT ON COLUMN updates.published IS 'Опубликовано ли обновление';
