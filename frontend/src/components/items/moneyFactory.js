// ─── Money Factory — item config ─────────────────────────────────────────────
// Visual work-area zone: shown when building is selected.
// Collision footprint: edit ITEM_FOOTPRINTS['money-factory'] in collision.js

export const MONEY_FACTORY_CONFIG = {
  /** Visible work-area zone shown when the building is selected */
  workArea: {
    width:   18,        // X size in world units
    depth:   18,        // Z size in world units
    color:   '#ffaa00', // zone fill / border colour
    opacity: 0.14,      // fill transparency (0 = invisible, 1 = solid)
    label:   'Зона производства',
  },
};
