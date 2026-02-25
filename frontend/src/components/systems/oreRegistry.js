/**
 * Global registry of procedurally-placed ore deposit world positions.
 * WorldChunks registers each OreDeposit on mount and deregisters on unmount.
 * Extractor placement validation queries this registry.
 */

const _deposits = new Map(); // `${rx},${rz}` → { x, z, name, icon, color }

// Round to nearest integer for key stability across floating-point positions
const _key = (x, z) => `${Math.round(x)},${Math.round(z)}`;

/** Register an ore deposit at world position (x, z). */
export function registerOreDeposit(x, z, name, icon, color) {
  _deposits.set(_key(x, z), { x, z, name, icon, color });
}

/** Remove an ore deposit (called on WorldChunks chunk unmount). */
export function unregisterOreDeposit(x, z) {
  _deposits.delete(_key(x, z));
}

/**
 * Returns the nearest ore deposit within maxDist world units of (x, z),
 * or null if none is within range.
 */
export function findNearestOreDeposit(x, z, maxDist = 6) {
  let best = null;
  let bestDist = Infinity;
  for (const d of _deposits.values()) {
    const dist = Math.sqrt((d.x - x) ** 2 + (d.z - z) ** 2);
    if (dist < maxDist && dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best;
}

/**
 * Minimum extractor level required to mine each ore type.
 * A level-N extractor can mine any ore with required level ≤ N.
 */
export const ORE_REQUIRED_LEVEL = {
  'Уголь':   1,
  'Железо':  2,
  'Серебро': 3,
  'Золото':  4,
  'Алмаз':   5,
};

/** Returns true if an extractor at `level` can mine `oreType`. */
export function canMineOre(level, oreType) {
  const req = ORE_REQUIRED_LEVEL[oreType];
  if (req === undefined) return false;
  return level >= req;
}
