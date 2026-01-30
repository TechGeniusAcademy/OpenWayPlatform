-- Таблица уровней игры Верстка
CREATE TABLE IF NOT EXISTS layout_game_levels (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    difficulty INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    points_reward INTEGER DEFAULT 10,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true
);

-- Таблица прогресса пользователей
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

-- Индексы
CREATE INDEX IF NOT EXISTS idx_layout_levels_order ON layout_game_levels(order_index);
CREATE INDEX IF NOT EXISTS idx_layout_progress_user ON layout_game_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_layout_progress_level ON layout_game_progress(level_id);
