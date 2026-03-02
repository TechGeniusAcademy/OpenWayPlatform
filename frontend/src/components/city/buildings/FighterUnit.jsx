/**
 * FighterUnit — a player-owned fighter jet (Spaceship.glb)
 *
 * Each fighter is a stateful entity stored in OpenCity's `placedFighters` array:
 *   { id, hangarId, position:[x,y,z], target:[x,y,z]|null, state:'idle'|'flying' }
 *
 * Props:
 *   fighter     – fighter data object (see above)
 *   isSelected  – highlight with selection ring
 *   onSelect    – callback when fighter is clicked
 *   onArrive    – called when the fighter reaches its target
 *   onUpdatePos – (id, newPos) => void — syncs position back to OpenCity state
 */

import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const SPACESHIP_URL = '/models/Spaceship.glb';
useGLTF.preload(SPACESHIP_URL);

const FIGHTER_SCALE    = 0.75;
const FLIGHT_SPEED     = 18;   // world units / second
const IDLE_BOB_SPEED   = 1.2;  // Hz
const IDLE_BOB_AMP     = 0.5;  // world units
const IDLE_HOVER_Y     = 1.8;  // height above ground when on platform
const ARRIVAL_DIST     = 1.5;  // snap-to-target distance

const ATTACK_RANGE     = 45;   // world-units to nearest enemy building before firing
const ATTACK_COOLDOWN  = 3.5;  // seconds between shots per fighter

// ─── GLB wrapper ──────────────────────────────────────────────────────────────

function SpaceshipGLB({ glowColor = '#818cf8', glowIntensity = 0 }) {
  const { scene } = useGLTF(SPACESHIP_URL);
  const { model, yOffset } = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const fix = (mat) => {
        const m = mat.clone();
        m.clippingPlanes = [];
        if (m.emissive && glowIntensity > 0) {
          m.emissive.set(glowColor);
          m.emissiveIntensity = glowIntensity;
        }
        return m;
      };
      obj.material = Array.isArray(obj.material)
        ? obj.material.map(fix)
        : fix(obj.material);
    });
    const box    = new THREE.Box3().setFromObject(clone);
    const offset = -box.min.y * FIGHTER_SCALE;
    return { model: clone, yOffset: offset };
  }, [scene, glowColor, glowIntensity]);

  return (
    <primitive
      object={model}
      scale={[FIGHTER_SCALE, FIGHTER_SCALE, FIGHTER_SCALE]}
      position={[0, yOffset, 0]}
      castShadow
    />
  );
}

// ─── Procedural fallback ───────────────────────────────────────────────────────

function ProceduralFighter({ glowIntensity = 0 }) {
  return (
    <group>
      {/* Fuselage */}
      <mesh castShadow>
        <cylinderGeometry args={[0.5, 0.25, 3.5, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Wings */}
      <mesh castShadow position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[5, 0.15, 1.2]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Engine glow */}
      <mesh position={[0, -1.6, 0]}>
        <sphereGeometry args={[0.35, 8, 6]} />
        <meshStandardMaterial
          color="#818cf8"
          emissive="#818cf8"
          emissiveIntensity={1 + glowIntensity}
          transparent opacity={0.9}
        />
      </mesh>
    </group>
  );
}

// ─── Selection ring ────────────────────────────────────────────────────────────

function SelectionRing() {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = 0.55 + Math.sin(clock.getElapsedTime() * 5) * 0.35;
    ref.current.material.opacity = pulse;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
      <ringGeometry args={[2.0, 2.6, 24]} />
      <meshBasicMaterial color="#22d3ee" transparent opacity={0.75} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── Afterburner engine effect ────────────────────────────────────────────────
//
// Fighter nose points in +Z (yaw = atan2(dx, dz)).
// Tail is at -Z in local space → all flame/particles trail in -Z direction.
//
//   1. Engine core  — bright pulsing sphere at nozzle, always visible
//   2. Flame cone   — CylinderGeometry rotated so wide end at Z=0, tip at Z=-3.2
//   3. Particle trail — stream in -Z direction in XY spread, flying only
//   4. Point light  — dynamic glow, intensity driven by fly state

const NOZZLE_Z = -2.0;  // local Z of the engine nozzle (tail of ship)
const NOZZLE_H =  0.5;  // local Y (height) of the nozzle above model origin

function Afterburner({ flying }) {
  const coreRef  = useRef();
  const coneRef  = useRef();
  const trailRef = useRef();
  const lightRef = useRef();
  const dummy    = useMemo(() => new THREE.Object3D(), []);

  const N       = 16;
  const coreGeo = useMemo(() => new THREE.SphereGeometry(0.28, 10, 8), []);
  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ffffff', transparent: true, opacity: 0.95, depthWrite: false,
  }), []);
  // CylinderGeometry(rTop, rBottom, height) — rTop=0.22 is at +Y (nozzle), rBottom=0 is tip
  // With rotation.x = +PI/2: local +Y → world +Z, so nozzle end lands at Z=0 when
  // the mesh is shifted by position=[0,0,-1.6] (half height). Tip lands at Z=-3.2.
  const coneGeo = useMemo(() => new THREE.CylinderGeometry(0.22, 0.0, 3.2, 12, 1, true), []);
  const coneMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#38bdf8', transparent: true, opacity: 0.55,
    side: THREE.DoubleSide, depthWrite: false,
  }), []);
  const partGeo = useMemo(() => new THREE.SphereGeometry(0.11, 4, 3), []);
  const partMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#818cf8', transparent: true, opacity: 0.7, depthWrite: false,
  }), []);

  const phases = useMemo(() => Array.from({ length: N }, (_, i) => i / N), []);

  useFrame(({ clock }, delta) => {
    const t         = clock.getElapsedTime();
    const fly       = flying;
    const corePulse = 0.8 + Math.sin(t * 14) * 0.2;

    // 1. Core
    if (coreRef.current) {
      coreRef.current.scale.setScalar((fly ? 1.15 : 0.72) * corePulse);
      coreRef.current.material.color.set(fly ? '#ffffff' : '#a5b4fc');
      coreRef.current.material.opacity = fly ? 0.98 : 0.55;
    }

    // 2. Flame cone (scale Y = cone length)
    if (coneRef.current) {
      const coneLen = fly
        ? 1.6 + Math.sin(t * 18) * 0.35
        : 0.55 + Math.sin(t * 6) * 0.08;
      coneRef.current.scale.set(1, coneLen, 1);
      coneRef.current.material.opacity = fly
        ? 0.4 + Math.sin(t * 20) * 0.12
        : 0.18;
      coneRef.current.material.color.setRGB(
        fly ? 0.22 : 0.51,
        fly ? 0.75 : 0.47,
        1.0,
      );
    }

    // 3. Particles — spawn at nozzle, stream along -Z, spread in XY plane
    if (trailRef.current) {
      if (!fly) {
        trailRef.current.visible = false;
      } else {
        trailRef.current.visible = true;
        for (let i = 0; i < N; i++) {
          phases[i] = (phases[i] + delta * (0.55 + (i % 3) * 0.15)) % 1;
          const p      = phases[i];
          const spread = p * 0.35;
          const angle  = i * 2.399; // golden-ratio spiral
          dummy.position.set(
            Math.cos(angle) * spread,  // X spread
            Math.sin(angle) * spread,  // Y spread
            -p * 6.0,                  // trail in -Z (behind the jet)
          );
          dummy.scale.setScalar((1 - p) * 0.55 + 0.05);
          dummy.updateMatrix();
          trailRef.current.setMatrixAt(i, dummy.matrix);
        }
        trailRef.current.instanceMatrix.needsUpdate = true;
      }
    }

    // 4. Point light
    if (lightRef.current) {
      lightRef.current.intensity = fly
        ? 3.5 + Math.sin(t * 16) * 1.0
        : 0.7 + Math.sin(t * 5) * 0.2;
    }
  });

  return (
    // Group placed at the tail of the ship in local model space
    <group position={[0, NOZZLE_H, NOZZLE_Z]}>
      {/* Bright nozzle core */}
      <mesh ref={coreRef} geometry={coreGeo} material={coreMat} />

      {/* Flame cone: rotated so wide end (nozzle) is at Z=0, tip at Z=-3.2 */}
      <mesh
        ref={coneRef}
        geometry={coneGeo}
        material={coneMat}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, -1.6]}
      />

      {/* Particle trail */}
      <instancedMesh ref={trailRef} args={[partGeo, partMat, N]} />

      {/* Engine glow light */}
      <pointLight ref={lightRef} color="#7dd3fc" intensity={0.7} distance={14} decay={2} />
    </group>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

const _v   = new THREE.Vector3();
const _dir = new THREE.Vector3();

export function FighterUnit({ fighter, isSelected, onSelect, onUpdatePos, enemyBuildings, onFireMissile }) {
  const groupRef = useRef();
  const posRef   = useRef(new THREE.Vector3(
    fighter.position[0], fighter.position[1] ?? IDLE_HOVER_Y, fighter.position[2],
  ));
  const yawRef         = useRef(10 * Math.PI / 180); // +10° left from default heading
  const tRef           = useRef(0); // bob timer
  const lastFireRef    = useRef(0); // timestamp of last missile launch

  const flying = fighter.state === 'flying' && !!fighter.target;

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (flying && fighter.target) {
      // Move toward target
      _v.set(fighter.target[0], fighter.target[1] ?? IDLE_HOVER_Y, fighter.target[2]);
      _dir.subVectors(_v, posRef.current);
      const dist = _dir.length();

      if (dist < ARRIVAL_DIST) {
        // Arrived — land on position
        posRef.current.copy(_v);
        onUpdatePos?.(fighter.id, [_v.x, _v.y, _v.z], 'idle', null);
      } else {
        _dir.normalize();
        const moved = Math.min(FLIGHT_SPEED * delta, dist);
        posRef.current.addScaledVector(_dir, moved);
        // Yaw toward heading
        const targetYaw = Math.atan2(_dir.x, _dir.z);
        yawRef.current  = yawRef.current + (targetYaw - yawRef.current) * Math.min(1, delta * 5);
      }

      // Smoothly rise to flight altitude
      const flyY = (fighter.target[1] ?? 0) + 12;
      posRef.current.y += (flyY - posRef.current.y) * Math.min(1, delta * 3);

    } else {
      // Idle: hover & bob
      tRef.current += delta * IDLE_BOB_SPEED;
      const ty = IDLE_HOVER_Y + Math.sin(tRef.current * Math.PI * 2) * IDLE_BOB_AMP;
      posRef.current.x = fighter.position[0];
      posRef.current.z = fighter.position[2];
      posRef.current.y += (ty - posRef.current.y) * Math.min(1, delta * 4);
    }

    groupRef.current.position.copy(posRef.current);
    groupRef.current.rotation.y = yawRef.current;

    // ── Attack: fire at nearest enemy building within range ──
    if (enemyBuildings && enemyBuildings.length > 0 && onFireMissile) {
      const now = performance.now() / 1000;
      if (now - lastFireRef.current >= ATTACK_COOLDOWN) {
        let nearest = null;
        let nearestDist = Infinity;
        for (const bld of enemyBuildings) {
          const dx = bld.position[0] - posRef.current.x;
          const dz = bld.position[2] - posRef.current.z;
          const d2 = dx * dx + dz * dz;
          if (d2 < nearestDist) { nearestDist = d2; nearest = bld; }
        }
        if (nearest && nearestDist < ATTACK_RANGE * ATTACK_RANGE) {
          lastFireRef.current = now;
          const fromPos = [posRef.current.x, posRef.current.y, posRef.current.z];
          const toPos   = [nearest.position[0], (nearest.position[1] ?? 0) + 2, nearest.position[2]];
          onFireMissile(fromPos, toPos);
        }
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={[fighter.position[0], fighter.position[1] ?? IDLE_HOVER_Y, fighter.position[2]]}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (e.button === 0) onSelect?.();
      }}
    >
      <Suspense fallback={<ProceduralFighter glowIntensity={isSelected ? 0.5 : 0} />}>
        <SpaceshipGLB
          glowColor={isSelected ? '#22d3ee' : '#818cf8'}
          glowIntensity={isSelected ? 0.4 : 0}
        />
      </Suspense>

      <Afterburner flying={flying} />
      {isSelected && <SelectionRing />}
    </group>
  );
}
