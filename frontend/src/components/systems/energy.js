// ─── Energy System ────────────────────────────────────────────────────────────
//
// HOW TO ADD ENERGY PRODUCTION TO A NEW OBJECT
// ─────────────────────────────────────────────
// In your item's config file (e.g. myBuilding.js):
//
//   import { registerProducer } from '../systems/energy.js';
//
//   registerProducer('my-building-type', [
//     {
//       type:         'solar',          // energy type key (see ENERGY_TYPES below)
//       ratePerHour:  8,                // units generated per game-hour
//       activeWhen:   h => h >= 6 && h <= 20,  // optional: only during daytime
//       //  omit activeWhen to produce 24 h/day
//     },
//   ]);
//
// That's it. The HUD totals and floating badges update automatically.

// ─── Energy type catalogue ────────────────────────────────────────────────────

export const ENERGY_TYPES = {
  solar: { id: 'solar', icon: '☀️', label: 'Солнечная', color: '#fde047', unit: 'кВт' },
  wind:  { id: 'wind',  icon: '💨', label: 'Ветровая',  color: '#7dd3fc', unit: 'кВт' },
  fuel:  { id: 'fuel',  icon: '🔥', label: 'Топливная', color: '#fb923c', unit: 'л'   },
};

// ─── Internal registry ────────────────────────────────────────────────────────

/** @type {Map<string, Array<ProductionEntry>>} */
const REGISTRY = new Map();

/**
 * Register energy production for an item type.
 * Call this once at module level in each item config file.
 *
 * @param {string} itemType  e.g. 'solar-panel'
 * @param {Array<{type: string, ratePerHour: number, activeWhen?: (h:number)=>boolean}>} productions
 */
export function registerProducer(itemType, productions) {
  REGISTRY.set(itemType, productions);
}

/**
 * Returns the production entries for a given item type (empty array if none).
 * @param {string} itemType
 */
export function getProductions(itemType) {
  return REGISTRY.get(itemType) ?? [];
}

/**
 * Returns true if this item type produces any energy.
 * @param {string} itemType
 */
export function isProducer(itemType) {
  return REGISTRY.has(itemType) && REGISTRY.get(itemType).length > 0;
}

// ─── Calculations ─────────────────────────────────────────────────────────────

/**
 * Calculate total energy per type for all currently placed items.
 *
 * @param {Array<{type: string}>} placedItems
 * @param {number}                gameHour     current in-game hour (0–24)
 * @returns {{ [energyType: string]: number }}  e.g. { solar: 20, fuel: 5 }
 */
export function calcEnergyTotals(placedItems, gameHour) {
  const totals = {};
  for (const item of placedItems) {
    for (const prod of getProductions(item.type)) {
      const active = !prod.activeWhen || prod.activeWhen(gameHour);
      if (active) {
        totals[prod.type] = (totals[prod.type] ?? 0) + prod.ratePerHour;
      }
    }
  }
  return totals;
}
