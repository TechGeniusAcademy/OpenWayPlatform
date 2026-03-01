// ─── Coal Generator (Угольный генератор) — item config ───────────────────────
//
// The coal generator burns mined ore (coal) to produce fuel energy.
// It receives ore from an Extractor via drones and outputs fuel energy
// that can be sent to an EnergyStorage.
//
// Levels:
//   Level 1 → 8  топлива/ч
//   Level 2 → 12 топлива/ч  (×1.5)
//   Level 3 → 20 топлива/ч  (×2.5)

import { registerProducer, registerStorage } from '../systems/energy.js';

export const COAL_GENERATOR_CONFIG = {
  /** Visible work-area zone shown when the building is selected */
  workArea: {
    width:   16,
    depth:   16,
    color:   '#f97316',
    opacity: 0.14,
    label:   'Зона генерации',
  },
  /** Height of the floating energy badge above ground (world units) */
  badgeHeight: 8,
  /** Internal coal (ore) buffer capacity */
  bufferCapacity: 50,
};

// ─── Energy production ────────────────────────────────────────────────────────
// The generator always produces fuel as long as it's placed (ore consumption
// is represented by the drone animation from the extractor).
registerProducer('coal-generator', [
  {
    type:        'fuel',
    ratePerHour: 8,   // base rate — level multipliers applied via getLevelConfig
  },
]);

// ─── Internal coal (ore) buffer ───────────────────────────────────────────────
// Drones from the extractor fill this buffer.
registerStorage('coal-generator', [
  { type: 'ore', capacity: 50, unit: 'ед.' },
]);
