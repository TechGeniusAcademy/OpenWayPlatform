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
  'energy-storage': {
    hw: 5,
    hd: 5,
  },
  'town-hall': {
    hw: 5,
    hd: 5,
  },
  'street-lamp': {
    hw: 1.5,
    hd: 1.5,
  },
  'splitter': {
    hw: 1.5,
    hd: 1.5,
  },
  'merger': {
    hw: 1.5,
    hd: 1.5,
  },
  'extractor': {
    hw: 2.5,
    hd: 2.5,
  },
  'builder-house': {
    hw: 3.5,
    hd: 3.5,
  },
  'coal-generator': {
    hw: 5,
    hd: 5,
  },
  'hangar': {
    hw: 8,
    hd: 8,
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

/**
 * Returns true if the world point (px, pz) is inside any placed building's AABB.
 * Buildings whose IDs are in `excludeIds` are skipped (source/dest buildings).
 *
 * @param {number}              px
 * @param {number}              pz
 * @param {Array}               placed
 * @param {Set<number>}         excludeIds
 */
export function isPointInsideBuilding(px, pz, placed, excludeIds) {
  if (!placed?.length) return false;
  for (const item of placed) {
    if (excludeIds?.has(item.id)) continue;
    const fp = ITEM_FOOTPRINTS[item.type];
    if (!fp) continue;
    const dx = Math.abs(px - item.position[0]);
    const dz = Math.abs(pz - item.position[2]);
    if (dx < fp.hw && dz < fp.hd) return true;
  }
  return false;
}

/**
 * Returns true if the line segment from (ax,az) to (bx,bz) passes through
 * any placed building's AABB (slab method).  Buildings in `excludeIds` are skipped.
 *
 * @param {number}      ax
 * @param {number}      az
 * @param {number}      bx
 * @param {number}      bz
 * @param {Array}       placed
 * @param {Set<number>} excludeIds
 */
export function isSegmentIntersectsBuilding(ax, az, bx, bz, placed, excludeIds) {
  if (!placed?.length) return false;
  const dx = bx - ax;
  const dz = bz - az;

  for (const item of placed) {
    if (excludeIds?.has(item.id)) continue;
    const fp = ITEM_FOOTPRINTS[item.type];
    if (!fp) continue;

    const cx = item.position[0];
    const cz = item.position[2];
    const { hw, hd } = fp;

    // Slab method: find t-interval where the ray is inside the X slab
    let tMin = 0, tMax = 1;

    if (Math.abs(dx) < 1e-9) {
      // Segment is vertical in X — must be within slab
      if (ax < cx - hw || ax > cx + hw) continue;
    } else {
      let t0 = (cx - hw - ax) / dx;
      let t1 = (cx + hw - ax) / dx;
      if (t0 > t1) { const tmp = t0; t0 = t1; t1 = tmp; }
      tMin = Math.max(tMin, t0);
      tMax = Math.min(tMax, t1);
      if (tMin > tMax) continue;
    }

    if (Math.abs(dz) < 1e-9) {
      // Segment is vertical in Z — must be within slab
      if (az < cz - hd || az > cz + hd) continue;
    } else {
      let t0 = (cz - hd - az) / dz;
      let t1 = (cz + hd - az) / dz;
      if (t0 > t1) { const tmp = t0; t0 = t1; t1 = tmp; }
      tMin = Math.max(tMin, t0);
      tMax = Math.min(tMax, t1);
      if (tMin > tMax) continue;
    }

    return true;
  }
  return false;
}
