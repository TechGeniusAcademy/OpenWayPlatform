// ─── Steam Generator (Паровой генератор) — item config ───────────────────────
//
// Burns water (from pump-factory) + coal (from extractor) to produce:
//   - электロэнергию (solar-type) that powers nearby buildings via zone
//   - пар (steam) stored in internal buffer for future use
//
// Consumption ratio per cycle: 2 ед. угля + 1 л. воды  →  100 кВт·ч + 1 пар
//
// Connections:
//   extractor    → steam-generator (ore/coal)
//   pump-factory → steam-generator (water)

import { registerProducer, registerStorage, registerEnergyZone } from '../systems/energy.js';

export const STEAM_GENERATOR_CONFIG = {
  workArea: {
    width:   90,
    depth:   90,
    color:   '#a78bfa',
    opacity: 0.14,
    label:   'Зона генерации',
  },
  badgeHeight: 8,
  /** Internal coal buffer capacity (ед.) */
  coalCapacity: 60,
  /** Internal water buffer capacity (л) */
  waterCapacity: 30,
  /** Internal steam buffer capacity */
  steamCapacity: 50,
  /**
   * Coal consumed per game-hour at level 1.
   * Water consumed = coalRate / 2  (ratio 2:1)
   * Energy produced = coalRate * 50 кВт/ч  (2 coal → 100 кВт)
   */
  coalRateBase: 2,
};

// ─── Energy supply zone ───────────────────────────────────────────────────────
registerEnergyZone('steam-generator', { width: 90, depth: 90 });

// ─── Energy production (solar-type — powers nearby buildings continuously) ───
// Base rate 100 кВт/ч at level 1; level multiplier applied in game loop.
registerProducer('steam-generator', [
  { type: 'solar', ratePerHour: 100 },
]);

// ─── Internal buffers ─────────────────────────────────────────────────────────
registerStorage('steam-generator', [
  { type: 'ore',   capacity: 60,  unit: 'ед.' },   // coal input
  { type: 'water', capacity: 30,  unit: 'л.'  },   // water input
  { type: 'steam', capacity: 50,  unit: 'ед.' },   // steam output
]);
