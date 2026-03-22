// ─── Coal Generator (Угольный генератор) — item config ───────────────────────
//
// ⚠️  workArea dimensions → buildingsConfig.json → workAreas['coal-generator']
// ⚠️  production rates per level → buildingsConfig.json → levels['coal-generator']
//
//   Level 1 → 8  топлива/ч
//   Level 2 → 12 топлива/ч  (×1.5)
//   Level 3 → 20 топлива/ч  (×2.5)

import { registerProducer, registerStorage, registerEnergyZone } from '../systems/energy.js';
import cfg from './buildingsConfig.json';

const _wa = cfg.workAreas['coal-generator'];

export const COAL_GENERATOR_CONFIG = {
  /** Visible work-area zone shown when the building is selected */
  workArea: {
    width:   _wa.width,
    depth:   _wa.depth,
    color:   _wa.color,
    opacity: _wa.opacity,
    label:   'Зона генерации',
  },
  /** Height of the floating energy badge above ground (world units) */
  badgeHeight: 8,
  /** Internal coal (ore) buffer capacity */
  bufferCapacity: 50,
};

// ─── Energy supply zone ──────────────────────────────────────────────────
registerEnergyZone('coal-generator', { width: _wa.width, depth: _wa.depth });

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
