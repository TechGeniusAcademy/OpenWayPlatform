// ─── Town Hall — item config ──────────────────────────────────────────────────
// ⚠️  workArea dimensions → buildingsConfig.json → workAreas['town-hall']
// ⚠️  coinsPerPoint per level → buildingsConfig.json → levels['town-hall']
// Принимает монеты и конвертирует N монет → 1 очко рейтинга.

import { registerStorage } from '../systems/energy.js';
import cfg from './buildingsConfig.json';

const _wa  = cfg.workAreas['town-hall'];
const _lvl = cfg.levels['town-hall'];

export const TOWN_HALL_CONFIG = {
  /** Visible work-area zone shown when the building is selected */
  workArea: {
    width:   _wa.width,
    depth:   _wa.depth,
    color:   _wa.color,
    opacity: _wa.opacity,
    label:   'Зона ратуши',
  },
  /** Height of the floating StorageBadge above ground (world units) */
  badgeHeight: 13,

  /** Points conversion at level 1 — from buildingsConfig.json */
  coinsPerPoint: _lvl[0].coinsPerPoint,
};

// ─── Storage capacity ────────────────────────────────────────────────────────
// Ратуша принимает и хранит монеты (до 50 000) и накопленные очки.
registerStorage('town-hall', [
  { type: 'coins', capacity: 50000, unit: 'монет' },
]);
