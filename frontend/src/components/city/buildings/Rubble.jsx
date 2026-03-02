import { useRef, useMemo } from 'react';
import { useFrame }        from '@react-three/fiber';
import * as THREE          from 'three';

// ─── Rubble ───────────────────────────────────────────────────────────────────
// Rendered in place of a destroyed building.
// Visual elements:
//   • Scorched ground disc (dark, semi-transparent)
//   • 8 scattered debris chunks (random-rotated boxes)
//   • 5 slow smoke wisps that drift upward and loop

const DEBRIS_COUNT = 8;
const WISP_COUNT   = 5;

// Pre-seeded debris layout so it looks the same each render
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function Rubble({ position = [0, 0, 0], buildingType = '' }) {
  const wispsRef = useRef([]);
  const rand     = useMemo(() => seededRandom(position[0] * 397 + position[2] * 1013 + 17), [position]);

  // ── Build debris geometry data once ─────────────────────────────────────────
  const debrisData = useMemo(() => {
    const r = seededRandom(position[0] * 397 + position[2] * 1013 + 17);
    return Array.from({ length: DEBRIS_COUNT }, () => ({
      x:  (r() - 0.5) * 5,
      z:  (r() - 0.5) * 5,
      y:   r() * 0.35,
      rx:  r() * Math.PI,
      ry:  r() * Math.PI,
      rz:  r() * Math.PI,
      w:   0.3 + r() * 0.7,
      h:   0.15 + r() * 0.4,
      d:   0.2 + r() * 0.5,
    }));
  }, [position]);

  // ── Smoke wisp init data ─────────────────────────────────────────────────────
  const wispData = useMemo(() => {
    const r = seededRandom(position[0] * 113 + position[2] * 7 + 3);
    return Array.from({ length: WISP_COUNT }, (_, i) => ({
      x:   (r() - 0.5) * 3,
      z:   (r() - 0.5) * 3,
      startY:  0.2 + r() * 0.5,
      speed:   0.4 + r() * 0.5,
      phase:   (i / WISP_COUNT) * Math.PI * 2,
      lifetime: 2.5 + r() * 1.5,
    }));
  }, [position]);

  // ── Animate smoke wisps ──────────────────────────────────────────────────────
  useFrame((_, delta) => {
    wispsRef.current.forEach((mesh, i) => {
      if (!mesh) return;
      const d = wispData[i];
      // advance phase
      d._t = ((d._t ?? d.phase) + delta * d.speed) % d.lifetime;
      const progress = d._t / d.lifetime; // 0→1

      mesh.position.y = d.startY + progress * 3.5;
      const s = (0.2 + progress * 0.6) * (1 - progress * 0.8);
      mesh.scale.setScalar(Math.max(0.001, s));
      if (mesh.material) {
        mesh.material.opacity = Math.max(0, 0.35 * (1 - Math.pow(progress, 2)));
      }
    });
  });

  return (
    <group position={position}>
      {/* ── Scorched ground disc ───────────────────────────────────────── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[3.2, 32]} />
        <meshStandardMaterial
          color="#1a0f00"
          roughness={1}
          metalness={0}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* ── Inner burn ring ────────────────────────────────────────────── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.6, 1.8, 24]} />
        <meshStandardMaterial
          color="#0a0500"
          roughness={1}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* ── Debris chunks ──────────────────────────────────────────────── */}
      {debrisData.map((d, i) => (
        <mesh
          key={i}
          position={[d.x, d.y, d.z]}
          rotation={[d.rx, d.ry, d.rz]}
          castShadow
        >
          <boxGeometry args={[d.w, d.h, d.d]} />
          <meshStandardMaterial
            color={i % 3 === 0 ? '#4a3520' : i % 3 === 1 ? '#2d2d2d' : '#3a2a14'}
            roughness={0.9}
            metalness={0.05}
          />
        </mesh>
      ))}

      {/* ── Broken wall slabs (3 bigger pieces) ────────────────────────── */}
      {[
        { x: -1.2, z:  0.8, ry: 0.4,  w: 0.15, h: 1.1, d: 1.5 },
        { x:  1.0, z: -0.6, ry: -0.7, w: 0.15, h: 0.7, d: 1.2 },
        { x:  0.3, z:  1.3, ry: 1.1,  w: 0.15, h: 0.9, d: 0.8 },
      ].map((s, i) => (
        <mesh key={`slab-${i}`} position={[s.x, s.h * 0.5, s.z]} rotation={[0, s.ry, 0.35]} castShadow>
          <boxGeometry args={[s.w, s.h, s.d]} />
          <meshStandardMaterial color="#5a4830" roughness={0.95} />
        </mesh>
      ))}

      {/* ── Smoke wisps ────────────────────────────────────────────────── */}
      {wispData.map((d, i) => (
        <mesh
          key={`wisp-${i}`}
          ref={el => { wispsRef.current[i] = el; }}
          position={[d.x, d.startY, d.z]}
        >
          <sphereGeometry args={[0.35, 6, 6]} />
          <meshStandardMaterial
            color="#555555"
            transparent
            opacity={0.3}
            roughness={1}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
