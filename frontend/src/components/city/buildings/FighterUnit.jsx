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

const FIGHTER_SCALE    = 1.5;
const FLIGHT_SPEED     = 18;   // world units / second
const IDLE_BOB_SPEED   = 1.2;  // Hz
const IDLE_BOB_AMP     = 0.5;  // world units
const IDLE_HOVER_Y     = 1.8;  // height above ground when on platform
const ARRIVAL_DIST     = 1.5;  // snap-to-target distance
const RETURN_PATROL_R  = 0;    // 0 = no auto-patrol; extend later if desired

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

// ─── Engine thrust trail ───────────────────────────────────────────────────────

function ThrustTrail({ flying }) {
  const N   = 8;
  const ref = useRef();
  const ts  = useRef(Array.from({ length: N }, (_, i) => i / N));
  const geo = useMemo(() => new THREE.SphereGeometry(0.12, 4, 3), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#818cf8', emissive: '#818cf8', emissiveIntensity: 1.6,
    transparent: true, opacity: 0.6, depthWrite: false,
  }), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    if (!ref.current || !flying) {
      if (ref.current) ref.current.visible = false;
      return;
    }
    ref.current.visible = true;
    for (let i = 0; i < N; i++) {
      ts.current[i] = (ts.current[i] + delta * 0.5) % 1;
      const t = ts.current[i];
      dummy.position.set(0, -t * 3.5, 0);
      dummy.scale.setScalar((1 - t) * 0.7 + 0.1);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geo, mat, N]} />;
}

// ─── Main component ────────────────────────────────────────────────────────────

const _v   = new THREE.Vector3();
const _dir = new THREE.Vector3();

export function FighterUnit({ fighter, isSelected, onSelect, onUpdatePos }) {
  const groupRef = useRef();
  const posRef   = useRef(new THREE.Vector3(
    fighter.position[0], fighter.position[1] ?? IDLE_HOVER_Y, fighter.position[2],
  ));
  const yawRef   = useRef(0);
  const tRef     = useRef(0); // bob timer

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

      <ThrustTrail flying={flying} />
      {isSelected && <SelectionRing />}
    </group>
  );
}
