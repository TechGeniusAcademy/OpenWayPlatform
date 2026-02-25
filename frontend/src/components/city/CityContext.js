import { createContext } from 'react';

// ─── Context (avoids prop drilling into Building) ────────────────────────────
export const CityContext = createContext(null);

// ─── World constants ─────────────────────────────────────────────────────────
export const CHUNK_SIZE  = 40;   // world units per chunk side
export const RENDER_DIST = 4;    // chunks radius

// ─── RTS Camera constants ─────────────────────────────────────────────────────
export const CAM_PAN_SPEED  = 22;    // units/sec keyboard pan
export const CAM_ZOOM_MIN   = 10;    // min height
export const CAM_ZOOM_MAX   = 140;   // max height
export const CAM_ZOOM_STEP  = 6;
export const CAM_TILT       = 55;    // degrees above horizon (fixed RTS angle)
export const CAM_ROT_SPEED  = 1.5;   // radians/sec for Q/E rotation

// ─── Per-model position & tilt offsets ───────────────────────────────────────
// Y   – lift above ground (increase if model is underground)
// TILT_X / TILT_Z – fix model tilt in radians (e.g. Math.PI / 2  =  90°)
export const SOLAR_PANEL_Y      = 0;
export const SOLAR_PANEL_TILT_X = 0;
export const SOLAR_PANEL_TILT_Z = 0;

export const MONEY_FACTORY_Y      = 0;
export const MONEY_FACTORY_TILT_X = 0;
export const MONEY_FACTORY_TILT_Z = 0;

export const ENERGY_STORAGE_Y      = 0;
export const ENERGY_STORAGE_TILT_X = 0;
export const ENERGY_STORAGE_TILT_Z = 0;
