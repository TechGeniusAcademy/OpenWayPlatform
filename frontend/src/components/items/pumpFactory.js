// ─── Pump Factory (Насосная станция) — item config ────────────────────────────
//
// ⚠️  workArea dimensions → buildingsConfig.json → workAreas['pump-factory']
// ⚠️  storage capacities per level → buildingsConfig.json → levels['pump-factory']
//
//   Level 1 →   200 л  |  Level 2 →   400 л  |  Level 3 →   800 л
//   Level 4 → 1 200 л  |  Level 5 → 1 500 л

import { registerStorage } from '../systems/energy.js';
import cfg from './buildingsConfig.json';

const _wa  = cfg.workAreas['pump-factory'];
const _lvl = cfg.levels['pump-factory'];

export const PUMP_FACTORY_CONFIG = {
  /** Visible work-area zone shown when the building is selected */
  workArea: {
    width:   _wa.width,
    depth:   _wa.depth,
    color:   _wa.color,
    opacity: _wa.opacity,
    label:   'Зона насосной станции',
  },
  /** Height of the floating badges above ground (world units) */
  badgeHeight: 8,
  /** Base water tank capacity at level 1 — from buildingsConfig.json */
  baseCapacity: _lvl[0].waterCapacity,
};

// ─── Internal water storage tank ──────────────────────────────────────────────
registerStorage('pump-factory', [
  { type: 'water', capacity: _lvl[0].waterCapacity, unit: 'л.' },
]);
