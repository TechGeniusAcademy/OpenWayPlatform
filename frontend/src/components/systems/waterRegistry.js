/**
 * Global registry of procedurally-placed water body positions.
 * WorldChunks registers each WaterBody on mount and deregisters on unmount.
 * Pump placement validation queries this registry.
 */

const _waters = new Map();

// Round to nearest integer for key stability across floating-point positions
const _key = (x, z) => `${Math.round(x)},${Math.round(z)}`;

/** Register a water body at world position (x, z) with given radius. */
export function registerWaterBody(x, z, radius) {
  _waters.set(_key(x, z), { x, z, radius });
}

/** Remove a water body (called on WorldChunks chunk unmount). */
export function unregisterWaterBody(x, z) {
  _waters.delete(_key(x, z));
}

/**
 * Returns the nearest water body within maxDist world units of (x, z),
 * or null if none is within range.
 */
export function findNearestWater(x, z, maxDist = 8) {
  let best     = null;
  let bestDist = Infinity;
  for (const w of _waters.values()) {
    const dist = Math.sqrt((w.x - x) ** 2 + (w.z - z) ** 2);
    if (dist < maxDist && dist < bestDist) {
      bestDist = dist;
      best     = w;
    }
  }
  return best;
}
