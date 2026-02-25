// ─── Extractor (Добытчик руды) — item config ──────────────────────────────────
//
// The extractor mines ore into a small internal buffer.
// Ore type and mining rate depend on building level (see buildingLevels.js):
//   Level 1 → Уголь   (coal)     — 3 ед./ч
//   Level 2 → Железо  (iron)     — 4.5 ед./ч
//   Level 3 → Серебро (silver)   — 6 ед./ч
//   Level 4 → Золото  (gold)     — 9 ед./ч
//   Level 5 → Алмаз   (diamond)  — 15 ед./ч
//
// Connect via Conveyor to an EnergyStorage to transfer the mined ore.
// The buffer is consumed first; when empty, nothing is transferred.

import { registerStorage }  from '../systems/energy.js';

export const EXTRACTOR_CONFIG = {
  /** Work-area zone shown when selected. */
  workArea: {
    width:   10,
    depth:   10,
    color:   '#92400e',
    opacity: 0.18,
    label:   'Зона добычи',
  },
  /** Height of the floating ore badge above ground (world units). */
  badgeHeight: 7,
  /** Internal ore buffer capacity (units). Consistent with storage registration. */
  bufferCapacity: 30,
};

// Register the internal ore buffer.
// The game loop (OpenCity.jsx) fills this buffer from mining production.
// The conveyor then drains from this buffer when transferring ore downstream.
registerStorage('extractor', [
  { type: 'ore', capacity: 30, unit: 'ед.' },
]);
