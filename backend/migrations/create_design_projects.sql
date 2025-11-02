-- Создание таблицы для дизайн-проектов
CREATE TABLE IF NOT EXISTS design_projects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  elements JSONB NOT NULL DEFAULT '[]',
  canvas_size JSONB NOT NULL DEFAULT '{"width": 1920, "height": 1080}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы для workspace (текущее состояние работы пользователя)
CREATE TABLE IF NOT EXISTS design_workspaces (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  elements JSONB NOT NULL DEFAULT '[]',
  canvas_size JSONB NOT NULL DEFAULT '{"width": 1920, "height": 1080}',
  current_project_id INTEGER REFERENCES design_projects(id) ON DELETE SET NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_design_projects_user_id ON design_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_design_projects_updated_at ON design_projects(updated_at DESC);

-- Комментарии к таблицам
COMMENT ON TABLE design_projects IS 'Сохраненные дизайн-проекты пользователей';
COMMENT ON TABLE design_workspaces IS 'Текущее рабочее состояние дизайн-редактора для каждого пользователя';
