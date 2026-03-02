// ─── hpSystem.js — HP (hit points) for buildings and fighters ────────────────
//
// Every building type has a base max HP. When current HP reaches 0 the object
// is "destroyed" and shows a rubble visual instead of the normal model.
// Players can repair destroyed / damaged objects by spending platform points.
//
// buildingHp shape:   { [itemId]: { current: number, max: number } }
// fighterHp  shape:   { [fighterId]: { current: number, max: number } }
//  – both are stored together in a single `objectHp` map, with fighters keyed
//    by their id (same namespace as item ids — ids are unique Date.now() ints).

// ─── Max HP by building type ──────────────────────────────────────────────────
export const MAX_HP = {
  'town-hall':       800,
  'money-factory':   400,
  'energy-storage':  350,
  'solar-panel':     200,
  'street-lamp':     120,
  'extractor':       300,
  'builder-house':   250,
  'coal-generator':  500,
  'hangar':          600,
  // fallback for unknown types
  _default:          200,
};

// HP for fighter jets
export const FIGHTER_MAX_HP = 150;

// Damage dealt by one missile impact
export const MISSILE_DAMAGE = 120;

// Repair cost: points per % of max HP restored
// e.g. fully repairing a 800-HP town-hall costs 800/HP_PER_POINT points
export const REPAIR_COST_PER_HP = 0.5; // platform points per 1 HP

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns initial HP object for a building type */
export function initHp(type) {
  const max = MAX_HP[type] ?? MAX_HP._default;
  return { current: max, max };
}

/** Returns initial HP object for a fighter */
export function initFighterHp() {
  return { current: FIGHTER_MAX_HP, max: FIGHTER_MAX_HP };
}

/**
 * Applies damage to an HP object. Returns new HP object (current clamped ≥ 0).
 * Does NOT mutate the input.
 */
export function applyDamage(hpObj, damage) {
  const current = Math.max(0, (hpObj?.current ?? hpObj?.max ?? 100) - damage);
  return { ...hpObj, current };
}

/** Returns true if the object is destroyed (HP ≤ 0) */
export function isDestroyed(hpObj) {
  if (!hpObj) return false;
  return (hpObj.current ?? hpObj.max ?? 1) <= 0;
}

/**
 * Calculates how many platform points it costs to fully repair an object.
 * Partial repair costs proportionally less.
 */
export function repairCost(hpObj) {
  if (!hpObj) return 0;
  const missing = (hpObj.max ?? 100) - (hpObj.current ?? hpObj.max ?? 100);
  return Math.ceil(missing * REPAIR_COST_PER_HP);
}

/**
 * Finds the nearest placedItem or fighter whose position is within maxDist
 * world units of `pos`. Returns the matching id or null.
 *
 * @param {[number,number,number]} pos         – world position of impact
 * @param {Array}  placedItems     – own placed items
 * @param {Array}  placedFighters  – own fighters
 * @param {number} maxDist         – search radius (world units)
 * @returns {{ id: string|number, type: 'building'|'fighter' } | null}
 */
export function findNearestDamageable(pos, placedItems, placedFighters, maxDist = 12) {
  let bestDist = maxDist;
  let best     = null;

  for (const item of placedItems) {
    const dx = (item.position[0] ?? 0) - pos[0];
    const dz = (item.position[2] ?? 0) - pos[2];
    const d  = Math.hypot(dx, dz);
    if (d < bestDist) { bestDist = d; best = { id: item.id, type: 'building' }; }
  }

  for (const f of placedFighters) {
    const dx = (f.position[0] ?? 0) - pos[0];
    const dz = (f.position[2] ?? 0) - pos[2];
    const d  = Math.hypot(dx, dz);
    if (d < bestDist) { bestDist = d; best = { id: f.id, type: 'fighter' }; }
  }

  return best;
}
