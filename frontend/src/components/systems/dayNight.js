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
    turbidity:       2  + t * 10,       // crisp noon → heavy dusk
    rayleigh:        0.5 + t * 2.5,
    mieCoefficient:  0.002 + t * 0.03,
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
  const dusk      = Math.max(0, Math.min(1, (elev + 0.15) / 0.15)); // 0→1 around horizon
  const isGolden  = elev > -0.15 && elev < 0.32; // sunrise / sunset glow
  return {
    // Night: 0.45 ambient (moonlit), ramps to 1.8 at clear noon
    ambientIntensity: 0.45 + dayFactor * 1.35,
    ambientColor:     elev > 0 ? '#ddeeff' : '#1a2240',
    // Sun: 0 at night, peaks at 5.5 at noon
    dirIntensity:     dayFactor * 5.5,
    dirColor:         isGolden ? '#ffcc88' : '#fff8e8',
    // Hemisphere: 0.55 at night (subtle sky glow), 2.2 at noon
    hemiIntensity:    0.55 + dayFactor * 1.65,
    hemiSky:          elev > 0 ? '#a8d4ff' : '#141e3c',
    hemiGround:       elev > 0 ? '#4a7a4a' : '#0d120d',
  };
}

// ─── Fog colour ───────────────────────────────────────────────────────────────

/**
 * Returns a CSS/hex string for the scene fog colour.
 * @param {number} h
 */
export function getFogColor(h) {
  const elev = Math.sin(((h / 24) * 2 - 0.5) * Math.PI);
  if (elev < -0.1)  return '#080f1e';              // deep night — slightly lighter
  if (elev <  0.2)  return '#d05820';              // golden hour
  const bright = Math.round(55 + elev * 30);       // brighter daytime haze
  return `hsl(205, 50%, ${bright}%)`;
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
