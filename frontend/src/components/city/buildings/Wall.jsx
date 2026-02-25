// ─── Wall Segment ─────────────────────────────────────────────────────────────
// A wall segment stretches between two world-space XZ endpoints.
// Levels 1-7 change height, thickness, material color and HP.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { FaHeart } from 'react-icons/fa';
import { getWallLevelConfig } from '../../items/wallSystem.js';

// ── Shared materials cache ────────────────────────────────────────────────────
const matCache = {};
function getWallMat(color) {
  if (!matCache[color]) {
    matCache[color] = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      metalness: 0.1,
    });
  }
  return matCache[color];
}

// ── Merlons (battlements on top) ──────────────────────────────────────────────
function Merlons({ length, thickness, height, color, level }) {
  if (level < 2) return null; // level 1 = plain wall, no battlements
  const mw    = 0.55;
  const gap   = 0.65;
  const step  = mw + gap;
  const count = Math.max(1, Math.floor(length / step));
  const startX = -(count * step - gap) / 2 + mw / 2;
  const mat   = getWallMat(color);
  return (
    <group position={[0, height + 0.22, 0]}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} castShadow position={[startX + i * step, 0, 0]}>
          <boxGeometry args={[mw, 0.44, thickness * 0.95]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

// ── HP Bar ────────────────────────────────────────────────────────────────────
function WallHpBar({ currentHp, maxHp, height, isSelected }) {
  if (!isSelected) return null;
  const pct = Math.max(0, Math.min(1, currentHp / maxHp));
  const barColor = pct > 0.6 ? '#4ade80' : pct > 0.3 ? '#fbbf24' : '#f87171';
  return (
    <Html position={[0, height + 1.4, 0]} center distanceFactor={35} zIndexRange={[10, 11]} style={{ pointerEvents: 'none' }}>
      <div style={{
        background: 'rgba(0,0,0,0.88)',
        border: `1px solid ${barColor}55`,
        borderRadius: 6,
        padding: '3px 10px',
        fontSize: 10,
        fontFamily: 'monospace',
        fontWeight: 700,
        color: barColor,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}>
        <FaHeart style={{ marginRight: 4, verticalAlign: 'middle', fontSize: 9 }} />{currentHp}/{maxHp}
        <div style={{ height: 3, background: '#374151', borderRadius: 2, marginTop: 2, width: 80 }}>
          <div style={{ height: '100%', width: `${Math.round(pct * 100)}%`, background: barColor, borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
      </div>
    </Html>
  );
}

// ── Wall Segment (placed) ─────────────────────────────────────────────────────
export function WallSegment({ wallData, level = 1, currentHp, maxHp, isSelected, onSelect, onRightClick }) {
  const cfg    = getWallLevelConfig(level);
  const { from, to } = wallData;

  const dx     = to.x - from.x;
  const dz     = to.z - from.z;
  const length = Math.hypot(dx, dz);
  const cx     = (from.x + to.x) / 2;
  const cz     = (from.z + to.z) / 2;
  const angle  = Math.atan2(-dz, dx);

  const color  = cfg.color;
  const mat    = getWallMat(color);
  const h      = cfg.height;
  const thick  = cfg.thickness;

  // Accent emissive for higher levels
  const emit   = level >= 3 ? new THREE.Color(cfg.accentColor) : new THREE.Color(0x000000);
  const ei     = level >= 3 ? 0.12 + (level - 3) * 0.06 : 0;

  const meshRef = useRef();
  const hovRef  = useRef(false);
  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.material.emissiveIntensity = hovRef.current ? (ei + 0.12) : ei;
  });

  const handlePointerOver = () => { hovRef.current = true; };
  const handlePointerOut  = () => { hovRef.current = false; };

  return (
    <group position={[cx, 0, cz]} rotation={[0, angle, 0]}>
      {/* Main wall body */}
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        position={[0, h / 2, 0]}
        onPointerDown={(e) => { e.stopPropagation(); onSelect?.(); }}
        onContextMenu={(e) => { e.nativeEvent?.preventDefault?.(); onRightClick?.(e.nativeEvent?.clientX, e.nativeEvent?.clientY); }}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry args={[length, h, thick]} />
        <meshStandardMaterial
          color={color}
          roughness={0.85}
          metalness={level >= 4 ? 0.4 : 0.1}
          emissive={emit}
          emissiveIntensity={ei}
        />
      </mesh>

      {/* Stone block lines (grooves) for levels 2+ */}
      {level >= 2 && (
        <>
          {[h * 0.33, h * 0.66].map((y, i) => (
            <mesh key={i} position={[0, y, thick / 2 + 0.01]}>
              <boxGeometry args={[length, 0.04, 0.02]} />
              <meshBasicMaterial color="#1e293b" />
            </mesh>
          ))}
        </>
      )}

      {/* Metallic accent strip for levels 4+ */}
      {level >= 4 && (
        <mesh position={[0, h * 0.5, thick / 2 + 0.02]}>
          <boxGeometry args={[length, 0.1, 0.04]} />
          <meshStandardMaterial color={cfg.accentColor} emissive={new THREE.Color(cfg.accentColor)} emissiveIntensity={0.35} metalness={0.9} roughness={0.1} />
        </mesh>
      )}

      {/* Magical glow for levels 6-7 */}
      {level >= 6 && (
        <pointLight position={[0, h / 2, 0]} color={cfg.accentColor} intensity={0.8} distance={4} />
      )}

      {/* Battlements */}
      <Merlons length={length} thickness={thick} height={h} color={color} level={level} />

      {/* Selected highlight ring */}
      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[length + 0.4, thick + 0.4]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.22} />
        </mesh>
      )}

      {/* HP badge */}
      <WallHpBar currentHp={currentHp ?? maxHp ?? 100} maxHp={maxHp ?? 100} height={h} isSelected={isSelected} />
    </group>
  );
}

// ── Wall Endpoint Dot ─────────────────────────────────────────────────────────
export function WallEndpoint({ position, color = '#fbbf24' }) {
  return (
    <mesh position={[position.x, 0.15, position.z]}>
      <cylinderGeometry args={[0.35, 0.35, 0.3, 8]} />
      <meshStandardMaterial color={color} emissive={new THREE.Color(color)} emissiveIntensity={0.5} />
    </mesh>
  );
}

// ── Wall Placement Preview ────────────────────────────────────────────────────
// cursorRef: { current: {x, z} | null } — updated every frame by a ground-plane onPointerMove.
// fromPoint: { x, z } — fixed start point (state from OpenCity).
// Entirely ref-driven: no React state is mutated per-frame.
export function WallPlacementPreview({ fromPoint, cursorRef }) {
  const rootRef     = useRef();
  const boxRef      = useRef();
  const startDotRef = useRef();
  const endDotRef   = useRef();
  const matRef      = useRef();

  useFrame(({ clock }) => {
    const root = rootRef.current;
    if (!root || !fromPoint || !cursorRef?.current) {
      if (root) root.visible = false;
      return;
    }
    const to = cursorRef.current;
    const dx = to.x - fromPoint.x;
    const dz = to.z - fromPoint.z;
    const length = Math.hypot(dx, dz);

    if (length < 0.15) { root.visible = false; return; }
    root.visible = true;

    const cx = (fromPoint.x + to.x) / 2;
    const cz = (fromPoint.z + to.z) / 2;
    root.position.set(cx, 0, cz);
    root.rotation.y = Math.atan2(-dz, dx);

    // Scale the unit-length box to match actual length
    if (boxRef.current)      boxRef.current.scale.x      = length;
    if (startDotRef.current) startDotRef.current.position.x = -length / 2;
    if (endDotRef.current)   endDotRef.current.position.x   =  length / 2;

    if (matRef.current) {
      matRef.current.opacity = 0.35 + Math.sin(clock.getElapsedTime() * 4) * 0.25;
    }
  });

  return (
    <group ref={rootRef} visible={false}>
      {/* Wall ghost body — length=1 unit, scaled in useFrame */}
      <mesh ref={boxRef} position={[0, 1.25, 0]}>
        <boxGeometry args={[1, 2.5, 0.7]} />
        <meshStandardMaterial ref={matRef} color="#60a5fa" emissive={new THREE.Color('#60a5fa')}
          emissiveIntensity={0.6} transparent opacity={0.45} depthWrite={false} />
      </mesh>
      {/* Start dot (green) */}
      <mesh ref={startDotRef} position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color="#4ade80" emissive={new THREE.Color('#4ade80')} emissiveIntensity={0.8} />
      </mesh>
      {/* End dot (amber) */}
      <mesh ref={endDotRef} position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color="#fbbf24" emissive={new THREE.Color('#fbbf24')} emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

// ── Snap indicator ────────────────────────────────────────────────────────────
export function SnapIndicator({ position }) {
  if (!position) return null;
  const matRef = useRef();
  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.opacity = 0.4 + Math.sin(clock.getElapsedTime() * 6) * 0.3;
  });
  return (
    <mesh position={[position.x, 0.12, position.z]}>
      <ringGeometry args={[0.5, 0.7, 16]} />
      <meshBasicMaterial ref={matRef} color="#4ade80" transparent opacity={0.7} side={THREE.DoubleSide} />
    </mesh>
  );
}
