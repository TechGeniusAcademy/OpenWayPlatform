// ─── Solar Panel — item config ───────────────────────────────────────────────
// ⚠️  workArea dimensions → buildingsConfig.json → workAreas['solar-panel']
import { registerProducer, registerEnergyZone } from '../systems/energy.js';
import cfg from './buildingsConfig.json';

const _wa = cfg.workAreas['solar-panel'];

export const SOLAR_PANEL_CONFIG = {
  /** Visible work-area zone shown when the building is selected */
  workArea: {
    width:   _wa.width,
    depth:   _wa.depth,
    color:   _wa.color,
    opacity: _wa.opacity,
    label:   'Зона выработки',
  },
  /** Height of the floating energy badge above ground (world units) */
  badgeHeight: 5,
};

// ─── Energy supply zone (matches the visual work-area)
registerEnergyZone('solar-panel', { width: _wa.width, depth: _wa.depth });

// ─── Energy production ────────────────────────────────────────────────
registerProducer('solar-panel', [
  {
    type:        'solar',
    ratePerHour: 10,           // кВт в игровой час
    activeWhen:  h => h >= 6 && h <= 20,  // только днём
  },
]);
