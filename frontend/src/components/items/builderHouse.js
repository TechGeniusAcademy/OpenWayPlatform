// ─── Builder's House (Дом строителя) — item config ───────────────────────────
//
// ⚠️  workArea dimensions → buildingsConfig.json → workAreas['builder-house']
// ⚠️  builders per level  → buildingsConfig.json → levels['builder-house'][*].buildersCount
// Level 1: 1 builder  | Level 2: 2 builders | Level 3: 3 builders

import cfg from './buildingsConfig.json';

const _wa = cfg.workAreas['builder-house'];

export const BUILDER_HOUSE_CONFIG = {
  /** Work-area overlay radius */
  workArea: {
    width:   _wa.width,
    depth:   _wa.depth,
    color:   _wa.color,
    opacity: _wa.opacity,
    label:   'Зона строителей',
  },
  /** Badge height above the house */
  badgeHeight: 7,
};
