// ─── PumpDrone.jsx ────────────────────────────────────────────────────────────
//
// Visual component for a pump drone route: pump → pump-factory.
// Uses pumpdrone.glb with its built-in animation clip enabled.
//
// Behaviour mirrors Drone.jsx:
//   1. Hover + load water at the pump
//   2. Arc flight to pump factory
//   3. Hover + unload at pump factory
//   4. Fly back empty
//   5. Repeat
//
// The water transfer rate (liters/hr) is determined by the connection level:
//   Level 1 → 20 л/ч
//   Level 2 → 40 л/ч
//   Level 3 → 120 л/ч
//   Level 4 → 200 л/ч

import { useRef, useEffect, memo } from 'react';
import { useFrame }     from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE       from 'three';

// ─── Constants ────────────────────────────────────────────────────────────────
const DRONE_SCALE  = 1;
const FLY_HEIGHT   = 9;
const HOVER_Y      = 3.5;
const BOB_AMP      = 0.15;
const BASE_CYCLE   = 16;   // base round-trip seconds at effectiveRate=0

const PH_LOAD     = 0.12;
const PH_FLY_TO   = 0.45;
const PH_UNLOAD   = 0.58;
const PH_FLY_BACK = 0.90;

// ─── Per-route phase offset so drones don't move in sync ────────────────────
function initialPhase(fromId, toId) {
  return ((fromId * 1237 + toId * 5689) % 997) / 997;
}

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

// ─── PumpDroneInner — all hooks live here ─────────────────────────────────────
const LEVEL_GLOW = [
  null,
  null,
  { color: '#4ade80', r: 0.55 },
  { color: '#fbbf24', r: 0.70 },
  { color: '#a855f7', r: 0.90 },
];

function PumpDroneInner({ from, to, effectiveRate, level = 1 }) {
  const fromBase  = new THREE.Vector3(from.position[0], from.position[1] ?? 0, from.position[2]);
  const toBase    = new THREE.Vector3(to.position[0],   to.position[1]   ?? 0, to.position[2]);
  const fromHover = fromBase.clone().setY(fromBase.y + HOVER_Y);
  const toHover   = toBase.clone().setY(toBase.y   + HOVER_Y);

  const groupRef    = useRef();
  const spinRef     = useRef();   // inner group — continuous UFO spin
  const cargoRef    = useRef();
  const glowRef     = useRef();
  const phaseRef    = useRef(initialPhase(from.id ?? 0, to.id ?? 0));
  const prevPosRef  = useRef(new THREE.Vector3());
  const mixerRef    = useRef(null);
  const spinAngle   = useRef(0);

  // Load pumpdrone GLB with its animation clips
  const { scene: droneScene, animations } = useGLTF('/models/PumpDrone.glb');
  const cloneRef = useRef(null);
  if (!cloneRef.current) cloneRef.current = droneScene.clone(true);

  // Manual AnimationMixer targeting the cloned scene (useAnimations won't work on clones)
  useEffect(() => {
    if (!cloneRef.current || !animations || animations.length === 0) return;
    const mixer = new THREE.AnimationMixer(cloneRef.current);
    animations.forEach(clip => mixer.clipAction(clip).reset().play());
    mixerRef.current = mixer;
    return () => { mixer.stopAllAction(); mixerRef.current = null; };
  }, []); // eslint-disable-line

  // Cycle speed: faster at higher rates
  const cycleSpeed = effectiveRate > 0
    ? 1 / Math.max(5, BASE_CYCLE * (1 - Math.min(effectiveRate / 200, 0.7)))
    : 1 / BASE_CYCLE;

  useFrame((_, dt) => {
    const group = groupRef.current;
    if (!group) return;

    const t = phaseRef.current;
    let pos       = new THREE.Vector3();
    let rotTarget = 0;

    if (effectiveRate <= 0) {
      // Idle: hover at pump source
      const bob = Math.sin(Date.now() / 700) * BOB_AMP;
      pos.copy(fromHover).setY(fromHover.y + bob);
      rotTarget = group.rotation.y + dt * 0.5;
    } else if (t < PH_LOAD) {
      // Loading water at pump
      const localT = t / PH_LOAD;
      const bob = Math.sin(localT * Math.PI * 3) * BOB_AMP;
      pos.copy(fromHover).setY(fromHover.y + bob);
      rotTarget = Math.sin(localT * Math.PI) * 0.4;
    } else if (t < PH_FLY_TO) {
      // Flying loaded to pump factory
      const ft  = (t - PH_LOAD) / (PH_FLY_TO - PH_LOAD);
      pos = bezierArc(ft, fromHover, toHover, FLY_HEIGHT);
      const dir = pos.clone().sub(prevPosRef.current);
      if (dir.lengthSq() > 0.0001) rotTarget = Math.atan2(dir.x, dir.z);
    } else if (t < PH_UNLOAD) {
      // Unloading at pump factory
      const localT = (t - PH_FLY_TO) / (PH_UNLOAD - PH_FLY_TO);
      const bob = Math.sin(localT * Math.PI * 3) * BOB_AMP;
      pos.copy(toHover).setY(toHover.y + bob);
      const backDir = fromHover.clone().sub(toHover);
      rotTarget = Math.atan2(backDir.x, backDir.z);
    } else if (t < PH_FLY_BACK) {
      // Flying empty back to pump
      const ft  = (t - PH_UNLOAD) / (PH_FLY_BACK - PH_UNLOAD);
      pos = bezierArc(ft, toHover, fromHover, FLY_HEIGHT);
      const dir = pos.clone().sub(prevPosRef.current);
      if (dir.lengthSq() > 0.0001) rotTarget = Math.atan2(dir.x, dir.z);
    } else {
      // Final approach / landing at pump source
      const ft  = (t - PH_FLY_BACK) / (1 - PH_FLY_BACK);
      const bob = Math.sin(ft * Math.PI) * BOB_AMP * 0.5;
      pos.copy(fromHover).setY(fromHover.y - ft * BOB_AMP + bob);
      rotTarget = 0;
    }

    prevPosRef.current.copy(group.position);
    group.position.copy(pos);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, rotTarget, Math.min(1, dt * 8));

    // UFO saucer spin — continuous fast rotation on local Y, slight Z tilt
    spinAngle.current += dt * 2.4;
    if (spinRef.current) {
      spinRef.current.rotation.y = spinAngle.current;
      spinRef.current.rotation.z = Math.sin(Date.now() * 0.00085) * 0.09;
    }

    if (cargoRef.current) {
      cargoRef.current.visible = t >= PH_LOAD && t < PH_FLY_TO;
      if (cargoRef.current.visible) {
        cargoRef.current.position.copy(pos).setY(pos.y - 0.6);
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

  return (
    <group>
      {/* Drone body — outer group controls flight direction, inner spins like a UFO */}
      <group ref={groupRef} scale={DRONE_SCALE}>
        <group ref={spinRef}>
          <primitive object={cloneRef.current} />
        </group>
      </group>

      {/* Level glow ring — only level 2+ */}
      {(LEVEL_GLOW[level] ?? null) && (
        <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[LEVEL_GLOW[level].r * 0.6, LEVEL_GLOW[level].r, 24]} />
          <meshBasicMaterial
            color={LEVEL_GLOW[level].color}
            transparent
            opacity={0.5}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Water cargo indicator — glowing blue sphere while flying loaded */}
      <mesh ref={cargoRef} visible={false}>
        <sphereGeometry args={[0.28, 6, 5]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={1.3}
          transparent
          opacity={0.88}
        />
      </mesh>
    </group>
  );
}

// ─── Public PumpDrone component ───────────────────────────────────────────────
// Null-guard wrapper: if either building is gone, render nothing.
export const PumpDrone = memo(function PumpDrone({ fromId, toId, placedItems, effectiveRate, level = 1 }) {
  const from = placedItems.find(i => i.id === fromId);
  const to   = placedItems.find(i => i.id === toId);
  if (!from || !to) return null;

  return (
    <PumpDroneInner
      from={from}
      to={to}
      effectiveRate={effectiveRate ?? 0}
      level={level}
    />
  );
});

useGLTF.preload('/models/PumpDrone.glb');
