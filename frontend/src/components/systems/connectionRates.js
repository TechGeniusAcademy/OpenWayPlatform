// ─── Connection Rates (distribution logic) ───────────────────────────────────
//
// Computes effective transfer rate for each conveyor / energy cable,
// accounting for multi-source and multi-target scenarios:
//
//   Source → N targets:  each connection carries  baseRate / N  (distributed evenly)
//   N sources → target:  each connection keeps its share,
//                        target accumulates the sum of all incoming rates.

import { getTransferRule } from './conveyor.js';
import { getCableRule }    from './energyCable.js';
import { getLevelConfig }  from './upgrades.js';

// Pass-through node types: their outgoing rate is derived from actual incoming
// flow, not from the static rule ratePerHour.
const PASS_THROUGH = new Set(['splitter', 'merger']);

/** Returns the rateMultiplier for a building given the levels map. */
function rateMult(item, buildingLevels) {
  const lvl  = buildingLevels[String(item.id)] ?? 1;
  const conf = getLevelConfig(item.type, lvl);
  return conf?.rateMultiplier ?? 1.0;
}

// ─── Conveyors ────────────────────────────────────────────────────────────────

/**
 * Returns a Map<conveyorId, effectiveRatePerHour> already scaled by building levels.
 *
 * Pass 1 – resolve rates for all non-pass-through sources (real producers).
 * Pass 2 – resolve pass-through nodes (splitter / merger) by summing their
 *           actual incoming rates and dividing by output count.
 * This handles one layer of pass-through chaining; repeated passes would be
 * needed for deeper chains, but they are rare in practice.
 *
 * @param {Array<{id, type}>}              placedItems
 * @param {Array<{id, fromId, toId}>}      conveyors
 * @param {Object<string, number>}         buildingLevels  – map of itemId → level
 * @returns {Map<number, number>}
 */
export function calcConveyorRates(placedItems, conveyors, buildingLevels = {}) {
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

  const rates = new Map(); // conveyorId → effectiveRate

  // ── Pass 1: real producers ─────────────────────────────────────────────────
  for (const conv of conveyors) {
    const from = placedItems.find(i => i.id === conv.fromId);
    const to   = placedItems.find(i => i.id === conv.toId);
    if (!from || !to) { rates.set(conv.id, 0); continue; }
    if (PASS_THROUGH.has(from.type)) continue; // defer to pass 2
    const rule = getTransferRule(from.type, to.type);
    if (!rule) { rates.set(conv.id, 0); continue; }
    const n = outCount.get(`${conv.fromId}:${rule.resource}`) ?? 1;
    // Scale by source building's level multiplier
    rates.set(conv.id, rule.ratePerHour * rateMult(from, buildingLevels) / n);
  }

  // ── Pass 2: pass-through nodes — iterate until convergence ─────────────────
  // Each iteration propagates flow one layer deeper (merger→merger→storage etc).
  // 6 iterations handles any practical chain depth; breaks early when stable.
  for (let _iter = 0; _iter < 6; _iter++) {
    // Re-sum incoming rates for every pass-through node using current rates
    const incomingTotal = new Map();
    for (const conv of conveyors) {
      const to = placedItems.find(i => i.id === conv.toId);
      if (!to || !PASS_THROUGH.has(to.type)) continue;
      incomingTotal.set(conv.toId, (incomingTotal.get(conv.toId) ?? 0) + (rates.get(conv.id) ?? 0));
    }

    let anyChanged = false;
    for (const conv of conveyors) {
      const from = placedItems.find(i => i.id === conv.fromId);
      const to   = placedItems.find(i => i.id === conv.toId);
      if (!from || !to) continue;
      if (!PASS_THROUGH.has(from.type)) continue;
      const rule = getTransferRule(from.type, to.type);
      if (!rule) { rates.set(conv.id, 0); continue; }
      const totalIn = incomingTotal.get(conv.fromId) ?? 0;
      const n       = outCount.get(`${conv.fromId}:${rule.resource}`) ?? 1;
      const cap     = rule.ratePerHour * rateMult(from, buildingLevels);
      const newRate = Math.min(cap, totalIn / n);
      if (Math.abs((rates.get(conv.id) ?? -1) - newRate) > 0.0001) anyChanged = true;
      rates.set(conv.id, newRate);
    }
    if (!anyChanged) break;
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
