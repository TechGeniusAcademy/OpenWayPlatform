// ─── Pump (Насос) — item config ───────────────────────────────────────────────
//
// The pump sits on a water body and extracts water into a small internal buffer.
// Connect to a PumpFactory via a PumpDrone route to transfer water.
// The pump does not require energy — it is powered by its position on water.

import { registerStorage, registerProducer } from '../systems/energy.js';
import cfg from './buildingsConfig.json';

const _wa  = cfg.workAreas['pump'];
const _lvl = cfg.levels['pump'];

export const PUMP_CONFIG = {
  /** Work-area zone shown when selected. */
  workArea: {
    width:   _wa.width,
    depth:   _wa.depth,
    color:   _wa.color,
    opacity: _wa.opacity,
    label:   'Зона насоса',
  },
  /** Height of the floating water badge above ground (world units). */
  badgeHeight: 5,
  /** Base water extraction rate — from buildingsConfig.json */
  extractRatePerHour: _lvl[0].ratePerHour,
  /** Internal water buffer capacity — from buildingsConfig.json */
  bufferCapacity: _lvl[0].bufferCapacity,
};

// Pump continuously extracts water from the water body it sits on.
registerProducer('pump', [
  { type: 'water', ratePerHour: _lvl[0].ratePerHour },
]);

// Small internal water buffer — the drone picks up water from this buffer.
registerStorage('pump', [
  { type: 'water', capacity: _lvl[0].bufferCapacity, unit: 'л.' },
]);
