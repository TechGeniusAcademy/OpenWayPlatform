// ─── Street Lamp — item config ────────────────────────────────────────────────
//
// Decorative infrastructure. Illuminates a circle around the pole at night.
// The actual Three.js PointLight lives in city/buildings/StreetLamp.jsx.
//
// All visual/gameplay values can be tuned here without touching the component.

// ─── Lamp visual settings ─────────────────────────────────────────────────────
export const STREET_LAMP_CONFIG = {
  // ── Pole dimensions ───────────────────────────────────────────────────────
  poleHeight:    8.0,     // total height of the pole (world units)
  poleRadius:    0.12,    // base radius of the pole
  armLength:     1.6,     // horizontal arm that holds the lamp head
  armHeight:     7.4,     // Y of the arm + lamp head

  // ── Lamp head ─────────────────────────────────────────────────────────────
  headRadius:    0.55,    // radius of the glass bulb housing

  // ── Light (PointLight) ────────────────────────────────────────────────────
  lightColor:    '#ffffff',   // warm-white sodium-vapour colour
  lightIntensity: 200,        // light intensity (Three.js units)
  lightDistance:  135,         // maximum reach of the light in world units
  lightDecay:     1.0,        // physically-based falloff (1 = linear, 2 = quadratic)

  // ── Active hours (24-h game clock) ────────────────────────────────────────
  // Lamp turns ON outside this window (i.e. at dusk / night / dawn).
  dayStart: 9,    // game hour when lamp switches OFF  (09:00)
  dayEnd:   16,   // game hour when lamp switches ON   (16:00)

  // ── Energy requirement ────────────────────────────────────────────────────
  // The lamp must be inside an active generator's energy zone (or connected
  // via cable) to light up.  This value is display-only — the zone system
  // handles the power-check automatically.
  powerRequired: 2,   // кВт потребляет один фонарь

  // ── Work-area overlay (illumination zone) ─────────────────────────────────
  workArea: {
    width:   44,          // X extent  (= 2 × lightDistance, approx)
    depth:   44,          // Z extent
    color:   '#ffe699',
    opacity: 0.07,
    label:   'Зона освещения',
  },

  /** Height of the floating placement badge above ground */
  badgeHeight: 9,
};

// Note: street lamps don't produce or store energy, so no registerProducer /
//       registerStorage call is needed.  They're pure infrastructure.
