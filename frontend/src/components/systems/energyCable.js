// ─── Energy Cable System ──────────────────────────────────────────────────────
//
// HOW TO ADD A NEW CABLE RULE
// ────────────────────────────
// In items/energyCableRules.js:
//
//   import { registerCableRule } from '../systems/energyCable.js';
//
//   registerCableRule('solar-panel', 'energy-storage', {
//     resource:    'solar',       // internal key (must match a storage type)
//     ratePerHour: 10,            // units transferred per game-hour
//     color:       '#facc15',     // cable glow colour
//     icon:        '⚡',          // HUD icon
//     label:       'Электроэнергия',
//     unit:        'кВт/ч',
//   });

const CABLE_RULES = new Map(); // key: `${fromType}->${toType}`

export function registerCableRule(fromType, toType, rule) {
  CABLE_RULES.set(`${fromType}->${toType}`, { fromType, toType, ...rule });
}

export function getCableRule(fromType, toType) {
  return CABLE_RULES.get(`${fromType}->${toType}`) ?? null;
}

export function canCableConnect(fromType, toType) {
  return CABLE_RULES.has(`${fromType}->${toType}`);
}

export function canBeCableSource(itemType) {
  for (const key of CABLE_RULES.keys()) {
    if (key.startsWith(`${itemType}->`)) return true;
  }
  return false;
}

export function canBeCableTarget(itemType) {
  for (const key of CABLE_RULES.keys()) {
    if (key.endsWith(`->${itemType}`)) return true;
  }
  return false;
}

/**
 * Returns a Set of item IDs that are powered via energy cables.
 * Generators (cable sources) are always powered.
 * Consumers are powered if a cable runs from any generator to them.
 *
 * @param {Array<{id: number, type: string}>} placedItems
 * @param {Array<{fromId: number, toId: number}>} energyCables
 * @returns {Set<number>}
 */
export function calcCablePoweredIds(placedItems, energyCables) {
  const powered = new Set();
  // All generator-type buildings are self-powered
  for (const item of placedItems) {
    if (canBeCableSource(item.type)) powered.add(item.id);
  }
  // Consumers powered if connected via cable from a generator
  for (const cable of energyCables) {
    const from = placedItems.find(i => i.id === cable.fromId);
    if (from && canBeCableSource(from.type)) {
      powered.add(cable.toId);
    }
  }
  return powered;
}
