// ─── Day / Night cycle ────────────────────────────────────────────────────────
//
//   5 real minutes  =  1 game hour
//   1 game day      =  2 real hours
//   Game clock starts at 08:00.

/** Milliseconds of real time equal to one game hour */
export const REAL_MS_PER_GAME_HOUR = 5 * 60 * 1000; // 300 000 ms

// ─── Sun position ─────────────────────────────────────────────────────────────

/**
 * Returns [x, y, z] pointing toward the sun.
 * y > 0 = above horizon (daytime), y < 0 = below (night).
 * @param {number} h  game hour 0–24
 */
export function getSunPosition(h) {
  // angle: −π/2 at midnight, +π/2 at noon
  const angle = ((h / 24) * 2 - 0.5) * Math.PI;
  const elev  = Math.sin(angle); // −1 → +1
  const azim  = Math.cos(angle); // east–west swing
  return [azim * 200, elev * 200, 60];
}

// ─── Sky uniforms ─────────────────────────────────────────────────────────────

/**
 * THREE.Sky uniform values appropriate for the time of day.
 * @param {number} h
 */
export function getSkyParams(h) {
  const elev = Math.sin(((h / 24) * 2 - 0.5) * Math.PI);
  const t    = 1 - Math.max(0, elev); // 0 at noon, 1 near/below horizon
  return {
    turbidity:       3  + t * 14,       // clear noon → heavy dusk
    rayleigh:        0.3 + t * 3.5,
    mieCoefficient:  0.003 + t * 0.04,
    mieDirectionalG: 0.98,
  };
}

// ─── Light intensities ────────────────────────────────────────────────────────

/**
 * Ambient + directional + hemisphere light parameters.
 * @param {number} h
 */
export function getLighting(h) {
  const elev      = Math.sin(((h / 24) * 2 - 0.5) * Math.PI);
  const dayFactor = Math.max(0, elev);
  const isGolden  = elev > -0.12 && elev < 0.28; // sunrise / sunset glow
  return {
    ambientIntensity: 0.06 + dayFactor * 0.55,
    ambientColor:     elev > 0 ? '#cce0ff' : '#0a0e1a',
    dirIntensity:     dayFactor * 2.4,
    dirColor:         isGolden ? '#ffbc66' : '#fff8e0',
    hemiIntensity:    0.08 + dayFactor * 0.38,
    hemiSky:          elev > 0 ? '#9ec8ff' : '#060d1c',
    hemiGround:       elev > 0 ? '#3a5a3a' : '#060906',
  };
}

// ─── Fog colour ───────────────────────────────────────────────────────────────

/**
 * Returns a CSS/hex string for the scene fog colour.
 * @param {number} h
 */
export function getFogColor(h) {
  const elev = Math.sin(((h / 24) * 2 - 0.5) * Math.PI);
  if (elev < -0.1)  return '#04080f';              // night
  if (elev <  0.2)  return '#c04810';              // golden hour
  const bright = Math.round(30 + elev * 35);
  return `hsl(205, 45%, ${bright}%)`;              // blue daytime haze
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

/** '01:30' style 24-h string from a floating game hour */
export function formatGameTime(h) {
  const hh = String(Math.floor(h) % 24).padStart(2, '0');
  const mm = String(Math.floor((h % 1) * 60)).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Returns a short period label: 🌙 0-5, 🌅 5-8, ☀️ 8-18, 🌇 18-21, 🌙 21-24 */
export function getDayPeriodIcon(h) {
  const hr = h % 24;
  if (hr < 5)  return '🌙';
  if (hr < 8)  return '🌅';
  if (hr < 18) return '☀️';
  if (hr < 21) return '🌇';
  return '🌙';
}
