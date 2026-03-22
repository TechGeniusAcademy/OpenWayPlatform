// ─── Building Level Configurations ───────────────────────────────────────────
//
// ⚠️  Single source of truth: buildingsConfig.json → levels
//     Edit level stats, costs and XP thresholds ONLY in that JSON file.
//
// Fields per level:
//   level             – integer (1–N)
//   name              – Russian display name
//   pointsCost        – city points (баллы) consumed on upgrade
//   xpRequired        – minimum platform XP the user must have
//   rateMultiplier    – multiplier applied to production / pass-through rate
//   capacityMultiplier– multiplier applied to storage capacity
//   coinsPerPoint     – (town-hall only) coins needed to earn 1 point
//   scaleBonus        – how much bigger the model gets  (0 = no change)
//   accentColor       – hex color used for the main glowing accent element
//   description       – short Russian description of the improvement

import cfg from './buildingsConfig.json';

/** All level upgrade configs keyed by building type — from buildingsConfig.json */
export const LEVEL_CONFIGS = cfg.levels;

