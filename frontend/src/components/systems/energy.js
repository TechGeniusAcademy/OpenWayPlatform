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
// HOW TO ADD ENERGY STORAGE TO A NEW OBJECT
// ─────────────────────────────────────────────
// In your item's config file:
//
//   import { registerStorage } from '../systems/energy.js';
//
//   registerStorage('my-storage-type', [
//     { type: 'solar', capacity: 200, unit: 'кВт·ч' },
//     { type: 'fuel',  capacity: 80,  unit: 'л'     },
//   ]);
//
// That's it. The HUD storage panel and floating 🔋 badges update automatically.

// ─── Energy type catalogue ────────────────────────────────────────────────────

export const ENERGY_TYPES = {
  solar: { id: 'solar', icon: '☀️', label: 'Солнечная', color: '#fde047', unit: 'кВт' },
  wind:  { id: 'wind',  icon: '💨', label: 'Ветровая',  color: '#7dd3fc', unit: 'кВт' },
  fuel:  { id: 'fuel',  icon: '🔥', label: 'Топливная', color: '#fb923c', unit: 'л'   },
  coins: { id: 'coins', icon: '🪙', label: 'Монеты',    color: '#fbbf24', unit: 'монет' },
  ore:   { id: 'ore',   icon: '⛏️', label: 'Руда',      color: '#a8874a', unit: 'ед.' },
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

// ─── Storage registry ─────────────────────────────────────────────────────────

const STORAGE_REGISTRY = new Map();

/**
 * Register energy storage capacity for an item type.
 *
 * @param {string} itemType
 * @param {Array<{type: string, capacity: number, unit?: string}>} storages
 *
 * Example:
 *   registerStorage('energy-storage', [
 *     { type: 'solar', capacity: 100, unit: 'кВт·ч' },
 *     { type: 'fuel',  capacity: 50,  unit: 'л'     },
 *   ]);
 */
export function registerStorage(itemType, storages) {
  STORAGE_REGISTRY.set(itemType, storages);
}

/**
 * Get storage definitions for a given item type.
 * @param {string} itemType
 * @returns {Array<{type: string, capacity: number, unit?: string}>}
 */
export function getStorages(itemType) {
  return STORAGE_REGISTRY.get(itemType) ?? [];
}

/**
 * Returns true if this item type has any registered storage capacity.
 * @param {string} itemType
 */
export function isStorage(itemType) {
  return STORAGE_REGISTRY.has(itemType) && STORAGE_REGISTRY.get(itemType).length > 0;
}

// ─── Energy zone registry ─────────────────────────────────────────────────────
// Producers register the rectangular zone (width × depth, centred on building)
// within which other buildings receive power.

const ENERGY_ZONE_REGISTRY = new Map();

/**
 * Register the energy-supply zone for a producer type.
 * @param {string} itemType
 * @param {{ width: number, depth: number }} zone
 */
export function registerEnergyZone(itemType, zone) {
  ENERGY_ZONE_REGISTRY.set(itemType, zone);
}

/**
 * Returns a Set of placed-item IDs that are currently powered (within the
 * work zone of at least one active energy generator).
 * Producers are always considered powered (they power themselves).
 *
 * @param {Array<{id, type, position: [number,number,number]}>} placedItems
 * @param {number} gameHour  current in-game hour (0–24)
 * @returns {Set}
 */
export function calcPoweredItems(placedItems, gameHour) {
  const powered = new Set();

  const activeGenerators = placedItems.filter(item => {
    const prods = getProductions(item.type);
    return prods.length > 0 && prods.some(p => !p.activeWhen || p.activeWhen(gameHour));
  });

  for (const item of placedItems) {
    // Generators always power themselves
    if (getProductions(item.type).length > 0) {
      powered.add(item.id);
      continue;
    }
    // Check if consumer is within any active generator's supply zone
    for (const gen of activeGenerators) {
      const zone = ENERGY_ZONE_REGISTRY.get(gen.type);
      if (!zone) continue;
      const dx = Math.abs(item.position[0] - gen.position[0]);
      const dz = Math.abs(item.position[2] - gen.position[2]);
      if (dx <= zone.width / 2 && dz <= zone.depth / 2) {
        powered.add(item.id);
        break;
      }
    }
  }

  return powered;
}

/**
 * Calculate total storage capacity per energy type across all placed items.
 *
 * @param {Array<{type: string}>} placedItems
 * @returns {{ [energyType: string]: number }}  e.g. { solar: 200, fuel: 100 }
 */
export function calcStorageTotals(placedItems) {
  const totals = {};
  for (const item of placedItems) {
    for (const stor of getStorages(item.type)) {
      totals[stor.type] = (totals[stor.type] ?? 0) + stor.capacity;
    }
  }
  return totals;
}
