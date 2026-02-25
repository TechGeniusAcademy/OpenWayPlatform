// ─── EnergyStorage config ────────────────────────────────────────────────────
//
// Model file: /models/EnergyStorage.glb
//
// This file registers the energy STORAGE capacity for the "energy-storage"
// building type.  To add more storage buildings later, create a new file
// following this same pattern and call registerStorage() there.

import { registerStorage } from '../systems/energy.js';

export const ENERGY_STORAGE_CONFIG = {
  /** Work-area highlight shown beneath the placed model. */
  workArea: {
    width:   14,
    depth:   14,
    color:   '#a855f7',   // purple
    opacity: 0.14,
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
