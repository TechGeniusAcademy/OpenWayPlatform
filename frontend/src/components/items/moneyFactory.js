// ─── Money Factory — item config ─────────────────────────────────────────────
// Adjust workArea to match the real footprint of the model.

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
