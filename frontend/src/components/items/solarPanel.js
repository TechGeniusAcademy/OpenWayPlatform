// ─── Solar Panel — item config ───────────────────────────────────────────────
// Adjust workArea to match the real footprint of the model.

export const SOLAR_PANEL_CONFIG = {
  /** Visible work-area zone shown when the building is selected */
  workArea: {
    width:   10,       // X size in world units
    depth:   10,       // Z size in world units
    color:   '#00aaff', // zone fill / border colour
    opacity: 0.14,     // fill transparency (0 = invisible, 1 = solid)
    label:   'Зона выработки',
  },
};
