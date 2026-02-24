-- ─── OpenCity: persistent world ──────────────────────────────────────────────
-- One row per user.
-- game_time_hours : floating game hour (0.0 – 24.0, wraps)
-- last_saved_at   : real wall-clock time of last save (used to advance the
--                   game clock offline: elapsed_real / REAL_MS_PER_GAME_HOUR)
-- placed_items    : JSONB array of placed building objects

CREATE TABLE IF NOT EXISTS city_worlds (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_time_hours  DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    last_saved_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    placed_items     JSONB           NOT NULL DEFAULT '[]',
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_city_worlds_user ON city_worlds(user_id);
