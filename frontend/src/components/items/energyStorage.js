// ─── EnergyStorage config ────────────────────────────────────────────────────
//
// ⚠️  workArea dimensions → buildingsConfig.json → workAreas['energy-storage']

import { registerStorage } from '../systems/energy.js';
import cfg from './buildingsConfig.json';

const _wa = cfg.workAreas['energy-storage'];

export const ENERGY_STORAGE_CONFIG = {
  /** Work-area highlight shown beneath the placed model. */
  workArea: {
    width:   _wa.width,
    depth:   _wa.depth,
    color:   _wa.color,
    opacity: _wa.opacity,
    label:   'Зона хранения',
  },
  /** Height (world units) of the floating StorageBadge above the origin. */
  badgeHeight: 7,
};

// Register storage capacities.
// Each entry: { type, capacity, unit }
//   type     — key from ENERGY_TYPES (e.g. 'solar', 'fuel')
//   capacity — max stored units per building instance
//   unit     — display label (overrides ENERGY_TYPES default if provided)
registerStorage('energy-storage', [
  { type: 'solar', capacity: 100,  unit: 'кВт·ч' },
  { type: 'fuel',  capacity: 50,   unit: 'л'     },
  { type: 'coins', capacity: 5000, unit: 'монет'  },
]);
