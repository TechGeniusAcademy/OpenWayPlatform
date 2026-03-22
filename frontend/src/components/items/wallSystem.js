// ─── Wall & Tower System ──────────────────────────────────────────────────────
// Walls connect between snap points, cost coins, have HP and 7 upgradeable levels.
// Towers embed at wall endpoints with an archer figure.
// Also exports base HP for all regular buildings.
//
// ⚠️  Single source of truth: buildingsConfig.json → walls / archerTowers
//     Edit wall levels, tower levels, and all costs ONLY in that JSON file.
// ─────────────────────────────────────────────────────────────────────────────

import cfg from './buildingsConfig.json';

/** Cost per wall segment (in-game coins) — from buildingsConfig.json */
export const WALL_SEGMENT_COIN_COST = cfg.walls.segmentCoinCost;

/** Cost to place a tower (in-game coins) — from buildingsConfig.json */
export const TOWER_COIN_COST = cfg.archerTowers.placeCoinCost;

/** Snap threshold — cursor snaps to existing wall endpoint within this distance — from buildingsConfig.json */
export const WALL_SNAP_RADIUS = cfg.walls.snapRadius;

/** Grid snap size for wall endpoints — from buildingsConfig.json */
export const WALL_GRID_SNAP = cfg.walls.gridSnap;

/** Wall level definitions (7 levels) — from buildingsConfig.json */
export const WALL_LEVELS = cfg.walls.levels;

/** Tower level definitions (5 levels) — from buildingsConfig.json */
export const TOWER_LEVELS = cfg.archerTowers.levels;

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
