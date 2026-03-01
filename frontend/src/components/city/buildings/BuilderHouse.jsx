// ─── Builder's House — 3D building component ──────────────────────────────────
//
// A cosy builder's cottage that provides construction workers.
// Levels: 1 builder → 2 builders → 3 builders.
//
// Also exports:  BuilderAtWork  – animated worker figure at a construction/upgrade site
//                BuilderRunner  – worker running from house to build site
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useContext, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html, useGLTF } from '@react-three/drei';
import { FaHardHat, FaCog } from 'react-icons/fa';
import { CityContext } from '../CityContext.js';
import {
  usePlacementTracker,
  WorkAreaOverlay,
  LevelBadge,
  LevelRing,
  LevelPlinth,
  memo,
  buildingPropsEqual,
} from '../SharedUI.jsx';
import { BUILDER_HOUSE_CONFIG } from '../../items/builderHouse.js';
import { getLevelConfig } from '../../systems/upgrades.js';

// ─── Shared materials ─────────────────────────────────────────────────────────

const MAT = {
  stone:     new THREE.MeshStandardMaterial({ color: '#9ca3af', roughness: 0.9, metalness: 0.05 }),
  wall:      new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.8, metalness: 0.05 }),
  wallLight: new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.75, metalness: 0.05 }),
  roof:      new THREE.MeshStandardMaterial({ color: '#7f1d1d', roughness: 0.85, metalness: 0.05 }),
  roofDark:  new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.8,  metalness: 0.05 }),
  door:      new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9, metalness: 0.1  }),
  window:    new THREE.MeshStandardMaterial({ color: '#bae6fd', roughness: 0.1, metalness: 0.3, emissive: new THREE.Color('#60a5fa'), emissiveIntensity: 0.3 }),
  chimney:   new THREE.MeshStandardMaterial({ color: '#6b7280', roughness: 0.9, metalness: 0.05 }),
  // Builder figure
  skin:      new THREE.MeshStandardMaterial({ color: '#fcd34d', roughness: 0.8, metalness: 0 }),
  vest:      new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.7, metalness: 0 }),
  pants:     new THREE.MeshStandardMaterial({ color: '#1e3a5f', roughness: 0.85, metalness: 0 }),
  helmet:    new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.4, metalness: 0.3 }),
  tool:      new THREE.MeshStandardMaterial({ color: '#6b7280', roughness: 0.4, metalness: 0.7 }),
};

// ─── Builder figure ───────────────────────────────────────────────────────────
// animation: 'idle' | 'working' | 'running'

function BuilderFigure({ animation = 'idle', scale = 1 }) {
  const bodyRef    = useRef();
  const rArmRef    = useRef();
  const lArmRef    = useRef();
  const rLegRef    = useRef();
  const lLegRef    = useRef();
  const headRef    = useRef();
  const toolRef    = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (animation === 'idle') {
      if (headRef.current) headRef.current.position.y = 1.55 + Math.sin(t * 1.2) * 0.03;
    } else if (animation === 'working') {
      // Bob whole body
      if (bodyRef.current) bodyRef.current.position.y = 0.55 + Math.sin(t * 3) * 0.04;
      // Swing right arm down like hammering
      if (rArmRef.current) rArmRef.current.rotation.x = Math.sin(t * 4) * 1.0 - 0.4;
      // Tool follows right arm
      if (toolRef.current) toolRef.current.rotation.x = Math.sin(t * 4) * 1.0 - 0.4;
    } else if (animation === 'running') {
      // Tilt body forward, pump legs
      if (bodyRef.current) bodyRef.current.rotation.x = 0.3;
      if (rLegRef.current) rLegRef.current.rotation.x = Math.sin(t * 8) *  0.7;
      if (lLegRef.current) lLegRef.current.rotation.x = Math.sin(t * 8) * -0.7;
      if (rArmRef.current) rArmRef.current.rotation.x = Math.sin(t * 8) * -0.5;
      if (lArmRef.current) lArmRef.current.rotation.x = Math.sin(t * 8) *  0.5;
    }
  });

  const s = scale;
  return (
    <group scale={[s, s, s]}>
      {/* Legs */}
      <group ref={lLegRef} position={[-0.1, 0.24, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.16, 0.48, 0.16]} />
          <primitive object={MAT.pants} attach="material" />
        </mesh>
      </group>
      <group ref={rLegRef} position={[0.1, 0.24, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.16, 0.48, 0.16]} />
          <primitive object={MAT.pants} attach="material" />
        </mesh>
      </group>
      {/* Body */}
      <group ref={bodyRef} position={[0, 0.55, 0]}>
        <mesh>
          <boxGeometry args={[0.38, 0.55, 0.28]} />
          <primitive object={MAT.vest} attach="material" />
        </mesh>
        {/* Left arm */}
        <group ref={lArmRef} position={[-0.26, 0.05, 0]}>
          <mesh position={[0, -0.2, 0]}>
            <boxGeometry args={[0.14, 0.44, 0.14]} />
            <primitive object={MAT.skin} attach="material" />
          </mesh>
        </group>
        {/* Right arm */}
        <group ref={rArmRef} position={[0.26, 0.05, 0]}>
          <mesh position={[0, -0.2, 0]}>
            <boxGeometry args={[0.14, 0.44, 0.14]} />
            <primitive object={MAT.skin} attach="material" />
          </mesh>
        </group>
      </group>
      {/* Head */}
      <mesh ref={headRef} position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.18, 8, 7]} />
        <primitive object={MAT.skin} attach="material" />
      </mesh>
      {/* Hard hat */}
      <mesh position={[0, 1.7, 0]}>
        <cylinderGeometry args={[0.22, 0.25, 0.1, 8]} />
        <primitive object={MAT.helmet} attach="material" />
      </mesh>
      {/* Shovel/hammer tool (follows right arm) */}
      <group ref={toolRef} position={[0.4, 0.4, 0.1]}>
        <mesh>
          <cylinderGeometry args={[0.03, 0.03, 0.9, 6]} />
          <primitive object={MAT.tool} attach="material" />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.25, 0.18, 0.07]} />
          <primitive object={MAT.tool} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

// ─── Builder at work — drone orbits the active build/upgrade site ───────────

export function BuilderAtWork({ position }) {
  const { scene } = useGLTF('/models/worker drone.glb');
  const cloneRef = useRef(null);
  if (!cloneRef.current) cloneRef.current = scene.clone(true);
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const orbitR = 1.4;
    const angle  = t * 0.9;
    groupRef.current.position.set(
      position[0] + Math.cos(angle) * orbitR,
      2.5 + Math.sin(t * 2.2) * 0.18,
      position[2] + Math.sin(angle) * orbitR,
    );
    groupRef.current.rotation.y = angle + Math.PI;
  });

  return (
    <group ref={groupRef} position={[position[0] + 1.4, 2.5, position[2]]}>
      <primitive object={cloneRef.current} scale={0.6} />
    </group>
  );
}

// ─── Builder runner — flies to target and returns to platform ──────────────

export function BuilderRunner({ fromPos, toPos, startReal, durationMs = 3000 }) {
  const groupRef = useRef();
  const [done, setDone] = useState(false);
  const phaseRef       = useRef('going');  // 'going' | 'returning'
  const returnStartRef = useRef(null);
  const { scene } = useGLTF('/models/worker drone.glb');
  const cloneRef = useRef(null);
  if (!cloneRef.current) cloneRef.current = scene.clone(true);

  useFrame(() => {
    if (done || !groupRef.current) return;
    if (phaseRef.current === 'going') {
      const progress = Math.min(1, (Date.now() - startReal) / durationMs);
      const x = fromPos[0] + (toPos[0] - fromPos[0]) * progress;
      const z = fromPos[2] + (toPos[2] - fromPos[2]) * progress;
      groupRef.current.position.set(x, 3.5, z);
      groupRef.current.rotation.y = Math.atan2(toPos[0] - fromPos[0], toPos[2] - fromPos[2]);
      if (progress >= 1) {
        phaseRef.current = 'returning';
        returnStartRef.current = Date.now();
      }
    } else {
      const progress = Math.min(1, (Date.now() - returnStartRef.current) / durationMs);
      const x = toPos[0] + (fromPos[0] - toPos[0]) * progress;
      const z = toPos[2] + (fromPos[2] - toPos[2]) * progress;
      groupRef.current.position.set(x, 3.5, z);
      groupRef.current.rotation.y = Math.atan2(fromPos[0] - toPos[0], fromPos[2] - toPos[2]);
      if (progress >= 1) setDone(true);
    }
  });

  if (done) return null;
  return (
    <group ref={groupRef} position={[fromPos[0], 3.5, fromPos[2]]}>
      <primitive object={cloneRef.current} scale={0.6} />
    </group>
  );
}

// ─── Dock positions on the platform (up to 6 drones) ───────────────────────

const DOCK_POSITIONS = [
  [-1.4,  1.3, -1.4],
  [ 1.4,  1.3, -1.4],
  [-1.4,  1.3,  1.4],
  [ 1.4,  1.3,  1.4],
  [ 0,    1.3,  0  ],
  [ 0,    1.3, -2.2],
];

function PlatformDrone({ dockPos, index }) {
  const { scene } = useGLTF('/models/worker drone.glb');
  const cloneRef = useRef(null);
  if (!cloneRef.current) cloneRef.current = scene.clone(true);
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() + index * 1.57;
    groupRef.current.position.y = dockPos[1] + Math.sin(t * 1.3) * 0.12;
  });

  return (
    <group ref={groupRef} position={dockPos}>
      <primitive object={cloneRef.current} scale={0.5} />
    </group>
  );
}

// ─── Builder's house body ──────────────────────────────────────────────────────

function BuilderHouseBody({ accentColor = '#f59e0b', emissiveColor = '#000', emissiveIntensity = 0, transparent = false, opacity = 1 }) {
  const m  = { transparent, opacity };
  const ec = emissiveColor;
  const ei = emissiveIntensity;

  return (
    <group>
      {/* Ground slab */}
      <mesh receiveShadow position={[0, 0.15, 0]}>
        <boxGeometry args={[7.0, 0.3, 7.0]} />
        <meshStandardMaterial color="#78716c" roughness={0.9} metalness={0.1} {...m} />
      </mesh>

      {/* Main walls */}
      <mesh castShadow position={[0, 2.0, 0]}>
        <boxGeometry args={[5.6, 3.7, 5.6]} />
        <meshStandardMaterial color="#d97706" roughness={0.8} metalness={0.05}
          emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.2} {...m} />
      </mesh>

      {/* Front wall accent strip */}
      <mesh position={[0, 2.0, 2.82]}>
        <boxGeometry args={[5.4, 3.5, 0.08]} />
        <meshStandardMaterial color={accentColor} roughness={0.7} metalness={0.05}
          emissive={new THREE.Color(accentColor)} emissiveIntensity={ei * 0.4 + 0.02} {...m} />
      </mesh>

      {/* Roof — two sloping sides (simulated with rotated boxes) */}
      <mesh castShadow position={[0, 4.4, 1.0]} rotation={[0.55, 0, 0]}>
        <boxGeometry args={[5.8, 0.22, 3.8]} />
        <meshStandardMaterial color="#7f1d1d" roughness={0.85} metalness={0.05} {...m} />
      </mesh>
      <mesh castShadow position={[0, 4.4, -1.0]} rotation={[-0.55, 0, 0]}>
        <boxGeometry args={[5.8, 0.22, 3.8]} />
        <meshStandardMaterial color="#991b1b" roughness={0.85} metalness={0.05} {...m} />
      </mesh>
      {/* Roof ridge cap */}
      <mesh castShadow position={[0, 5.55, 0]}>
        <boxGeometry args={[5.6, 0.28, 0.35]} />
        <meshStandardMaterial color="#6b0f0f" roughness={0.7} metalness={0.1} {...m} />
      </mesh>

      {/* Chimney */}
      <mesh castShadow position={[-1.4, 5.0, -1.2]}>
        <boxGeometry args={[0.7, 2.2, 0.7]} />
        <meshStandardMaterial color="#6b7280" roughness={0.9} metalness={0.05} {...m} />
      </mesh>
      {/* Chimney top */}
      <mesh position={[-1.4, 6.2, -1.2]}>
        <boxGeometry args={[0.9, 0.18, 0.9]} />
        <meshStandardMaterial color="#4b5563" roughness={0.85} metalness={0.1} {...m} />
      </mesh>

      {/* Door */}
      <mesh position={[0, 1.2, 2.85]}>
        <boxGeometry args={[0.95, 2.0, 0.18]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} metalness={0.1} {...m} />
      </mesh>
      {/* Door knob */}
      <mesh position={[0.35, 1.2, 2.96]}>
        <sphereGeometry args={[0.08, 6, 5]} />
        <meshStandardMaterial color="#d97706" roughness={0.3} metalness={0.7} {...m} />
      </mesh>

      {/* Windows — front */}
      <mesh position={[-1.5, 2.2, 2.85]}>
        <boxGeometry args={[1.0, 1.0, 0.14]} />
        <meshStandardMaterial color="#bae6fd" roughness={0.1} metalness={0.3}
          emissive={new THREE.Color('#60a5fa')} emissiveIntensity={0.25 + ei * 0.3} {...m} />
      </mesh>
      <mesh position={[1.5, 2.2, 2.85]}>
        <boxGeometry args={[1.0, 1.0, 0.14]} />
        <meshStandardMaterial color="#bae6fd" roughness={0.1} metalness={0.3}
          emissive={new THREE.Color('#60a5fa')} emissiveIntensity={0.25 + ei * 0.3} {...m} />
      </mesh>

      {/* Window — side */}
      <mesh position={[2.85, 2.2, 0]}>
        <boxGeometry args={[0.14, 1.0, 1.0]} />
        <meshStandardMaterial color="#bae6fd" roughness={0.1} metalness={0.3}
          emissive={new THREE.Color('#60a5fa')} emissiveIntensity={0.25 + ei * 0.3} {...m} />
      </mesh>

      {/* Fence posts (decorative) */}
      {[-2.6, -1.6, 1.6, 2.6].map((xo, i) => (
        <mesh key={i} castShadow position={[xo, 0.6, 3.2]}>
          <boxGeometry args={[0.15, 1.2, 0.15]} />
          <meshStandardMaterial color="#d97706" roughness={0.9} metalness={0 } {...m} />
        </mesh>
      ))}
      {/* Fence rails */}
      <mesh position={[0, 0.7, 3.2]}>
        <boxGeometry args={[5.6, 0.1, 0.1]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.85} metalness={0} {...m} />
      </mesh>
      <mesh position={[0, 1.05, 3.2]}>
        <boxGeometry args={[5.6, 0.1, 0.1]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.85} metalness={0} {...m} />
      </mesh>
    </group>
  );
}

// ─── Floating builder count badge ────────────────────────────────────────────

function BuilderCountBadge({ totalBuilders, freeBuilders, badgeHeight }) {
  const accent = freeBuilders > 0 ? '#4ade80' : '#f87171';
  return (
    <Html
      position={[0, badgeHeight, 0]}
      center
      distanceFactor={35}
      zIndexRange={[10, 11]}
      style={{ pointerEvents: 'none' }}
    >
      <div style={{
        background:   'rgba(0,0,0,0.88)',
        border:       `1px solid ${accent}50`,
        borderTop:    `2px solid ${accent}`,
        borderRadius: 8,
        padding:      '3px 10px',
        fontSize:     12,
        fontFamily:   'monospace',
        fontWeight:   700,
        color:        accent,
        whiteSpace:   'nowrap',
        userSelect:   'none',
      }}>
        <FaHardHat style={{ marginRight: 4, verticalAlign: 'middle', fontSize: 11 }} /> {freeBuilders}/{totalBuilders} {freeBuilders > 0 ? 'свободен' : 'заняты'}
      </div>
    </Html>
  );
}

// ─── Preview ghost ────────────────────────────────────────────────────────────

function BuilderHousePreviewInner({ placementPosRef, inputRef, placementRotYRef }) {
  const { groupRef, blockedRef } = usePlacementTracker(placementPosRef, inputRef, placementRotYRef);
  const matRef = useRef();

  useFrame(({ clock }) => {
    const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    const col   = blockedRef.current ? 0xff2200 : 0x22cc55;
    if (matRef.current) {
      matRef.current.emissive.setHex(col);
      matRef.current.emissiveIntensity = pulse * 0.6;
      matRef.current.opacity = 0.72;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow position={[0, 2.0, 0]}>
        <boxGeometry args={[5.6, 3.7, 5.6]} />
        <meshStandardMaterial
          ref={matRef}
          color="#d97706"
          emissive={new THREE.Color(0x22cc55)}
          emissiveIntensity={0.5}
          transparent
          opacity={0.72}
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>
      <mesh castShadow position={[0, 4.8, 0]}>
        <coneGeometry args={[4.2, 2.2, 4]} />
        <meshStandardMaterial color="#7f1d1d" transparent opacity={0.72}
          emissive={new THREE.Color(0x22cc55)} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

export function BuilderHousePreview({ placementPosRef, inputRef, placementRotYRef }) {
  return <BuilderHousePreviewInner placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />;
}

// ─── Placed building ──────────────────────────────────────────────────────────

function BuilderHousePlacedBase({
  position,
  rotation,
  isSelected,
  onSelect,
  onRightClick,
  level = 1,
  totalBuilders,
  freeBuilders,
  upgradeInfo,
}) {
  const { placedHitRef, rightClickHitRef } = useContext(CityContext);
  const lvlConf = getLevelConfig('builder-house', level);
  const scale   = 1 + (lvlConf?.scaleBonus ?? 0);

  const { scene: platformScene } = useGLTF('/models/workers platform.glb');
  const platformCloneRef = useRef(null);
  if (!platformCloneRef.current) platformCloneRef.current = platformScene.clone(true);

  return (
    <group
      position={[position[0], 0, position[2]]}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (e.button === 2) {
          rightClickHitRef.current = true;
          onRightClick?.(e.nativeEvent.clientX, e.nativeEvent.clientY);
          return;
        }
        placedHitRef.current = true;
        onSelect?.();
      }}
    >
      <group rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]}>
        <primitive object={platformCloneRef.current} />
      </group>

      <BuilderCountBadge
        totalBuilders={totalBuilders ?? lvlConf?.buildersCount ?? level}
        freeBuilders={freeBuilders ?? lvlConf?.buildersCount ?? level}
        badgeHeight={BUILDER_HOUSE_CONFIG.badgeHeight}
      />

      <LevelPlinth level={level} size={4.5} />

      {/* Idle drones parked on platform */}
      {Array.from({ length: Math.max(0, freeBuilders ?? lvlConf?.buildersCount ?? level) }).map((_, i) => (
        <PlatformDrone key={i} dockPos={DOCK_POSITIONS[i % DOCK_POSITIONS.length]} index={i} />
      ))}

      {/* Upgrade progress badge */}
      {upgradeInfo && <UpgradeBadgeInline upgradeInfo={upgradeInfo} badgeHeight={BUILDER_HOUSE_CONFIG.badgeHeight + 6} />}

      {isSelected && (
        <WorkAreaOverlay
          width={BUILDER_HOUSE_CONFIG.workArea.width}
          depth={BUILDER_HOUSE_CONFIG.workArea.depth}
          color={BUILDER_HOUSE_CONFIG.workArea.color}
          opacity={BUILDER_HOUSE_CONFIG.workArea.opacity}
        />
      )}
    </group>
  );
}

// Small inline upgrade badge (reuse pattern from Extractor)
export function UpgradeBadgeInline({ upgradeInfo, badgeHeight, position }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const progress = Math.min(1, (Date.now() - upgradeInfo.startReal) / upgradeInfo.durationMs);
  const pct      = Math.round(progress * 100);
  const secLeft  = Math.max(0, Math.ceil((upgradeInfo.startReal + upgradeInfo.durationMs - Date.now()) / 1000));
  const htmlPos  = position ?? [0, badgeHeight ?? 6, 0];
  return (
    <Html position={htmlPos} center distanceFactor={35} zIndexRange={[12, 13]} style={{ pointerEvents: 'none' }}>
      <div style={{
        background: 'rgba(0,0,0,0.92)', border: '1px solid rgba(251,191,36,0.5)',
        borderTop: '2px solid #fbbf24', borderRadius: 8, padding: '4px 12px',
        fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#fbbf24',
        whiteSpace: 'nowrap', minWidth: 110, userSelect: 'none',
      }}>
        <FaCog style={{ marginRight: 4, verticalAlign: 'middle', fontSize: 11 }} /> Улучшение {pct}% ({secLeft}с)
        <div style={{ height: 4, background: '#374151', borderRadius: 3, marginTop: 3 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#fbbf24', borderRadius: 3, transition: 'width 0.9s' }} />
        </div>
      </div>
    </Html>
  );
}

export const BuilderHousePlaced = memo(BuilderHousePlacedBase, buildingPropsEqual);

useGLTF.preload('/models/workers platform.glb');
useGLTF.preload('/models/worker drone.glb');
