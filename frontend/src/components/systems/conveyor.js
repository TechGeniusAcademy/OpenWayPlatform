// ─── Conveyor Transfer System ─────────────────────────────────────────────────
//
// HOW TO ADD A NEW TRANSFER RULE
// ────────────────────────────────
// In any item-config file (e.g. items/conveyorRules.js):
//
//   import { registerTransferRule } from '../systems/conveyor.js';
//
//   registerTransferRule('money-factory', 'energy-storage', {
//     resource:    'coins',       // internal key
//     ratePerHour: 10,            // units transferred per game-hour
//     color:       '#fbbf24',     // coin / belt stripe colour
//     icon:        '🪙',          // HUD icon
//     label:       'Монеты',      // display name
//     unit:        'монет/ч',     // rate unit string
//   });
//
// That's it — the ConveyorBelt visual and HUD flow totals update automatically.

const TRANSFER_RULES = new Map(); // key: `${fromType}->${toType}`

// ─── Per-type conveyor slot limits ───────────────────────────────────────────
// Default: every building can have at most 1 outgoing and 1 incoming conveyor.
// Special buildings (splitter, merger) override these via registerConveyorLimits.

const CONVEYOR_OUT_LIMITS = new Map(); // itemType → max outgoing conveyors
const CONVEYOR_IN_LIMITS  = new Map(); // itemType → max incoming conveyors

/**
 * Register non-default conveyor slot limits for a building type.
 * @param {string} itemType
 * @param {{ maxOut?: number, maxIn?: number }} limits
 */
export function registerConveyorLimits(itemType, { maxOut = 1, maxIn = 1 } = {}) {
  CONVEYOR_OUT_LIMITS.set(itemType, maxOut);
  CONVEYOR_IN_LIMITS.set(itemType, maxIn);
}

export function getConveyorOutLimit(itemType) {
  return CONVEYOR_OUT_LIMITS.get(itemType) ?? 1;
}

export function getConveyorInLimit(itemType) {
  return CONVEYOR_IN_LIMITS.get(itemType) ?? 1;
}

/**
 * Register a transfer rule between two building types.
 * @param {string} fromType
 * @param {string} toType
 * @param {{ resource: string, ratePerHour: number, color: string, icon: string, label: string, unit: string }} rule
 */
export function registerTransferRule(fromType, toType, rule) {
  TRANSFER_RULES.set(`${fromType}->${toType}`, { fromType, toType, ...rule });
}

/**
 * Get the transfer rule for a given from→to pair, or null if none.
 * @param {string} fromType
 * @param {string} toType
 * @returns {{ resource, ratePerHour, color, icon, label, unit } | null}
 */
export function getTransferRule(fromType, toType) {
  return TRANSFER_RULES.get(`${fromType}->${toType}`) ?? null;
}

/**
 * Returns true if a conveyor can be placed from fromType to toType.
 */
export function canConnect(fromType, toType) {
  return TRANSFER_RULES.has(`${fromType}->${toType}`);
}

/**
 * Returns true if this item type can ever be a conveyor source.
 */
export function canBeSource(itemType) {
  for (const key of TRANSFER_RULES.keys()) {
    if (key.startsWith(`${itemType}->`)) return true;
  }
  return false;
}

/**
 * Returns true if this item type can ever be a conveyor target.
 */
export function canBeTarget(itemType) {
  for (const key of TRANSFER_RULES.keys()) {
    if (key.endsWith(`->${itemType}`)) return true;
  }
  return false;
}

/**
 * Given the current conveyor list and placed items, resolve each conveyor to
 * its rule + world positions. Skips conveyors whose buildings no longer exist.
 *
 * @param {Array<{id, fromId, toId}>}          conveyors
 * @param {Array<{id, type, position}>}         placedItems
 * @returns {Array<{id, fromId, toId, rule, fromPos, toPos}>}
 */
export function calcConveyorFlows(conveyors, placedItems) {
  const flows = [];
  for (const conv of conveyors) {
    const from = placedItems.find(i => i.id === conv.fromId);
    const to   = placedItems.find(i => i.id === conv.toId);
    if (!from || !to) continue;
    const rule = getTransferRule(from.type, to.type);
    if (!rule) continue;
    flows.push({ ...conv, rule, fromPos: from.position, toPos: to.position });
  }
  return flows;
}

/**
 * Sum up total transfer rates by resource across all active conveyors.
 * @param {Array} conveyors
 * @param {Array} placedItems
 * @returns {{ [resource: string]: number }}
 */
export function calcTransferTotals(conveyors, placedItems) {
  const totals = {};
  for (const flow of calcConveyorFlows(conveyors, placedItems)) {
    totals[flow.rule.resource] = (totals[flow.rule.resource] ?? 0) + flow.rule.ratePerHour;
  }
  return totals;
}
