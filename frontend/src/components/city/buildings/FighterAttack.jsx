/**
 * FighterAttack.jsx
 * Visual components for the fighter jet attack system:
 *   <Missile>   — a rocket that travels from A → B, calls onImpact on arrival
 *   <Explosion> — particle burst + flash sphere + point light, auto-fades
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MISSILE_SPEED = 38; // world units / second

// ─── Missile ──────────────────────────────────────────────────────────────────

const _mDir = new THREE.Vector3();
const _mUp  = new THREE.Vector3(0, 1, 0);
const _mQ   = new THREE.Quaternion();

export function Missile({ from, to, onImpact }) {
  const groupRef   = useRef();
  const trailRef   = useRef();       // instanced smoke trail
  const lightRef   = useRef();
  const posRef     = useRef(new THREE.Vector3(from[0], from[1], from[2]));
  const targetRef  = useRef(new THREE.Vector3(to[0], to[1], to[2]));
  const doneRef    = useRef(false);
  const dummy      = useMemo(() => new THREE.Object3D(), []);
  const TRAIL_N    = 10;
  const phases     = useMemo(() => Array.from({ length: TRAIL_N }, (_, i) => i / TRAIL_N), []);

  const trailGeo = useMemo(() => new THREE.SphereGeometry(0.12, 4, 3), []);
  const trailMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#f97316', transparent: true, opacity: 0.55, depthWrite: false,
  }), []);

  useFrame((_, delta) => {
    if (doneRef.current || !groupRef.current) return;

    // Move toward target
    _mDir.subVectors(targetRef.current, posRef.current);
    const dist = _mDir.length();

    if (dist < 1.8) {
      doneRef.current = true;
      groupRef.current.visible = false;
      onImpact?.();
      return;
    }

    _mDir.normalize();
    posRef.current.addScaledVector(_mDir, Math.min(MISSILE_SPEED * delta, dist));
    groupRef.current.position.copy(posRef.current);

    // Orient nose toward travel direction (+Y of cylinder → travel dir)
    _mQ.setFromUnitVectors(_mUp, _mDir);
    groupRef.current.quaternion.copy(_mQ);

    // Smoke trail — particles smear behind in -travel direction
    if (trailRef.current) {
      for (let i = 0; i < TRAIL_N; i++) {
        phases[i] = (phases[i] + delta * 0.6) % 1;
        const p = phases[i];
        dummy.position.set(
          -_mDir.x * p * 3.5,
          -_mDir.y * p * 3.5,
          -_mDir.z * p * 3.5,
        );
        dummy.scale.setScalar((1 - p) * 0.6 + 0.08);
        dummy.updateMatrix();
        trailRef.current.setMatrixAt(i, dummy.matrix);
      }
      trailRef.current.instanceMatrix.needsUpdate = true;
    }

    // Flicker light
    if (lightRef.current) {
      lightRef.current.intensity = 2.5 + Math.sin(performance.now() * 0.04) * 0.8;
    }
  });

  return (
    <group ref={groupRef} position={from}>
      {/* Rocket body */}
      <mesh>
        <cylinderGeometry args={[0.07, 0.13, 0.9, 6]} />
        <meshBasicMaterial color="#b91c1c" />
      </mesh>
      {/* Nose cone */}
      <mesh position={[0, 0.62, 0]}>
        <coneGeometry args={[0.07, 0.32, 6]} />
        <meshBasicMaterial color="#f97316" />
      </mesh>
      {/* Fins */}
      {[0, 90, 180, 270].map(deg => (
        <mesh key={deg} rotation={[0, (deg * Math.PI) / 180, 0]} position={[0, -0.38, 0.1]}>
          <boxGeometry args={[0.04, 0.22, 0.22]} />
          <meshBasicMaterial color="#7f1d1d" />
        </mesh>
      ))}
      {/* Smoke trail (instanced) */}
      <instancedMesh ref={trailRef} args={[trailGeo, trailMat, TRAIL_N]} />
      {/* Engine glow */}
      <pointLight ref={lightRef} color="#f97316" intensity={2.5} distance={8} decay={2} />
    </group>
  );
}

// ─── Explosion ────────────────────────────────────────────────────────────────

const EXPLOSION_LIFE = 1.5; // seconds
const PART_N         = 24;

export function Explosion({ position, onDone }) {
  const trailRef = useRef();
  const flashRef = useRef();
  const ringRef  = useRef();
  const lightRef = useRef();
  const tRef     = useRef(0);
  const dummy    = useMemo(() => new THREE.Object3D(), []);

  // Random burst directions, computed once
  const dirs = useMemo(() => Array.from({ length: PART_N }, () => {
    const v = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2.5 - 0.5, // bias slightly upward
      Math.random() * 2 - 1,
    ).normalize();
    v._speed = 5 + Math.random() * 10;
    v._col   = Math.random() > 0.4 ? '#f97316' : '#fbbf24';
    return v;
  }), []);

  const partGeo  = useMemo(() => new THREE.SphereGeometry(0.22, 4, 3), []);
  const partMat  = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#f97316', transparent: true, depthWrite: false,
  }), []);
  const ringGeo  = useMemo(() => new THREE.RingGeometry(0.2, 0.9, 24), []);
  const ringMat  = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#fbbf24', transparent: true, opacity: 0.8,
    side: THREE.DoubleSide, depthWrite: false,
  }), []);

  useFrame((_, delta) => {
    tRef.current += delta;
    const t    = tRef.current;
    const fade = Math.max(0, 1 - t / EXPLOSION_LIFE);

    if (t > EXPLOSION_LIFE + 0.05) { onDone?.(); return; }

    // Particles
    if (trailRef.current) {
      for (let i = 0; i < PART_N; i++) {
        const d = dirs[i];
        dummy.position.set(
          d.x * d._speed * t,
          d.y * d._speed * t,
          d.z * d._speed * t,
        );
        dummy.scale.setScalar(Math.max(0.05, (1 - t / EXPLOSION_LIFE) * 0.9));
        dummy.updateMatrix();
        trailRef.current.setMatrixAt(i, dummy.matrix);
      }
      trailRef.current.instanceMatrix.needsUpdate = true;
      trailRef.current.material.opacity = fade;
    }

    // Flash sphere — expands fast then fades
    if (flashRef.current) {
      const sc = Math.min(t * 18, 5.5) * 0.5 + 0.5;
      flashRef.current.scale.setScalar(sc);
      flashRef.current.material.opacity = fade * 0.65;
    }

    // Shockwave ring — flat ring expanding outward
    if (ringRef.current) {
      const sc = 1 + t * 22;
      ringRef.current.scale.setScalar(sc);
      ringRef.current.material.opacity = fade * 0.55;
    }

    // Point light
    if (lightRef.current) {
      lightRef.current.intensity = fade * 12;
    }
  });

  return (
    <group position={position}>
      {/* Particle burst */}
      <instancedMesh ref={trailRef} args={[partGeo, partMat, PART_N]} />

      {/* Central flash sphere */}
      <mesh ref={flashRef}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.65} depthWrite={false} />
      </mesh>

      {/* Horizontal shockwave ring */}
      <mesh ref={ringRef} geometry={ringGeo} material={ringMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]} />

      {/* Bright point light */}
      <pointLight ref={lightRef} color="#f97316" intensity={12} distance={28} decay={2} />
    </group>
  );
}
