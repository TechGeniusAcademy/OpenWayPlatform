-- Создание таблиц для игры в рулетку

-- Таблица игр рулетки
CREATE TABLE IF NOT EXISTS roulette_games (
  id SERIAL PRIMARY KEY,
  game_number INTEGER NOT NULL,
  winning_number INTEGER NOT NULL CHECK (winning_number >= 0 AND winning_number <= 36),
  winning_color VARCHAR(10) NOT NULL CHECK (winning_color IN ('red', 'black', 'green')),
  total_bets INTEGER DEFAULT 0,
  total_payout INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'betting', 'spinning', 'finished')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP
);

-- Таблица ставок на рулетку
CREATE TABLE IF NOT EXISTS roulette_bets (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES roulette_games(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  bet_type VARCHAR(20) NOT NULL CHECK (bet_type IN ('number', 'red', 'black', 'odd', 'even', 'low', 'high', 'dozen1', 'dozen2', 'dozen3', 'column1', 'column2', 'column3')),
  bet_value INTEGER, -- для ставок на конкретное число
  bet_amount INTEGER NOT NULL CHECK (bet_amount >= 10 AND bet_amount <= 1000),
  payout_multiplier DECIMAL(10, 2) NOT NULL,
  payout_amount INTEGER DEFAULT 0,
  won BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица истории рулетки для статистики
CREATE TABLE IF NOT EXISTS roulette_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  total_games INTEGER DEFAULT 0,
  total_bets INTEGER DEFAULT 0,
  total_wagered INTEGER DEFAULT 0,
  total_won INTEGER DEFAULT 0,
  biggest_win INTEGER DEFAULT 0,
  favorite_bet_type VARCHAR(20),
  last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_roulette_games_status ON roulette_games(status);
CREATE INDEX IF NOT EXISTS idx_roulette_games_created ON roulette_games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roulette_bets_game ON roulette_bets(game_id);
CREATE INDEX IF NOT EXISTS idx_roulette_bets_user ON roulette_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_roulette_history_user ON roulette_history(user_id);

-- Комментарии к таблицам
COMMENT ON TABLE roulette_games IS 'Игры рулетки';
COMMENT ON TABLE roulette_bets IS 'Ставки игроков на рулетку';
COMMENT ON TABLE roulette_history IS 'Статистика игроков в рулетку';

-- Данные для теста
-- INSERT INTO roulette_history (user_id, total_games, total_bets, total_wagered, total_won)
-- SELECT id, 0, 0, 0, 0 FROM users WHERE id NOT IN (SELECT user_id FROM roulette_history);
