-- Таблица для технических заданий
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

-- Индекс для быстрого поиска по пользователю
CREATE INDEX IF NOT EXISTS idx_technical_specs_user_id ON technical_specs(user_id);

-- Индекс для сортировки по дате создания
CREATE INDEX IF NOT EXISTS idx_technical_specs_created_at ON technical_specs(created_at DESC);
