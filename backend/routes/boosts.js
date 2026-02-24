import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

export const BOOST_CONFIG = {
  1: { label: 'Буст I',  xpPerTick: 1, durationHours: 24, cost: 1000, color: '#6366f1' },
  2: { label: 'Буст II', xpPerTick: 5, durationHours: 24, cost: 5000, color: '#f59e0b' },
};

// ─── Create table on startup ──────────────────────────────
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_boosts (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        boost_level INTEGER NOT NULL,
        expires_at  TIMESTAMP NOT NULL,
        created_at  TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_user_boosts_user    ON user_boosts(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_boosts_expires ON user_boosts(expires_at);
    `);
  } catch (err) {
    console.error('Boost table init error:', err.message);
  }
})();

// ─── XP Tick (every 5 minutes) ──────────────────────────
export const startBoostXpTick = () => {
  const tick = async () => {
    try {
      // Sum xp per user from all non-expired boosts
      const result = await pool.query(`
        SELECT user_id,
               SUM(CASE WHEN boost_level = 1 THEN 1 ELSE 0 END) AS level1_count,
               SUM(CASE WHEN boost_level = 2 THEN 5 ELSE 0 END) AS level2_xp
        FROM user_boosts
        WHERE expires_at > NOW()
        GROUP BY user_id
      `);

      for (const row of result.rows) {
        const xp = parseInt(row.level1_count) + parseInt(row.level2_xp);
        if (xp > 0) {
          await pool.query(
            'UPDATE users SET experience = COALESCE(experience, 0) + $1 WHERE id = $2',
            [xp, row.user_id]
          );
        }
      }

      // Clean up expired boosts
      await pool.query('DELETE FROM user_boosts WHERE expires_at <= NOW()');
    } catch (err) {
      console.error(err.message);
    }
  };

  setInterval(tick, 5 * 60 * 1000);
};

// ─── Auth middleware ──────────────────────────────────────
router.use(authenticate);

// GET /api/boosts/active — get current user's active boosts
router.get('/active', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, boost_level, expires_at, created_at
       FROM user_boosts
       WHERE user_id = $1 AND expires_at > NOW()
       ORDER BY boost_level ASC, expires_at ASC`,
      [req.user.id]
    );
    res.json({ boosts: result.rows });
  } catch (err) {
    console.error('Error getting boosts:', err);
    res.status(500).json({ error: 'Failed to get boosts' });
  }
});

// POST /api/boosts/purchase — buy a boost
router.post('/purchase', async (req, res) => {
  const level = parseInt(req.body.level);
  const cfg = BOOST_CONFIG[level];
  if (!cfg) return res.status(400).json({ error: 'Неверный уровень буста (1 или 2)' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userRow = await client.query(
      'SELECT points FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!userRow.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const currentPoints = userRow.rows[0].points || 0;
    if (currentPoints < cfg.cost) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Недостаточно баллов',
        required: cfg.cost,
        current: currentPoints,
      });
    }

    // Deduct points
    await client.query(
      'UPDATE users SET points = points - $1 WHERE id = $2',
      [cfg.cost, req.user.id]
    );

    // Create boost record
    const boostResult = await client.query(
      `INSERT INTO user_boosts (user_id, boost_level, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '24 hours')
       RETURNING *`,
      [req.user.id, level]
    );

    const updatedPoints = await client.query(
      'SELECT points FROM users WHERE id = $1',
      [req.user.id]
    );

    await client.query('COMMIT');

    res.json({
      message: `${cfg.label} активирован на 24 часа! +${cfg.xpPerTick} XP каждые 5 минут.`,
      boost: boostResult.rows[0],
      remainingPoints: updatedPoints.rows[0].points,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error purchasing boost:', err);
    res.status(500).json({ error: 'Ошибка покупки' });
  } finally {
    client.release();
  }
});

export default router;
