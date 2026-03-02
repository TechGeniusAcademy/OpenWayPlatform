// ─── Military Hangar (Военный Ангар) — item config ───────────────────────────
//
// The hangar houses fighter jets that can be ordered for in-game coins.
// Each ordered fighter spawns on the procedural tarmac platform next to
// the hangar and can be selected + directed to a flight target via RMB.
//
// Levels:
//   Level 1 → max 1 fighter
//   Level 2 → max 2 fighters
//   Level 3 → max 3 fighters

export const HANGAR_CONFIG = {
  /** Visible work-area zone shown when the building is selected */
  workArea: {
    width:   60,
    depth:   60,
    color:   '#6366f1',
    opacity: 0.12,
    label:   'Военная зона',
  },
  /** Height of floating badges above ground (world units) */
  badgeHeight: 9,
  /** Cost per fighter in in-game coins (0 = free) */
  fighterCoinCost: 10,
  /** Platform offset from hangar center (world units along -X, i.e. to the left) */
  platformOffsetX: -14,
  /** Slots on the platform (per level) */
  maxFightersPerLevel: [1, 2, 3],
};
