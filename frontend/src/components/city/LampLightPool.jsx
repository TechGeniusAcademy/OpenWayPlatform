/**
 * LampLightPool — global PointLight pool for StreetLamp buildings.
 *
 * Problem: every StreetLamp was mounting its own <pointLight>.
 * With 10+ lamps the GPU must evaluate each PointLight for every
 * rendered fragment, causing severe frame-rate drops.
 *
 * Solution: we keep exactly MAX_ACTIVE PointLights in the scene
 * and each frame assign them to the lamps closest to the camera.
 * All other lamps only show an emissive bulb glow (cheap, no cost).
 *
 * Usage:
 *   1. Place <LampLightPool /> somewhere inside the R3F <Canvas>.
 *   2. In each StreetLamp: import { registerLamp, unregisterLamp, updateLampIntensity }.
 */

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ─── How many real PointLights exist in the scene at once ───────────────────
const MAX_ACTIVE = 5;

// ─── Module-level registry: id → { x, y, z, intensity, color } ─────────────
// Module scope is safe here — there is exactly one city scene per session.
const _registry = new Map();
let   _nextId   = 0;

/**
 * Register a lamp with the pool. Call once (e.g. in useEffect).
 * @param {{ x: number, y: number, z: number, color: string }} data
 * @returns {number} opaque id used to update / unregister
 */
export function registerLamp(data) {
  const id = ++_nextId;
  _registry.set(id, { ...data, intensity: 0 });
  return id;
}

/**
 * Remove a lamp (call on component unmount).
 */
export function unregisterLamp(id) {
  _registry.delete(id);
}

/**
 * Update the desired intensity of a registered lamp every frame.
 * The pool will pick up this value when assigning lights.
 */
export function updateLampIntensity(id, intensity) {
  const entry = _registry.get(id);
  if (entry) entry.intensity = intensity;
}

// ─── Pool component (render once inside <Canvas>) ────────────────────────────

// Reusable scratch vector to avoid per-frame allocation
const _tmp = new THREE.Color();

export function LampLightPool({ distance = 22, decay = 2 }) {
  // Max 5 PointLights — hard-code refs to obey Rules of Hooks
  const r0 = useRef(); const r1 = useRef(); const r2 = useRef();
  const r3 = useRef(); const r4 = useRef();
  const refs = [r0, r1, r2, r3, r4];

  const { camera } = useThree();

  useFrame(() => {
    if (_registry.size === 0) return;

    const cx = camera.position.x;
    const cz = camera.position.z;

    // Sort by horizontal distance to camera (XZ only — cheaper)
    const sorted = [..._registry.values()].sort((a, b) => {
      const da = (a.x - cx) * (a.x - cx) + (a.z - cz) * (a.z - cz);
      const db = (b.x - cx) * (b.x - cx) + (b.z - cz) * (b.z - cz);
      return da - db;
    });

    for (let i = 0; i < MAX_ACTIVE; i++) {
      const lt = refs[i].current;
      if (!lt) continue;

      const lamp = sorted[i];
      if (!lamp || lamp.intensity <= 0.01) {
        lt.intensity = 0;
        continue;
      }

      lt.position.set(lamp.x, lamp.y, lamp.z);
      lt.intensity = lamp.intensity;
      if (lamp.color) lt.color.set(_tmp.set(lamp.color));
    }
  });

  return (
    <>
      {refs.map((ref, i) => (
        <pointLight
          key={i}
          ref={ref}
          intensity={0}
          distance={distance}
          decay={decay}
          castShadow={false}
        />
      ))}
    </>
  );
}
