-- Таблица для crash игр
CREATE TABLE IF NOT EXISTS crash_games (
  id SERIAL PRIMARY KEY,
  crash_point DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting', -- waiting, running, crashed, completed
  current_multiplier DECIMAL(10, 2) DEFAULT 1.00,
  started_at TIMESTAMP,
  crashed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Таблица для ставок игроков в crash
CREATE TABLE IF NOT EXISTS crash_bets (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES crash_games(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  bet_amount INTEGER NOT NULL,
  cashout_multiplier DECIMAL(10, 2),
  win_amount INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active', -- active, cashed_out, lost
  created_at TIMESTAMP DEFAULT NOW(),
  cashed_out_at TIMESTAMP
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_crash_games_status ON crash_games(status);
CREATE INDEX IF NOT EXISTS idx_crash_games_created ON crash_games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crash_bets_game ON crash_bets(game_id);
CREATE INDEX IF NOT EXISTS idx_crash_bets_user ON crash_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_crash_bets_status ON crash_bets(status);

-- Таблица для истории crash игр (для статистики)
CREATE TABLE IF NOT EXISTS crash_history (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES crash_games(id),
  crash_point DECIMAL(10, 2),
  total_bets INTEGER DEFAULT 0,
  total_wagered INTEGER DEFAULT 0,
  total_payout INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crash_history_created ON crash_history(created_at DESC);
