// ─── Money Factory — item config ─────────────────────────────────────────────
// ⚠️  workArea dimensions → buildingsConfig.json → workAreas['money-factory']
import { registerProducer } from '../systems/energy.js';
import cfg from './buildingsConfig.json';

const _wa = cfg.workAreas['money-factory'];

export const MONEY_FACTORY_CONFIG = {
  /** Visible work-area zone shown when the building is selected */
  workArea: {
    width:   _wa.width,
    depth:   _wa.depth,
    color:   _wa.color,
    opacity: _wa.opacity,
    label:   'Зона производства',
  },
  /** Height of the floating energy badge above ground (world units) */
  badgeHeight: 9,
};

// ─── Energy production ──────────────────────────────────────────────
registerProducer('money-factory', [
  {
    type:        'coins',
    ratePerHour: 10,  // монет в игровой час, без условий (24/7)
  },
]);
