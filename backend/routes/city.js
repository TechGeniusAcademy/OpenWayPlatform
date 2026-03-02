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
      conveyors        JSONB           NOT NULL DEFAULT '[]',
      energy_cables    JSONB           NOT NULL DEFAULT '[]',
      created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
    )
  `);
  // Add column for existing DBs that were created before conveyors were added
  await pool.query(`
    ALTER TABLE city_worlds ADD COLUMN IF NOT EXISTS conveyors JSONB NOT NULL DEFAULT '[]'
  `);
  // Add energy_cables column for existing DBs
  await pool.query(`
    ALTER TABLE city_worlds ADD COLUMN IF NOT EXISTS energy_cables JSONB NOT NULL DEFAULT '[]'
  `);
  await pool.query(`
    ALTER TABLE city_worlds ADD COLUMN IF NOT EXISTS stored_amounts JSONB NOT NULL DEFAULT '{}'
  `);
  await pool.query(`
    ALTER TABLE city_worlds ADD COLUMN IF NOT EXISTS points_amounts JSONB NOT NULL DEFAULT '{}'
  `);
  await pool.query(`
    ALTER TABLE city_worlds ADD COLUMN IF NOT EXISTS building_levels JSONB NOT NULL DEFAULT '{}'
  `);
  await pool.query(`
    ALTER TABLE city_worlds ADD COLUMN IF NOT EXISTS placed_walls JSONB NOT NULL DEFAULT '[]'
  `);
  await pool.query(`
    ALTER TABLE city_worlds ADD COLUMN IF NOT EXISTS placed_towers JSONB NOT NULL DEFAULT '[]'
  `);
  await pool.query(`
    ALTER TABLE city_worlds ADD COLUMN IF NOT EXISTS placed_fighters JSONB NOT NULL DEFAULT '[]'
  `);
  await pool.query(`
    ALTER TABLE city_worlds ADD COLUMN IF NOT EXISTS building_hp JSONB NOT NULL DEFAULT '{}'
  `);
  await pool.query(`
    ALTER TABLE city_worlds ADD COLUMN IF NOT EXISTS enemy_building_hp JSONB NOT NULL DEFAULT '{}'
  `);
}
ensureTable().catch(console.error);

// ─── Spawn-offset helper ───────────────────────────────────────────────────────
// Returns an {x, z} position at least MIN_SPAWN_DIST away from all existing
// town-halls.  Tries 16 evenly-spaced angles starting from a random offset.
const MIN_SPAWN_DIST = 220;
function computeSpawnOffset(existingTownHalls) {
  if (existingTownHalls.length === 0) return { x: 0, z: 0 };
  const angleOffset = Math.random() * Math.PI * 2;
  for (let i = 0; i < 32; i++) {
    const angle = angleOffset + (i / 32) * Math.PI * 2;
    const dist  = MIN_SPAWN_DIST + Math.floor(i / 8) * 80; // grow outward on each lap
    const x = Math.round(Math.cos(angle) * dist / 2) * 2;
    const z = Math.round(Math.sin(angle) * dist / 2) * 2;
    const tooClose = existingTownHalls.some(({ x: tx, z: tz }) =>
      Math.hypot(tx - x, tz - z) < MIN_SPAWN_DIST,
    );
    if (!tooClose) return { x, z };
  }
  return { x: 400, z: 400 }; // last-resort fallback
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/city/world
// Returns the player's world with the game clock advanced for offline time.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/world', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch existing row or create a default one
    let isNewPlayer = false;
    let row = (await pool.query(
      'SELECT * FROM city_worlds WHERE user_id = $1',
      [userId],
    )).rows[0];

    if (!row) {
      isNewPlayer = true;
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

    // Compute suggested spawn for brand-new players (away from existing town-halls)
    let suggestedSpawn = null;
    if (isNewPlayer) {
      const othersRes = await pool.query(
        `SELECT placed_items FROM city_worlds WHERE user_id != $1`,
        [userId],
      );
      const existingTownHalls = [];
      for (const r of othersRes.rows) {
        const items = r.placed_items ?? [];
        for (const item of items) {
          if (item.type === 'town-hall' && item.position) {
            existingTownHalls.push({ x: item.position[0], z: item.position[2] });
          }
        }
      }
      suggestedSpawn = computeSpawnOffset(existingTownHalls);
    }

    res.json({
      gameTimeHours,
      placedItems:    row.placed_items    ?? [],
      conveyors:      row.conveyors       ?? [],
      energyCables:   row.energy_cables   ?? [],
      storedAmounts:  row.stored_amounts  ?? {},
      pointsAmounts:  row.points_amounts  ?? {},
      buildingLevels: row.building_levels ?? {},
      placedWalls:    row.placed_walls    ?? [],
      placedTowers:   row.placed_towers   ?? [],
      placedFighters:  row.placed_fighters   ?? [],
      buildingHp:      row.building_hp        ?? {},
      enemyBuildingHp: row.enemy_building_hp  ?? {},
      suggestedSpawn,
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
    const { gameTimeHours, placedItems, conveyors, energyCables, storedAmounts, pointsAmounts, buildingLevels, placedWalls, placedTowers, placedFighters, buildingHp, enemyBuildingHp } = req.body;

    if (typeof gameTimeHours !== 'number' || !Array.isArray(placedItems)) {
      return res.status(400).json({ error: 'Неверный формат данных' });
    }

    await pool.query(
      `INSERT INTO city_worlds (user_id, game_time_hours, last_saved_at, placed_items, conveyors, energy_cables, stored_amounts, points_amounts, building_levels, placed_walls, placed_towers, placed_fighters, building_hp, enemy_building_hp)
       VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (user_id) DO UPDATE
         SET game_time_hours    = EXCLUDED.game_time_hours,
             last_saved_at      = NOW(),
             placed_items       = EXCLUDED.placed_items,
             conveyors          = EXCLUDED.conveyors,
             energy_cables      = EXCLUDED.energy_cables,
             stored_amounts     = EXCLUDED.stored_amounts,
             points_amounts     = EXCLUDED.points_amounts,
             building_levels    = EXCLUDED.building_levels,
             placed_walls       = EXCLUDED.placed_walls,
             placed_towers      = EXCLUDED.placed_towers,
             placed_fighters    = EXCLUDED.placed_fighters,
             building_hp        = EXCLUDED.building_hp,
             enemy_building_hp  = EXCLUDED.enemy_building_hp,
             updated_at         = NOW()`,
      [
        userId,
        gameTimeHours % 24,
        JSON.stringify(placedItems),
        JSON.stringify(conveyors ?? []),
        JSON.stringify(energyCables ?? []),
        JSON.stringify(storedAmounts ?? {}),
        JSON.stringify(pointsAmounts ?? {}),
        JSON.stringify(buildingLevels ?? {}),
        JSON.stringify(placedWalls ?? []),
        JSON.stringify(placedTowers ?? []),
        JSON.stringify((placedFighters ?? []).map(f => ({ ...f, state: 'idle', target: null }))),
        JSON.stringify(buildingHp ?? {}),
        JSON.stringify(enemyBuildingHp ?? {}),
      ],
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[city] PUT /world error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/city/all-worlds
// Returns all OTHER players' worlds (read-only snapshot for multiplayer view).
// ─────────────────────────────────────────────────────────────────────────────
router.get('/all-worlds', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT cw.user_id, u.username,
              cw.placed_items, cw.placed_walls, cw.placed_towers, cw.building_levels,
              cw.conveyors, cw.energy_cables, cw.stored_amounts, cw.points_amounts
       FROM city_worlds cw
       JOIN users u ON u.id = cw.user_id
       WHERE cw.user_id != $1
       ORDER BY cw.updated_at DESC`,
      [userId],
    );
    const players = result.rows.map(row => ({
      userId:        row.user_id,
      username:      row.username,
      placedItems:   row.placed_items    ?? [],
      placedWalls:   row.placed_walls    ?? [],
      placedTowers:  row.placed_towers   ?? [],
      buildingLevels: row.building_levels ?? {},
      conveyors:     row.conveyors       ?? [],
      energyCables:  row.energy_cables   ?? [],
      storedAmounts: row.stored_amounts  ?? {},
      pointsAmounts: row.points_amounts  ?? {},
    }));
    res.json({ players });
  } catch (err) {
    console.error('[city] GET /all-worlds error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
