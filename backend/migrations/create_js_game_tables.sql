-- Таблица уровней JS игры
CREATE TABLE IF NOT EXISTS js_game_levels (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  difficulty INT DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  points_reward INT DEFAULT 10,
  
  -- Условие задачи
  task_description TEXT NOT NULL,
  
  -- Начальный код (шаблон для ученика)
  initial_code TEXT DEFAULT '',
  
  -- Решение (для справки админа)
  solution_code TEXT,
  
  -- Тесты в формате JSON: [{input: [...], expected: ...}, ...]
  tests JSONB NOT NULL DEFAULT '[]',
  
  -- Подсказки
  hints JSONB DEFAULT '[]',
  
  -- Ограничение времени выполнения (мс)
  time_limit INT DEFAULT 5000,
  
  -- Порядок отображения
  order_index INT DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица прогресса учеников
CREATE TABLE IF NOT EXISTS js_game_progress (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level_id INT NOT NULL REFERENCES js_game_levels(id) ON DELETE CASCADE,
  
  -- Последний отправленный код
  submitted_code TEXT,
  
  -- Статус: pending, passed, failed
  status VARCHAR(20) DEFAULT 'pending',
  
  -- Количество попыток
  attempts INT DEFAULT 0,
  
  -- Пройденные тесты
  tests_passed INT DEFAULT 0,
  tests_total INT DEFAULT 0,
  
  -- Время решения (первое успешное)
  solved_at TIMESTAMP,
  
  -- Очки получены
  points_awarded INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, level_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_js_progress_user ON js_game_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_js_progress_level ON js_game_progress(level_id);
CREATE INDEX IF NOT EXISTS idx_js_levels_order ON js_game_levels(order_index);
