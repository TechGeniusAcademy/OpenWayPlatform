// ─── Extractor (Добытчик руды) — item config ──────────────────────────────────
//
// ⚠️  workArea dimensions → buildingsConfig.json → workAreas['extractor']
// ⚠️  mining rates per level → buildingsConfig.json → levels['extractor']
//
//   Level 1 → Уголь   (coal)     — 3 ед./ч
//   Level 2 → Железо  (iron)     — 4.5 ед./ч
//   Level 3 → Серебро (silver)   — 6 ед./ч
//   Level 4 → Золото  (gold)     — 9 ед./ч
//   Level 5 → Алмаз   (diamond)  — 15 ед./ч

import { registerStorage }  from '../systems/energy.js';
import cfg from './buildingsConfig.json';

const _wa = cfg.workAreas['extractor'];

export const EXTRACTOR_CONFIG = {
  /** Work-area zone shown when selected. */
  workArea: {
    width:   _wa.width,
    depth:   _wa.depth,
    color:   _wa.color,
    opacity: _wa.opacity,
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
