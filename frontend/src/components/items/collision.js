// ─── Collision footprints ─────────────────────────────────────────────────────
// AABB (axis-aligned bounding box) half-extents in world units.
// hw = half-width along X,  hd = half-depth along Z.
//
// Tune these values to match the actual visible base of each model.
// They are independent from the workArea sizes in the item config files.

export const ITEM_FOOTPRINTS = {
  'solar-panel': {
    hw: 4,    // ← half of the model's width
    hd: 4,    // ← half of the model's depth
  },
  'money-factory': {
    hw: 7,
    hd: 7,
  },
};

// ─── Collision check ──────────────────────────────────────────────────────────

/**
 * Returns true if placing `type` at `pos` would overlap any already-placed item.
 *
 * @param {{ x: number, z: number }} pos       – candidate world position
 * @param {string|null}              type      – item type being placed
 * @param {Array<{type:string, position:[number,number,number]}>} placed
 */
export function isColliding(pos, type, placed) {
  const a = ITEM_FOOTPRINTS[type];
  if (!a || !placed?.length) return false;

  for (const item of placed) {
    const b = ITEM_FOOTPRINTS[item.type];
    if (!b) continue;

    const dx = Math.abs(pos.x - item.position[0]);
    const dz = Math.abs(pos.z - item.position[2]);

    // Separating-axis test: overlap when BOTH diffs are smaller than combined extents
    if (dx < a.hw + b.hw && dz < a.hd + b.hd) return true;
  }
  return false;
}
