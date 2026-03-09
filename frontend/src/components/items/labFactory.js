// ─── Lab Factory — item config ────────────────────────────────────────────────
//
// The lab-factory receives ore from extractors via drone routes and processes
// it into ingots (iron / silver / copper) — recipe chosen via right-click.
//
// Every 30 s (OpenCity.jsx production loop) the factory consumes ORE_PER_INGOT
// units from its internal ore buffer and outputs 1 ingot of the chosen recipe.
//
// The internal ore buffer is filled by drone routes from extractors.

import { registerStorage } from '../systems/energy.js';

// Register the internal ore input buffer.
// The game loop (OpenCity.jsx) drains from this buffer when producing ingots.
registerStorage('lab-factory', [
  { type: 'ore', capacity: 50, unit: 'ед.' },
]);
