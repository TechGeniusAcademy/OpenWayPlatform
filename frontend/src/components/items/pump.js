// ─── Pump (Насос) — item config ───────────────────────────────────────────────
//
// The pump sits on a water body and extracts water into a small internal buffer.
// Connect to a PumpFactory via a PumpDrone route to transfer water.
// The pump does not require energy — it is powered by its position on water.

import { registerStorage, registerProducer } from '../systems/energy.js';

export const PUMP_CONFIG = {
  /** Work-area zone shown when selected. */
  workArea: {
    width:   12,
    depth:   12,
    color:   '#38bdf8',
    opacity: 0.20,
    label:   'Зона насоса',
  },
  /** Height of the floating water badge above ground (world units). */
  badgeHeight: 5,
  /** Base water extraction rate (liters per hour). */
  extractRatePerHour: 20,  // л/ч — matches drone base carry rate (pump→pump-factory rule)
  /** Internal water buffer capacity. */
  bufferCapacity: 50,
};

// Pump continuously extracts water from the water body it sits on.
registerProducer('pump', [
  { type: 'water', ratePerHour: 20 },
]);

// Small internal water buffer — the drone picks up water from this buffer.
registerStorage('pump', [
  { type: 'water', capacity: 50, unit: 'л.' },
]);
