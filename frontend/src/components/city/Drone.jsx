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
const DRONE_SCALE  = 0.75;     // world-unit scale of the GLB
const FLY_HEIGHT   = 10;       // arc peak height above the ground line
const HOVER_Y      = 3.8;      // hover height above building base
const BOB_AMP      = 0.18;     // hover bob amplitude
const BASE_CYCLE   = 14;       // full round-trip duration at rate=0 (seconds)

// Phase boundaries (fraction of a full cycle 0..1)
const PH_LOAD     = 0.12;  // 0..PH_LOAD      = loading at source
const PH_FLY_TO   = 0.45;  // PH_LOAD..PH_FLY_TO = flying to destination
const PH_UNLOAD   = 0.58;  // PH_FLY_TO..PH_UNLOAD = unloading at dest
const PH_FLY_BACK = 0.90;  // PH_UNLOAD..PH_FLY_BACK = flying back
                             // PH_FLY_BACK..1.0 = landing at source

// Shared geometry reuse (nothing interactive needed)

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
function DroneInner({ from, to, rule, effectiveRate }) {
  const fromBase  = new THREE.Vector3(from.position[0], from.position[1] ?? 0, from.position[2]);
  const toBase    = new THREE.Vector3(to.position[0],   to.position[1]   ?? 0, to.position[2]);
  const fromHover = fromBase.clone().setY(fromBase.y + HOVER_Y);
  const toHover   = toBase.clone().setY(toBase.y   + HOVER_Y);

  // Load the drone GLB (cached by useGLTF)
  const { scene: droneScene } = useGLTF('/models/Little Drone.glb');

  // Each drone instance needs its own cloned scene graph
  const cloneRef   = useRef(null);
  if (!cloneRef.current) cloneRef.current = droneScene.clone(true);

  const groupRef   = useRef();
  const cargoRef   = useRef();
  const phaseRef   = useRef(0);
  const prevPosRef = useRef(new THREE.Vector3());

  // Cycle speed: scales with effectiveRate. Base=14s, min cycle=4s at high rates.
  const cycleSpeed = effectiveRate > 0
    ? 1 / Math.max(4, BASE_CYCLE * (1 - Math.min(effectiveRate / 40, 0.7)))
    : 1 / BASE_CYCLE;

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

    phaseRef.current = (t + dt * cycleSpeed) % 1;
  });

  const ruleColor = rule?.color ?? '#38bdf8';

  return (
    <group>
      {/* Drone body */}
      <group ref={groupRef} scale={DRONE_SCALE}>
        <primitive object={cloneRef.current} />
      </group>

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
export const Drone = memo(function Drone({ fromId, toId, placedItems, effectiveRate }) {
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
    />
  );
});

// Pre-load the drone model so it's ready before first render
useGLTF.preload('/models/Little Drone.glb');
