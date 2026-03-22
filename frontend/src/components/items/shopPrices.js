// ─── Shop item prices ──────────────────────────────────────────────────────────
// All costs are deducted from real platform points (баллы) via /api/points/spend,
// EXCEPT builder-house (2nd/3rd) which costs in-game coins (монеты).
//
// ⚠️  Single source of truth: buildingsConfig.json → shop[*]
//     Edit costs, construction times and limits ONLY in that JSON file.

import cfg from './buildingsConfig.json';

const _shop = cfg.shop;

/** Point costs (баллы) per placed building / connection — from buildingsConfig.json */
export const ITEM_POINT_COST = Object.fromEntries(
  Object.entries(_shop)
    .filter(([, v]) => v.pointCost !== null && v.pointCost !== undefined)
    .map(([k, v]) => [k, v.pointCost])
);

/** In-game coin cost for the 2nd and 3rd builder house — from buildingsConfig.json */
export const BUILDER_HOUSE_EXTRA_COST_COINS = _shop['builder-house'].coinCost;

/**
 * Construction duration (ms) — time a builder is tied up after placing a building.
 * Builder-house itself never needs a builder.
 * Derived from buildingsConfig.json → shop[*].constructionMs (0 = instant, excluded).
 */
export const CONSTRUCTION_DURATION_MS = Object.fromEntries(
  Object.entries(_shop)
    .filter(([, v]) => v.constructionMs !== null && v.constructionMs !== undefined && v.constructionMs > 0)
    .map(([k, v]) => [k, v.constructionMs])
);

/** Max allowed placed count.  null = unlimited — from buildingsConfig.json */
export const ITEM_PLACE_LIMIT = Object.fromEntries(
  Object.entries(_shop)
    .filter(([, v]) => v.placeLimit !== null && v.placeLimit !== undefined)
    .map(([k, v]) => [k, v.placeLimit])
);
