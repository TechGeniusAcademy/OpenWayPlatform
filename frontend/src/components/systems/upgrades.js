// ─── Upgrade System Helpers ───────────────────────────────────────────────────

import { LEVEL_CONFIGS } from '../items/buildingLevels.js';

/** Safe default returned for types with no level config. */
const DEFAULT_CONF = {
  level: 1,
  rateMultiplier: 1.0,
  capacityMultiplier: 1.0,
  coinsPerPoint: 1000,
  scaleBonus: 0,
  accentColor: null,
  description: '',
};

/**
 * Returns the config for a given building type + level number.
 * Falls back to DEFAULT_CONF if the type or level isn't found.
 */
export function getLevelConfig(type, level = 1) {
  const configs = LEVEL_CONFIGS[type];
  if (!configs || configs.length === 0) return { ...DEFAULT_CONF, level };
  return configs.find(c => c.level === level) ?? configs[0];
}

/**
 * Returns the config for the NEXT upgrade level, or null if already maxed.
 */
export function getNextLevelConfig(type, currentLevel = 1) {
  const configs = LEVEL_CONFIGS[type];
  if (!configs) return null;
  return configs.find(c => c.level === currentLevel + 1) ?? null;
}

/**
 * Returns the maximum available level for a building type.
 */
export function getMaxLevel(type) {
  const configs = LEVEL_CONFIGS[type];
  if (!configs || configs.length === 0) return 1;
  return configs[configs.length - 1].level;
}

/**
 * Checks whether an upgrade is currently possible.
 * @param {string}  type          building type key
 * @param {number}  currentLevel
 * @param {number}  totalPoints   sum of all player city-points
 * @param {number}  userXp        player's platform experience
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkUpgrade(type, currentLevel, totalPoints, userXp) {
  const next = getNextLevelConfig(type, currentLevel);
  if (!next)                        return { ok: false, reason: 'Максимальный уровень достигнут' };
  if (totalPoints < next.pointsCost) return { ok: false, reason: `Нужно ${next.pointsCost} баллов` };
  if (userXp < next.xpRequired)     return { ok: false, reason: `Нужно ${next.xpRequired} XP` };
  return { ok: true };
}
