// ─── Pump Factory (Насосная станция) — item config ────────────────────────────
//
// The pump factory receives water from one or more pumps via pump drones.
// It requires energy to operate. Water is stored in its internal tank.
//
// Storage capacity per level:
//   Level 1 →   200 л
//   Level 2 →   400 л
//   Level 3 →   800 л
//   Level 4 → 1 200 л
//   Level 5 → 1 500 л

import { registerStorage } from '../systems/energy.js';

export const PUMP_FACTORY_CONFIG = {
  /** Visible work-area zone shown when the building is selected */
  workArea: {
    width:   60,
    depth:   60,
    color:   '#0ea5e9',
    opacity: 0.14,
    label:   'Зона насосной станции',
  },
  /** Height of the floating badges above ground (world units) */
  badgeHeight: 8,
  /** Base water tank capacity at level 1 */
  baseCapacity: 200,
};

// ─── Internal water storage tank ──────────────────────────────────────────────
// The pump drone fills this tank. The game loop uses the capacityMultiplier from
// buildingLevels to scale the effective capacity at higher levels.
registerStorage('pump-factory', [
  { type: 'water', capacity: 200, unit: 'л.' },
]);
