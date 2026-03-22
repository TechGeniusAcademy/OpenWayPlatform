// ─── Street Lamp — item config ────────────────────────────────────────────────
//
// ⚠️  workArea dimensions   → buildingsConfig.json → workAreas['street-lamp']
// ⚠️  light stats per level → buildingsConfig.json → levels['street-lamp']

import cfg from './buildingsConfig.json';

const _wa  = cfg.workAreas['street-lamp'];
const _lvl = cfg.levels['street-lamp'];

// ─── Lamp visual settings ─────────────────────────────────────────────────────
export const STREET_LAMP_CONFIG = {
  poleHeight:    8.0,
  poleRadius:    0.12,
  armLength:     1.6,
  armHeight:     7.4,
  headRadius:    0.55,
  lightColor:    '#ffffff',
  /** Base light intensity at level 1 — from buildingsConfig.json */
  lightIntensity: _lvl[0].lightIntensity,
  /** Base light distance at level 1 — from buildingsConfig.json */
  lightDistance:  _lvl[0].lightDistance,
  lightDecay:     1.0,
  dayStart: 9,
  dayEnd:   16,
  /** Base power required at level 1 — from buildingsConfig.json */
  powerRequired: _lvl[0].powerRequired,
  workArea: {
    width:   _wa.width,
    depth:   _wa.depth,
    color:   _wa.color,
    opacity: _wa.opacity,
    label:   'Зона освещения',
  },
  badgeHeight: 9,
};

// Note: street lamps don't produce or store energy, so no registerProducer /
//       registerStorage call is needed.  They're pure infrastructure.
