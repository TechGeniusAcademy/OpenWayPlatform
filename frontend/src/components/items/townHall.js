// ─── Town Hall — item config ──────────────────────────────────────────────────
// Принимает монеты и конвертирует 1000 монет → 1 очко рейтинга.
// Принимает монеты через конвейеры от money-factory или energy-storage.

import { registerStorage } from '../systems/energy.js';

export const TOWN_HALL_CONFIG = {
  /** Visible work-area zone shown when the building is selected */
  workArea: {
    width:   22,
    depth:   22,
    color:   '#f59e0b',  // amber
    opacity: 0.12,
    label:   'Зона ратуши',
  },
  /** Height of the floating StorageBadge above ground (world units) */
  badgeHeight: 13,

  /** Points conversion: coinsPerPoint монет → 1 очко */
  coinsPerPoint: 1000,
};

// ─── Storage capacity ────────────────────────────────────────────────────────
// Ратуша принимает и хранит монеты (до 50 000) и накопленные очки.
registerStorage('town-hall', [
  { type: 'coins', capacity: 50000, unit: 'монет' },
]);
