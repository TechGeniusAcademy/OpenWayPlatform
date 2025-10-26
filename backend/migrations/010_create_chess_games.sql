-- Таблица для онлайн шахматных игр
CREATE TABLE IF NOT EXISTS chess_games (
  id SERIAL PRIMARY KEY,
  white_player_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  black_player_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenger_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, active, finished, declined
  position TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', -- FEN notation
  move_history JSONB DEFAULT '[]', -- История ходов
  result VARCHAR(20), -- white, black, draw
  end_reason VARCHAR(50), -- checkmate, stalemate, resignation, timeout, draw_agreement
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  last_move_at TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_chess_games_white_player ON chess_games(white_player_id);
CREATE INDEX IF NOT EXISTS idx_chess_games_black_player ON chess_games(black_player_id);
CREATE INDEX IF NOT EXISTS idx_chess_games_status ON chess_games(status);
CREATE INDEX IF NOT EXISTS idx_chess_games_created_at ON chess_games(created_at DESC);
