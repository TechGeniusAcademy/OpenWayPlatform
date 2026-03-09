// ─── Connection Rates (distribution logic) ───────────────────────────────────
//
// Computes effective transfer rate for each drone route / energy cable,
// accounting for multi-source and multi-target scenarios:
//
//   Source → N targets:  each connection carries  baseRate / N  (distributed evenly)
//   N sources → target:  each connection keeps its share,
//                        target accumulates the sum of all incoming rates.

import { getTransferRule } from './conveyor.js';
import { getCableRule }    from './energyCable.js';
import { getLevelConfig }  from './upgrades.js';

/** Returns the rateMultiplier for a building given the levels map. */
function rateMult(item, buildingLevels) {
  const lvl  = buildingLevels[String(item.id)] ?? 1;
  const conf = getLevelConfig(item.type, lvl);
  return conf?.rateMultiplier ?? 1.0;
}

// ─── Drone routes (was conveyors) ────────────────────────────────────────────

// Drone route level → speed multiplier (mirrors ROUTE_SPEED_BONUS in DronePanel)
const ROUTE_LEVEL_MULT = [1, 1.0, 1.3, 1.8, 2.5]; // index = level (1-based)

/**
 * Returns a Map<droneRouteId, effectiveRatePerHour> already scaled by building levels
 * and drone route upgrade level.
 *
 * @param {Array<{id, type}>}              placedItems
 * @param {Array<{id, fromId, toId}>}      conveyors   – drone routes array
 * @param {Object<string, number>}         buildingLevels  – map of itemId → level
 * @param {Object<string, number>}         droneRouteLevels – map of droneId → level
 * @returns {Map<number, number>}
 */
export function calcConveyorRates(placedItems, conveyors, buildingLevels = {}, droneRouteLevels = {}) {
  // Pre-compute fan-out counts per (source, resource)
  const outCount = new Map(); // `${fromId}:${resource}` → n
  for (const conv of conveyors) {
    const from = placedItems.find(i => i.id === conv.fromId);
    const to   = placedItems.find(i => i.id === conv.toId);
    if (!from || !to) continue;
    const rule = getTransferRule(from.type, to.type);
    if (!rule) continue;
    const key = `${conv.fromId}:${rule.resource}`;
    outCount.set(key, (outCount.get(key) ?? 0) + 1);
  }

  const rates = new Map(); // droneRouteId → effectiveRate

  for (const conv of conveyors) {
    const from = placedItems.find(i => i.id === conv.fromId);
    const to   = placedItems.find(i => i.id === conv.toId);
    if (!from || !to) { rates.set(conv.id, 0); continue; }
    const rule = getTransferRule(from.type, to.type);
    if (!rule) { rates.set(conv.id, 0); continue; }
    const n = outCount.get(`${conv.fromId}:${rule.resource}`) ?? 1;
    // Scale by source building's level multiplier and drone route upgrade level
    const routeLevel = droneRouteLevels[String(conv.id)] ?? 1;
    const routeMult  = ROUTE_LEVEL_MULT[routeLevel] ?? 1.0;
    rates.set(conv.id, rule.ratePerHour * rateMult(from, buildingLevels) / n * routeMult);
  }

  return rates;
}

// ─── Energy cables ────────────────────────────────────────────────────────────

/**
 * Returns a Map<cableId, effectiveRatePerHour> already scaled by building levels.
 *
 * @param {Array<{id, type}>}              placedItems
 * @param {Array<{id, fromId, toId}>}      energyCables
 * @param {Object<string, number>}         buildingLevels  – map of itemId → level
 * @returns {Map<number, number>}
 */
export function calcCableRates(placedItems, energyCables, buildingLevels = {}) {
  const outCount = new Map();
  for (const cable of energyCables) {
    const from = placedItems.find(i => i.id === cable.fromId);
    const to   = placedItems.find(i => i.id === cable.toId);
    if (!from || !to) continue;
    const rule = getCableRule(from.type, to.type);
    if (!rule || rule.ratePerHour === 0) continue;
    const key = `${cable.fromId}:${rule.resource}`;
    outCount.set(key, (outCount.get(key) ?? 0) + 1);
  }

  const rates = new Map();
  for (const cable of energyCables) {
    const from = placedItems.find(i => i.id === cable.fromId);
    const to   = placedItems.find(i => i.id === cable.toId);
    if (!from || !to) { rates.set(cable.id, 0); continue; }
    const rule = getCableRule(from.type, to.type);
    if (!rule || rule.ratePerHour === 0) { rates.set(cable.id, 0); continue; }
    const n = outCount.get(`${cable.fromId}:${rule.resource}`) ?? 1;
    // Scale by source building's level multiplier
    rates.set(cable.id, rule.ratePerHour * rateMult(from, buildingLevels) / n);
  }
  return rates;
}
