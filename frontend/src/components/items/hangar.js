// ─── Military Hangar (Военный Ангар) — item config ───────────────────────────
//
// ⚠️  workArea dimensions → buildingsConfig.json → workAreas['hangar']
// ⚠️  max fighters per level → buildingsConfig.json → levels['hangar'][*].maxFighters
// ⚠️  fighter coin cost → buildingsConfig.json → levels['hangar'][0].fighterCoinCost

import cfg from './buildingsConfig.json';

const _wa  = cfg.workAreas['hangar'];
const _lvl = cfg.levels['hangar'];

export const HANGAR_CONFIG = {
  /** Visible work-area zone shown when the building is selected */
  workArea: {
    width:   _wa.width,
    depth:   _wa.depth,
    color:   _wa.color,
    opacity: _wa.opacity,
    label:   'Военная зона',
  },
  /** Height of floating badges above ground (world units) */
  badgeHeight: 9,
  /** Cost per fighter in in-game coins — from buildingsConfig.json */
  fighterCoinCost: _lvl[0].fighterCoinCost,
  /** Platform offset from hangar center (world units along -X, i.e. to the left) */
  platformOffsetX: -14,
  /** Slots on the platform (per level) — from buildingsConfig.json */
  maxFightersPerLevel: _lvl.map(l => l.maxFighters),
};
