// ─── Drone.jsx ────────────────────────────────────────────────────────────────
//
// Visual component for a single drone route between two buildings.
// The drone:
//   1. Hovers + loads cargo at the source building
//   2. Flies (arc trajectory) to the destination
//   3. Hovers + unloads at destination
//   4. Flies back empty
//   5. Repeats
//
// Game-logic (resource accumulation) is untouched — this is purely visual.
//
// Props:
//   fromId         — source building id
//   toId           — destination building id
//   placedItems    — current placed item list
//   effectiveRate  — computed per-hour transfer rate (0 = drone idle at source)
//   onRightClick   — optional (clientX, clientY) => void
//
// Architecture: Two-component split so ALL hooks live in DroneInner (always
// rendered), while the null-guard lives in the outer Drone wrapper.

import { useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF }  from '@react-three/drei';
import * as THREE   from 'three';
import { getTransferRule } from '../systems/conveyor.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const DRONE_SCALE   = 1.95;   // world-unit scale of the GLB
const FLY_HEIGHT    = 10;     // arc peak height above the ground line
const HOVER_Y       = 3.8;    // hover height above building base
const BOB_AMP       = 0.18;   // hover bob amplitude
const DRONE_SPEED   = 10;     // world-units per second during flight
const MIN_CYCLE     = 6;      // minimum full cycle duration (seconds)

// Phase boundaries (fraction of a full cycle 0..1)
const PH_LOAD     = 0.12;  // 0..PH_LOAD      = loading at source
const PH_FLY_TO   = 0.45;  // PH_LOAD..PH_FLY_TO = flying to destination
const PH_UNLOAD   = 0.58;  // PH_FLY_TO..PH_UNLOAD = unloading at dest
const PH_FLY_BACK = 0.90;  // PH_UNLOAD..PH_FLY_BACK = flying back
                             // PH_FLY_BACK..1.0 = landing at source

// Fraction of cycle spent actually flying (there + back)
const FLY_FRACTION = (PH_FLY_TO - PH_LOAD) + (PH_FLY_BACK - PH_UNLOAD); // ~0.65

/**
 * Compute a stable pseudo-random phase offset [0..1) seeded by building ids.
 * This ensures each drone starts at a different point in its cycle.
 */
function initialPhase(fromId, toId) {
  return ((fromId * 1237 + toId * 5689) % 997) / 997;
}

// Shared geometry reuse (nothing interactive needed)

// Level → glow colour + ring size
const LEVEL_GLOW = [
  null,
  null,                           // 1 — no ring
  { color: '#4ade80', r: 0.55 }, // 2 — green
  { color: '#fbbf24', r: 0.70 }, // 3 — yellow-orange
  { color: '#a855f7', r: 0.90 }, // 4 — purple
];

// ─── Bezier arc helper ────────────────────────────────────────────────────────
function bezierArc(t, from, to, height) {
  const mx = (from.x + to.x) * 0.5;
  const my = Math.max(from.y, to.y) + height;
  const mz = (from.z + to.z) * 0.5;
  const t1 = 1 - t;
  return new THREE.Vector3(
    t1 * t1 * from.x + 2 * t1 * t * mx + t * t * to.x,
    t1 * t1 * from.y + 2 * t1 * t * my + t * t * to.y,
    t1 * t1 * from.z + 2 * t1 * t * mz + t * t * to.z,
  );
}

// ─── DroneInner — all hooks live here (satisfies Rules of Hooks) ──────────────
function DroneInner({ from, to, rule, effectiveRate, level = 1 }) {
  const fromBase  = new THREE.Vector3(from.position[0], from.position[1] ?? 0, from.position[2]);
  const toBase    = new THREE.Vector3(to.position[0],   to.position[1]   ?? 0, to.position[2]);
  const fromHover = fromBase.clone().setY(fromBase.y + HOVER_Y);
  const toHover   = toBase.clone().setY(toBase.y   + HOVER_Y);

  // Cycle duration scaled by actual distance so farther buildings → longer trips.
  // Two one-way flights occupy FLY_FRACTION of the cycle.
  const dist = fromHover.distanceTo(toHover);
  const baseCycleDuration = Math.max(MIN_CYCLE, (2 * dist / DRONE_SPEED) / FLY_FRACTION);

  // Load the drone GLB (cached by useGLTF)
  const { scene: droneScene } = useGLTF('/models/Little Drone.glb');

  // Each drone instance needs its own cloned scene graph
  const cloneRef   = useRef(null);
  if (!cloneRef.current) cloneRef.current = droneScene.clone(true);

  const groupRef   = useRef();
  const cargoRef   = useRef();
  const glowRef    = useRef();
  // Start at a unique offset so drones on different (or same) routes don't sync up.
  const phaseRef   = useRef(initialPhase(from.id, to.id));
  const prevPosRef = useRef(new THREE.Vector3());

  // Cycle speed: distance-scaled base, slightly boosted at high transfer rates.
  const cycleDuration = effectiveRate > 0
    ? Math.max(MIN_CYCLE * 0.5, baseCycleDuration * (1 - Math.min(effectiveRate / 40, 0.5)))
    : baseCycleDuration;
  const cycleSpeed = 1 / cycleDuration;

  useFrame((_, dt) => {
    const group = groupRef.current;
    if (!group) return;

    const t = phaseRef.current;
    let pos = new THREE.Vector3();
    let rotTarget = 0;

    if (effectiveRate <= 0) {
      // Idle: hover at source, slow clockwise spin
      const bob = Math.sin(Date.now() / 700) * BOB_AMP;
      pos.copy(fromHover).setY(fromHover.y + bob);
      rotTarget = group.rotation.y + dt * 0.6;
    } else if (t < PH_LOAD) {
      // Loading at source
      const localT = t / PH_LOAD;
      const bob = Math.sin(localT * Math.PI * 3) * BOB_AMP;
      pos.copy(fromHover).setY(fromHover.y + bob);
      rotTarget = Math.sin(localT * Math.PI) * 0.4;
    } else if (t < PH_FLY_TO) {
      // Flying to destination (arc)
      const ft = (t - PH_LOAD) / (PH_FLY_TO - PH_LOAD);
      pos = bezierArc(ft, fromHover, toHover, FLY_HEIGHT);
      const dir = pos.clone().sub(prevPosRef.current);
      if (dir.lengthSq() > 0.0001) rotTarget = Math.atan2(dir.x, dir.z);
    } else if (t < PH_UNLOAD) {
      // Unloading at destination
      const localT = (t - PH_FLY_TO) / (PH_UNLOAD - PH_FLY_TO);
      const bob = Math.sin(localT * Math.PI * 3) * BOB_AMP;
      pos.copy(toHover).setY(toHover.y + bob);
      const backDir = fromHover.clone().sub(toHover);
      rotTarget = Math.atan2(backDir.x, backDir.z);
    } else if (t < PH_FLY_BACK) {
      // Flying back (arc)
      const ft = (t - PH_UNLOAD) / (PH_FLY_BACK - PH_UNLOAD);
      pos = bezierArc(ft, toHover, fromHover, FLY_HEIGHT);
      const dir = pos.clone().sub(prevPosRef.current);
      if (dir.lengthSq() > 0.0001) rotTarget = Math.atan2(dir.x, dir.z);
    } else {
      // Final approach to source
      const ft = (t - PH_FLY_BACK) / (1 - PH_FLY_BACK);
      const bob = Math.sin(ft * Math.PI) * BOB_AMP * 0.5;
      pos.copy(fromHover).setY(fromHover.y - ft * BOB_AMP + bob);
      rotTarget = 0;
    }

    prevPosRef.current.copy(group.position);
    group.position.copy(pos);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, rotTarget, Math.min(1, dt * 8));

    if (cargoRef.current) {
      cargoRef.current.visible = t >= PH_LOAD && t < PH_FLY_TO;
      if (cargoRef.current.visible) {
        cargoRef.current.position.copy(pos).setY(pos.y - 0.7);
      }
    }

    if (glowRef.current) {
      glowRef.current.position.copy(pos).setY(pos.y - 0.5);
      const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.003);
      glowRef.current.material.opacity = pulse * 0.55;
      glowRef.current.rotation.z += dt * 1.5;
    }

    phaseRef.current = (t + dt * cycleSpeed) % 1;
  });

  const ruleColor = rule?.color ?? '#38bdf8';
  const glow = LEVEL_GLOW[level] ?? null;

  return (
    <group>
      {/* Drone body */}
      <group ref={groupRef} scale={DRONE_SCALE}>
        <primitive object={cloneRef.current} />
      </group>

      {/* Level glow ring — only for level 2+ */}
      {glow && (
        <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[glow.r * 0.6, glow.r, 24]} />
          <meshBasicMaterial
            color={glow.color}
            transparent
            opacity={0.5}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Cargo indicator — glowing sphere, shown while flying loaded */}
      <mesh ref={cargoRef} visible={false}>
        <sphereGeometry args={[0.30, 6, 5]} />
        <meshStandardMaterial
          color={ruleColor}
          emissive={ruleColor}
          emissiveIntensity={1.2}
          transparent
          opacity={0.9}
        />
      </mesh>

    </group>
  );
}

// ─── Public Drone component ───────────────────────────────────────────────────
// Null-guard wrapper: if either building is gone, render nothing.
// DroneInner always mounts so all hooks are called unconditionally.
export const Drone = memo(function Drone({ fromId, toId, placedItems, effectiveRate, level = 1 }) {
  const from = placedItems.find(i => i.id === fromId);
  const to   = placedItems.find(i => i.id === toId);
  if (!from || !to) return null;

  const rule = getTransferRule(from.type, to.type);

  return (
    <DroneInner
      from={from}
      to={to}
      rule={rule}
      effectiveRate={effectiveRate}
      level={level}
    />
  );
}, (prev, next) => {
  if (prev.fromId !== next.fromId || prev.toId !== next.toId) return false;
  if (prev.effectiveRate !== next.effectiveRate) return false;
  if (prev.level !== next.level) return false;
  const pFrom = prev.placedItems.find(i => i.id === prev.fromId);
  const nFrom = next.placedItems.find(i => i.id === next.fromId);
  const pTo   = prev.placedItems.find(i => i.id === prev.toId);
  const nTo   = next.placedItems.find(i => i.id === next.toId);
  if (!pFrom || !pTo || !nFrom || !nTo) return pFrom === nFrom && pTo === nTo;
  return (
    pFrom.position === nFrom.position &&
    pTo.position   === nTo.position
  );
});

// Pre-load the drone model so it's ready before first render
useGLTF.preload('/models/Little Drone.glb');
