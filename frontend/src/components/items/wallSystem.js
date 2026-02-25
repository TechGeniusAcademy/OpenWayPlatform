// ─── Wall & Tower System ──────────────────────────────────────────────────────
// Walls connect between snap points, cost coins, have HP and 7 upgradeable levels.
// Towers embed at wall endpoints with an archer figure.
// Also exports base HP for all regular buildings.
// ─────────────────────────────────────────────────────────────────────────────

/** Cost per wall segment (in-game coins). */
export const WALL_SEGMENT_COIN_COST = 20;

/** Cost to place a tower (in-game coins). */
export const TOWER_COIN_COST = 150;

/** Snap threshold — cursor snaps to existing wall endpoint within this distance. */
export const WALL_SNAP_RADIUS = 2.5;

/** Grid snap size for wall endpoints. */
export const WALL_GRID_SNAP = 2;

// ── Wall level definitions (7 levels) ─────────────────────────────────────────
export const WALL_LEVELS = [
  {
    level: 1, name: 'Деревянная',
    hp: 100, upgradeCoinCost: 0,
    color: '#92400e', accentColor: '#b45309',
    height: 2.5, thickness: 0.7,
    description: 'Базовая деревянная стена',
    upgradeDurationMs: 0,
  },
  {
    level: 2, name: 'Каменная',
    hp: 280, upgradeCoinCost: 40,
    color: '#64748b', accentColor: '#94a3b8',
    height: 2.8, thickness: 0.8,
    description: '+180% прочности, каменная кладка',
    upgradeDurationMs: 15_000,
  },
  {
    level: 3, name: 'Укреплённая',
    hp: 600, upgradeCoinCost: 100,
    color: '#475569', accentColor: '#60a5fa',
    height: 3.0, thickness: 0.9,
    description: 'Усиленная ячеистая кладка',
    upgradeDurationMs: 30_000,
  },
  {
    level: 4, name: 'Стальная',
    hp: 1100, upgradeCoinCost: 200,
    color: '#334155', accentColor: '#f59e0b',
    height: 3.2, thickness: 1.0,
    description: 'Стальные пластины поверх камня',
    upgradeDurationMs: 60_000,
  },
  {
    level: 5, name: 'Железобетон',
    hp: 2000, upgradeCoinCost: 400,
    color: '#1e293b', accentColor: '#f97316',
    height: 3.4, thickness: 1.1,
    description: 'Армированный бетон',
    upgradeDurationMs: 120_000,
  },
  {
    level: 6, name: 'Мифриловая',
    hp: 3500, upgradeCoinCost: 800,
    color: '#0f172a', accentColor: '#a78bfa',
    height: 3.6, thickness: 1.2,
    description: 'Мифриловый сплав',
    upgradeDurationMs: 300_000,
  },
  {
    level: 7, name: 'Адамантовая',
    hp: 6000, upgradeCoinCost: 1500,
    color: '#020617', accentColor: '#f43f5e',
    height: 4.0, thickness: 1.4,
    description: 'Нерушимый адамант — максимальная прочность',
    upgradeDurationMs: 600_000,
  },
];

// ── Tower level definitions (5 levels) ───────────────────────────────────────
export const TOWER_LEVELS = [
  {
    level: 1, name: 'Деревянная башня',
    hp: 200, upgradeCoinCost: 0,
    color: '#92400e', accentColor: '#b45309',
    arrowDamage: 10, arrowRange: 15,
    description: 'Деревянный лучник на вышке',
    upgradeDurationMs: 0,
  },
  {
    level: 2, name: 'Каменная башня',
    hp: 500, upgradeCoinCost: 80,
    color: '#64748b', accentColor: '#94a3b8',
    arrowDamage: 22, arrowRange: 18,
    description: 'Укреплённая башня с обученным лучником',
    upgradeDurationMs: 20_000,
  },
  {
    level: 3, name: 'Сторожевая',
    hp: 1000, upgradeCoinCost: 200,
    color: '#475569', accentColor: '#60a5fa',
    arrowDamage: 40, arrowRange: 22,
    description: 'Арбалетчик с бронебойными болтами',
    upgradeDurationMs: 45_000,
  },
  {
    level: 4, name: 'Боевая башня',
    hp: 2200, upgradeCoinCost: 450,
    color: '#334155', accentColor: '#f59e0b',
    arrowDamage: 70, arrowRange: 26,
    description: 'Мастер-стрелок, двойная скорострельность',
    upgradeDurationMs: 120_000,
  },
  {
    level: 5, name: 'Крепостная башня',
    hp: 4500, upgradeCoinCost: 1000,
    color: '#1e293b', accentColor: '#f43f5e',
    arrowDamage: 120, arrowRange: 32,
    description: 'Легендарный снайпер — максимальный урон',
    upgradeDurationMs: 300_000,
  },
];

/** Base max HP for every standard building type at level 1. */
export const BUILDING_BASE_HP = {
  'solar-panel':    150,
  'energy-storage': 300,
  'street-lamp':     80,
  'money-factory':  250,
  'town-hall':      800,
  'extractor':      200,
  'splitter':       120,
  'merger':         120,
  'conveyor':        60,
  'cable':           40,
  'builder-house':  350,
};

/** HP multiplier per level for regular buildings (applied additively per level above 1). */
export const BUILDING_HP_LEVEL_BONUS = 0.35; // +35% per level

/** Get max HP for a regular building at a given level. */
export function getBuildingMaxHp(type, level = 1) {
  const base = BUILDING_BASE_HP[type] ?? 100;
  return Math.round(base * (1 + BUILDING_HP_LEVEL_BONUS * (level - 1)));
}

/** Get wall config for a level (1-based). */
export function getWallLevelConfig(level) {
  return WALL_LEVELS[Math.min(level, WALL_LEVELS.length) - 1];
}

/** Get tower config for a level (1-based). */
export function getTowerLevelConfig(level) {
  return TOWER_LEVELS[Math.min(level, TOWER_LEVELS.length) - 1];
}

/** Snap a world coordinate to the nearest wall grid point or existing endpoint. */
export function snapWallPoint(x, z, existingWalls = [], existingTowers = []) {
  let bestDist = WALL_SNAP_RADIUS;
  let snapped  = null;

  // Snap to existing wall endpoints first
  for (const w of existingWalls) {
    for (const pt of [w.from, w.to]) {
      const d = Math.hypot(x - pt.x, z - pt.z);
      if (d < bestDist) { bestDist = d; snapped = { x: pt.x, z: pt.z }; }
    }
  }
  // Snap to tower positions
  for (const t of existingTowers) {
    const d = Math.hypot(x - t.position[0], z - t.position[2]);
    if (d < bestDist) { bestDist = d; snapped = { x: t.position[0], z: t.position[2] }; }
  }

  if (snapped) return snapped;

  // Snap to grid
  const g = WALL_GRID_SNAP;
  return { x: Math.round(x / g) * g, z: Math.round(z / g) * g };
}
