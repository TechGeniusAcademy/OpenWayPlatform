// ─── Solar Panel — item config ───────────────────────────────────────────────
// Visual work-area zone: shown when building is selected.
// Collision footprint: edit ITEM_FOOTPRINTS['solar-panel'] in collision.js

export const SOLAR_PANEL_CONFIG = {
  /** Visible work-area zone shown when the building is selected */
  workArea: {
    width:   100,       // X size in world units
    depth:   100,       // Z size in world units
    color:   '#00aaff', // zone fill / border colour
    opacity: 0.14,     // fill transparency (0 = invisible, 1 = solid)
    label:   'Зона выработки',
  },
};
