// ─── Shop item prices ──────────────────────────────────────────────────────────
// All costs are deducted from real platform points (баллы) via /api/points/spend,
// EXCEPT builder-house (2nd/3rd) which costs in-game coins (монеты).

/** Point costs (баллы) per placed building / connection. */
export const ITEM_POINT_COST = {
  'solar-panel':    200,
  'energy-storage': 500,
  'street-lamp':     50,
  'money-factory':  400,
  'town-hall':     1000,
  'extractor':      150,
  'conveyor':        20,
  'cable':           10,
  'splitter':        40,
  'merger':          40,
  'builder-house':    0,  // first one free; others cost coins (see below)
  'coal-generator': 300,
  'hangar':          600,
  'pump':            120,
  'pump-factory':    350,
  'steam-generator': 450,
  'defense-tower':   600,
  'lab-factory':      500,
};

/** In-game coin cost for the 2nd and 3rd builder house. */
export const BUILDER_HOUSE_EXTRA_COST_COINS = 500;

/**
 * Construction duration (ms) — time a builder is tied up after placing a building.
 * Builder-house itself never needs a builder.
 */
export const CONSTRUCTION_DURATION_MS = {
  'solar-panel':     12_000,
  'energy-storage':  20_000,
  'street-lamp':      6_000,
  'money-factory':   25_000,
  'town-hall':       45_000,
  'extractor':       15_000,
  'coal-generator':  20_000,
  'hangar':          30_000,
  'splitter':         8_000,
  'merger':           8_000,
  'pump':            10_000,
  'pump-factory':    22_000,
  'steam-generator': 28_000,
  'defense-tower':   20_000,
  'lab-factory':      30_000,
};

/** Max allowed placed count.  null = unlimited. */
export const ITEM_PLACE_LIMIT = {
  'town-hall':     1,
  'builder-house': 3,
};
