-- Создание таблицы истории баллов
CREATE TABLE IF NOT EXISTS points_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points_change INTEGER NOT NULL,
  reason TEXT,
  admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индекс для быстрого поиска по пользователю
CREATE INDEX IF NOT EXISTS idx_points_history_user_id ON points_history(user_id);

-- Индекс для сортировки по дате
CREATE INDEX IF NOT EXISTS idx_points_history_created_at ON points_history(created_at DESC);
