// ─── Builder's House (Дом строителя) — item config ───────────────────────────
//
// A small house that provides builders.
// Level 1: 1 builder  | Level 2: 2 builders | Level 3: 3 builders
//
// The first builder-house is free (0 points).
// 2nd and 3rd cost in-game coins (see shopPrices.js).
// Builder-houses do NOT need a builder to place (they self-construct).

export const BUILDER_HOUSE_CONFIG = {
  /** Work-area overlay radius */
  workArea: {
    width:   9,
    depth:   9,
    color:   '#f59e0b',
    opacity: 0.12,
    label:   'Зона строителей',
  },
  /** Badge height above the house */
  badgeHeight: 7,
};
