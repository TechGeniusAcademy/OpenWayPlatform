// ─── Collision footprints ─────────────────────────────────────────────────────
// AABB (axis-aligned bounding box) half-extents in world units.
// hw = half-width along X,  hd = half-depth along Z.
//
// ⚠️  Single source of truth: buildingsConfig.json → collisionFootprints
//     Edit footprint sizes ONLY in that JSON file.

import cfg from './buildingsConfig.json';

/** Physical collision half-extents per building type — from buildingsConfig.json */
export const ITEM_FOOTPRINTS = cfg.collisionFootprints;

// ─── Energy-generator exclusion zones ────────────────────────────────────────
// Energy-generating buildings (those with a zone-based power radius) also
// enforce a larger keep-clear radius beyond their physical footprint.
// • No other building may be placed inside this zone.
// • An energy generator may not be placed so that its own exclusion zone
//   overlaps with any existing building's effective zone.
//
// These values are used INSTEAD OF the physical footprint in isColliding().
// The path-routing helpers (isPointInsideBuilding / isSegmentIntersectsBuilding)
// continue to use the smaller physical footprints.
//
// ⚠️  Single source of truth: buildingsConfig.json → energyExclusionZones

/** Energy exclusion zones per generator type — from buildingsConfig.json */
export const ENERGY_EXCLUSION_ZONES = cfg.energyExclusionZones;

// ─── Helper: pick the right zone for collision purposes ──────────────────────
// Energy generators use their exclusion zone; all others use the footprint.
function effectiveZone(type) {
  return ENERGY_EXCLUSION_ZONES[type] ?? ITEM_FOOTPRINTS[type] ?? null;
}

// ─── 2D OBB overlap via Separating Axis Theorem ─────────────────────────────
// Returns true when two oriented rectangles overlap.
// Each rect: center (cx,cz), half-extents (hw,hd), rotation rotY (radians, Y-up).
function obbOverlap(ax, az, ahw, ahd, aRot, bx, bz, bhw, bhd, bRot) {
  const dx = bx - ax;
  const dz = bz - az;

  const caA = Math.cos(aRot), saA = Math.sin(aRot);  // A local axes
  const caB = Math.cos(bRot), saB = Math.sin(bRot);  // B local axes

  // 4 candidate separating axes: A's X, A's Z, B's X, B's Z
  const axes = [
    [ caA,  saA],
    [-saA,  caA],
    [ caB,  saB],
    [-saB,  caB],
  ];

  for (const [nx, nz] of axes) {
    const dist = Math.abs(dx * nx + dz * nz);
    const rA = ahw * Math.abs( caA * nx + saA * nz) + ahd * Math.abs(-saA * nx + caA * nz);
    const rB = bhw * Math.abs( caB * nx + saB * nz) + bhd * Math.abs(-saB * nx + caB * nz);
    if (dist >= rA + rB) return false;  // gap found → no overlap
  }
  return true;  // no separating axis → overlap
}

// ─── Collision check ──────────────────────────────────────────────────────────

/**
 * Returns true if placing `type` at `pos` (rotated by `rotY` radians) would
 * cause its zone to overlap the zone of any already-placed item.
 *
 * Uses OBB SAT so non-square footprints properly account for rotation.
 *
 * @param {{ x: number, z: number }} pos    – candidate world position
 * @param {string|null}              type   – item type being placed
 * @param {Array}                    placed – already placed items
 * @param {number}                   rotY   – Y-rotation of the new item (radians)
 */
export function isColliding(pos, type, placed, rotY = 0) {
  const a = effectiveZone(type);
  if (!a || !placed?.length) return false;

  for (const item of placed) {
    const b = effectiveZone(item.type);
    if (!b) continue;

    if (obbOverlap(
      pos.x,          pos.z,          a.hw, a.hd, rotY,
      item.position[0], item.position[2], b.hw, b.hd, item.rotation ?? 0,
    )) return true;
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
