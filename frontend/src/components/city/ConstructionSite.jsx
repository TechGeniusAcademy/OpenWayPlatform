// ─── Construction Site Overlay ────────────────────────────────────────────────
// Shown on top of any building that is currently being constructed.
// Renders scaffolding poles + an animated HTML progress badge.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

// ── Shared scaffold materials ─────────────────────────────────────────────────
const POLE_MAT  = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.85, metalness: 0.1 });
const BOARD_MAT = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.9,  metalness: 0.0 });
const WRAP_MAT  = new THREE.MeshStandardMaterial({
  color: '#fde68a', roughness: 0.55, metalness: 0,
  transparent: true, opacity: 0.22,
  side: THREE.DoubleSide,
});

// ── Scaffolding mesh ──────────────────────────────────────────────────────────

function Scaffolding({ halfW = 3.5, halfH = 3.0 }) {
  const hw = halfW + 0.4;
  const hh = halfH;
  // Corner poles
  const corners = [
    [ hw,  0, -hw], [-hw,  0, -hw],
    [ hw,  0,  hw], [-hw,  0,  hw],
  ];
  // Horizontal cross-beams at two heights
  const beams = [
    // front / back
    [0, hh * 0.5, -hw], [0, hh * 0.5,  hw],
    [0, hh,       -hw], [0, hh,         hw],
    // left / right
    [-hw, hh * 0.5, 0], [ hw, hh * 0.5, 0],
    [-hw, hh,       0], [ hw, hh,        0],
  ];

  return (
    <group>
      {/* Soft wrapping canvas */}
      <mesh position={[0, hh * 0.5, -hw - 0.05]}>
        <planeGeometry args={[hw * 2, hh]} />
        <primitive object={WRAP_MAT} attach="material" />
      </mesh>
      <mesh position={[0, hh * 0.5,  hw + 0.05]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[hw * 2, hh]} />
        <primitive object={WRAP_MAT} attach="material" />
      </mesh>
      <mesh position={[-hw - 0.05, hh * 0.5, 0]} rotation={[0,  Math.PI / 2, 0]}>
        <planeGeometry args={[hw * 2, hh]} />
        <primitive object={WRAP_MAT} attach="material" />
      </mesh>
      <mesh position={[ hw + 0.05, hh * 0.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[hw * 2, hh]} />
        <primitive object={WRAP_MAT} attach="material" />
      </mesh>

      {/* Vertical poles */}
      {corners.map(([cx, , cz], i) => (
        <mesh key={`p${i}`} castShadow position={[cx, hh * 0.5, cz]}>
          <cylinderGeometry args={[0.12, 0.12, hh, 6]} />
          <primitive object={POLE_MAT} attach="material" />
        </mesh>
      ))}

      {/* Horizontal beams — front/back (along X) */}
      {[hh * 0.5, hh].map((y, ri) => (
        [-hw - 0.1, hw + 0.1].map((bz, ci) => (
          <mesh key={`bfb${ri}${ci}`} castShadow position={[0, y, bz]}>
            <cylinderGeometry args={[0.07, 0.07, hw * 2, 5]} />
            <primitive object={BOARD_MAT} attach="material" />
          </mesh>
        ))
      ))}

      {/* Horizontal beams — left/right (along Z via rotation) */}
      {[hh * 0.5, hh].map((y, ri) => (
        [-hw - 0.1, hw + 0.1].map((bx, ci) => (
          <mesh key={`blr${ri}${ci}`} castShadow position={[bx, y, 0]}
            rotation={[0, Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.07, 0.07, hw * 2, 5]} />
            <primitive object={BOARD_MAT} attach="material" />
          </mesh>
        ))
      ))}

      {/* Top frame */}
      <mesh castShadow position={[0, hh + 0.1, 0]}>
        <boxGeometry args={[hw * 2 + 0.2, 0.18, hw * 2 + 0.2]} />
        <primitive object={BOARD_MAT} attach="material" />
      </mesh>
    </group>
  );
}

// ── Progress badge ────────────────────────────────────────────────────────────

function ConstructionBadge({ constructInfo, badgeHeight }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  const now      = Date.now();
  const elapsed  = now - constructInfo.startReal;
  const progress = Math.min(1, elapsed / constructInfo.durationMs);
  const pct      = Math.round(progress * 100);
  const secLeft  = Math.max(0, Math.ceil((constructInfo.startReal + constructInfo.durationMs - now) / 1000));
  const minLeft  = Math.floor(secLeft / 60);
  const sLeft    = secLeft % 60;
  const timeStr  = minLeft > 0 ? `${minLeft}м ${sLeft}с` : `${secLeft}с`;

  return (
    <Html
      position={[0, badgeHeight, 0]}
      center
      distanceFactor={40}
      zIndexRange={[14, 15]}
      style={{ pointerEvents: 'none' }}
    >
      <div style={{
        background:   'rgba(0,0,0,0.92)',
        border:       '1px solid rgba(251,191,36,0.6)',
        borderTop:    '3px solid #fbbf24',
        borderRadius: 10,
        padding:      '6px 14px',
        fontSize:     12,
        fontFamily:   'monospace',
        fontWeight:   700,
        color:        '#fde68a',
        whiteSpace:   'nowrap',
        minWidth:     140,
        userSelect:   'none',
        boxShadow:    '0 2px 12px rgba(0,0,0,0.7)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <span style={{ fontSize: 16 }}>🔨</span>
          <span>Строительство {pct}%</span>
        </div>
        <div style={{
          height: 6, background: '#374151', borderRadius: 4, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width:  `${pct}%`,
            background: 'linear-gradient(90deg, #f59e0b, #fde68a)',
            borderRadius: 4,
            transition: 'width 0.5s linear',
          }} />
        </div>
        <div style={{ marginTop: 4, fontSize: 10, color: '#94a3b8', textAlign: 'right' }}>
          ⏱ осталось {timeStr}
        </div>
      </div>
    </Html>
  );
}

// ── Waving flag on scaffolding ────────────────────────────────────────────────
function ConstructionFlag({ height }) {
  const meshRef = useRef();
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 2.5) * 0.3;
    }
  });
  return (
    <group position={[0, height + 0.3, 0]}>
      {/* pole */}
      <mesh>
        <cylinderGeometry args={[0.05, 0.05, 0.8, 5]} />
        <primitive object={POLE_MAT} attach="material" />
      </mesh>
      {/* flag */}
      <mesh ref={meshRef} position={[0.35, 0.25, 0]}>
        <planeGeometry args={[0.7, 0.4]} />
        <meshStandardMaterial color="#f59e0b" side={THREE.DoubleSide} roughness={0.8} />
      </mesh>
    </group>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Renders scaffolding + progress badge + flag at a building's position.
 * @param {{ position: [x,y,z], constructInfo: {startReal,durationMs}, halfW?: number, halfH?: number }} props
 */
export function ConstructionSite({ position, constructInfo, halfW = 3.5, halfH = 3.5 }) {
  return (
    <group position={[position[0], 0, position[2]]}>
      <Scaffolding halfW={halfW} halfH={halfH} />
      <ConstructionFlag height={halfH * 2 + 0.5} />
      <ConstructionBadge constructInfo={constructInfo} badgeHeight={halfH * 2 + 2.5} />
    </group>
  );
}
