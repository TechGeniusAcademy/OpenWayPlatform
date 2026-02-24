// ─── backend/routes/city.js ───────────────────────────────────────────────────
//
// REST API for OpenCity persistent world.
//
//  GET  /api/city/world   — load (or create) world, advance offline clock
//  PUT  /api/city/world   — save current state
//
// The game clock advances server-side while the player is offline:
//   elapsed_real_ms = NOW() − last_saved_at
//   delta_game_hours = elapsed_real_ms / REAL_MS_PER_GAME_HOUR
//   current_game_hours = (stored_game_hours + delta_game_hours) % 24

import express         from 'express';
import jwt             from 'jsonwebtoken';
import pool            from '../config/database.js';

const router = express.Router();

// ─── 5 real minutes = 1 game hour (must match frontend dayNight.js) ──────────
const REAL_MS_PER_GAME_HOUR = 5 * 60 * 1000;

// ─── Auth middleware ──────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Токен не предоставлен' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { ...decoded, id: decoded.userId };
    next();
  } catch {
    res.status(401).json({ error: 'Недействительный токен' });
  }
};

// ─── Ensure migration ran ─────────────────────────────────────────────────────
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS city_worlds (
      id               SERIAL PRIMARY KEY,
      user_id          INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      game_time_hours  DOUBLE PRECISION NOT NULL DEFAULT 8.0,
      last_saved_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
      placed_items     JSONB           NOT NULL DEFAULT '[]',
      created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
    )
  `);
}
ensureTable().catch(console.error);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/city/world
// Returns the player's world with the game clock advanced for offline time.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/world', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch existing row or create a default one
    let row = (await pool.query(
      'SELECT * FROM city_worlds WHERE user_id = $1',
      [userId],
    )).rows[0];

    if (!row) {
      row = (await pool.query(
        `INSERT INTO city_worlds (user_id, game_time_hours, last_saved_at, placed_items)
         VALUES ($1, 8.0, NOW(), '[]')
         RETURNING *`,
        [userId],
      )).rows[0];
    }

    // Advance game clock for time spent offline
    const now           = Date.now();
    const lastSavedMs   = new Date(row.last_saved_at).getTime();
    const elapsedRealMs = Math.max(0, now - lastSavedMs);
    const deltaGameHours = elapsedRealMs / REAL_MS_PER_GAME_HOUR;
    const gameTimeHours  = (parseFloat(row.game_time_hours) + deltaGameHours) % 24;

    // Persist the advanced clock so the next load doesn't double-count
    await pool.query(
      `UPDATE city_worlds
       SET game_time_hours = $2, last_saved_at = NOW(), updated_at = NOW()
       WHERE user_id = $1`,
      [userId, gameTimeHours],
    );

    res.json({
      gameTimeHours,
      placedItems: row.placed_items ?? [],
      offlineHours: parseFloat((deltaGameHours).toFixed(2)),
    });
  } catch (err) {
    console.error('[city] GET /world error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/city/world
// Save current game state. Body: { gameTimeHours, placedItems }
// ─────────────────────────────────────────────────────────────────────────────
router.put('/world', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { gameTimeHours, placedItems } = req.body;

    if (typeof gameTimeHours !== 'number' || !Array.isArray(placedItems)) {
      return res.status(400).json({ error: 'Неверный формат данных' });
    }

    await pool.query(
      `INSERT INTO city_worlds (user_id, game_time_hours, last_saved_at, placed_items)
       VALUES ($1, $2, NOW(), $3)
       ON CONFLICT (user_id) DO UPDATE
         SET game_time_hours = EXCLUDED.game_time_hours,
             last_saved_at   = NOW(),
             placed_items    = EXCLUDED.placed_items,
             updated_at      = NOW()`,
      [userId, gameTimeHours % 24, JSON.stringify(placedItems)],
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[city] PUT /world error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
