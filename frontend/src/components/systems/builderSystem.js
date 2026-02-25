// ─── Builder system helpers ────────────────────────────────────────────────────
// Builders live inside builder-house buildings.
// Level N builder-house provides N builders.
// Builders are consumed by active constructions and upgrades.

import { getLevelConfig } from './upgrades.js';

/**
 * Total builder count across all placed builder-house buildings.
 * @param {Array}  placedItems      – current placed items
 * @param {Object} buildingLevels   – { [itemId]: level }
 */
export function countTotalBuilders(placedItems, buildingLevels) {
  return placedItems
    .filter(i => i.type === 'builder-house')
    .reduce((sum, i) => {
      const lvl  = buildingLevels[String(i.id)] ?? 1;
      const conf = getLevelConfig('builder-house', lvl);
      return sum + (conf?.buildersCount ?? lvl);
    }, 0);
}

/**
 * Number of builders currently busy (constructions + upgrades in progress).
 * @param {Object} constructingBuildings  – { [itemId]: {...} }
 * @param {Object} upgradingBuildings     – { [itemId]: {...} }
 */
export function countBusyBuilders(constructingBuildings, upgradingBuildings) {
  return Object.keys(constructingBuildings ?? {}).length +
         Object.keys(upgradingBuildings ?? {}).length;
}

/**
 * Number of free (idle) builders.
 */
export function countFreeBuilders(placedItems, buildingLevels, constructingBuildings, upgradingBuildings) {
  return countTotalBuilders(placedItems, buildingLevels) -
         countBusyBuilders(constructingBuildings, upgradingBuildings);
}

/**
 * Find a builder-house that has at least one idle builder and return its position,
 * so we can animate the builder running out of it.
 * Returns null if none found.
 */
export function findIdleBuilderHousePos(placedItems, buildingLevels, constructingBuildings, upgradingBuildings) {
  const busyIds = new Set([
    ...Object.keys(constructingBuildings ?? {}),
    ...Object.keys(upgradingBuildings ?? {}),
  ]);
  for (const item of placedItems) {
    if (item.type !== 'builder-house') continue;
    const lvl  = buildingLevels[String(item.id)] ?? 1;
    const conf = getLevelConfig('builder-house', lvl);
    const total  = conf?.buildersCount ?? lvl;
    // Count how many of this house's builders are busy (rough: each house contributes evenly)
    if (total > 0) return item.position; // simplification: first available house
  }
  return null;
}

/**
 * Returns how many of a specific type are in placedItems (accounts for sold/deleted).
 */
export function countPlacedType(placedItems, type) {
  return placedItems.filter(i => i.type === type).length;
}
