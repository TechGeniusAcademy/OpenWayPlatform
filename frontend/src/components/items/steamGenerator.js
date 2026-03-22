// ─── Steam Generator (Паровой генератор) — item config ───────────────────────
//
// Burns water (from pump-factory) + coal (from extractor) to produce:
//   - электроэнергию (solar-type) that powers nearby buildings via zone
//   - пар (steam) stored in internal buffer
//
// Level stats (per hour):
//   Ур.1 — 10 000 монет · 1000 XP · 1000 HP
//          Генерирует: 1 кВт/ч + 200 мл пара
//          Потребляет: 20 уг + 200 мл воды
//   Ур.2 — 15 000 монет · 1500 XP · 1500 HP
//          Генерирует: 5 кВт/ч + 300 мл пара
//          Потребляет: 20 уг + 300 мл воды
//   Ур.3 — 20 000 монет · 2000 XP · 2000 HP
//          Генерирует: 10 кВт/ч + 400 мл пара
//          Потребляет: 20 уг + 400 мл воды
//   Ур.4 — 30 000 монет · 3000 XP · 2500 HP
//          Генерирует: 20 кВт/ч + 2 л пара
//          Потребляет: 30 уг + 2 л воды
//
// Connections:
//   extractor    → steam-generator (ore/coal)
//   pump-factory → steam-generator (water)

import { registerProducer, registerStorage, registerEnergyZone } from '../systems/energy.js';
import cfg from './buildingsConfig.json';

const _wa  = cfg.workAreas['steam-generator'];
const _lvl = cfg.levels['steam-generator'];

export const STEAM_GENERATOR_CONFIG = {
  workArea: {
    width:   _wa.width,
    depth:   _wa.depth,
    color:   _wa.color,
    opacity: _wa.opacity,
    label:   'Зона генерации',
  },
  badgeHeight: 8,
  coalCapacity:    120,
  waterCapacity:   4000,
  steamCapacity:   4000,
  coalRateBase:    _lvl[0].coalPerH,
  waterMlPerHBase: _lvl[0].waterMlPerH,
  energyKwBase:    _lvl[0].energyKw,
  steamMlPerHBase: _lvl[0].steamMlPerH,
};

// ─── Energy supply zone ───────────────────────────────────────────────────────
registerEnergyZone('steam-generator', { width: _wa.width, depth: _wa.depth });

// ─── Energy production (solar-type — powers nearby buildings continuously) ───
// Base rate 1 кВт/ч at level 1; rateMultiplier from buildingLevels applied in game loop.
registerProducer('steam-generator', [
  { type: 'solar', ratePerHour: 1 },
]);

// ─── Internal buffers ─────────────────────────────────────────────────────────
registerStorage('steam-generator', [
  { type: 'ore',   capacity: 120,  unit: 'ед.' },   // coal input
  { type: 'water', capacity: 4000, unit: 'мл'  },   // water input
  { type: 'steam', capacity: 4000, unit: 'мл'  },   // steam output
]);
