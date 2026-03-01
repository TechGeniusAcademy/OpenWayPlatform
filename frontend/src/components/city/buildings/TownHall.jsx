import { useRef, useContext } from 'react';
import { FaTrophy } from 'react-icons/fa';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CityContext } from '../CityContext.js';
import { usePlacementTracker, StorageBadge, WorkAreaOverlay, NoPowerBadge, LevelBadge, LevelRing, LevelPlinth, memo, buildingPropsEqual } from '../SharedUI.jsx';
import { ConveyorSourceRing } from '../ConveyorBelt.jsx';
import { TOWN_HALL_CONFIG } from '../../items/townHall.js';
import { getLevelConfig } from '../../systems/upgrades.js';

// ─── Procedural mesh (grand civic building) ───────────────────────────────────

export function TownHallBody({ emissiveColor, emissiveIntensity, opacity = 1, transparent = false, accentOverride }) {
  const matProps = { transparent, opacity, roughness: 0.4, metalness: 0.3 };
  const col   = '#d97706';   // amber-700
  const light = '#fbbf24';   // amber-400
  const stone = '#e5c99a';   // warm stone
  const dark  = '#92400e';   // amber-800
  const accentLight = accentOverride ?? light;

  return (
    <group>
      {/* ─ Wide base / steps ─ */}
      <mesh castShadow receiveShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[7.5, 0.4, 7.5]} />
        <meshStandardMaterial color={stone} emissive={new THREE.Color(emissiveColor ?? 0x000000)} emissiveIntensity={emissiveIntensity ?? 0} {...matProps} />
      </mesh>

      {/* ─ Main hall body ─ */}
      <mesh castShadow receiveShadow position={[0, 2, 0]}>
        <boxGeometry args={[6, 3.6, 6]} />
        <meshStandardMaterial color={col} emissive={new THREE.Color(emissiveColor ?? 0x000000)} emissiveIntensity={emissiveIntensity ?? 0} {...matProps} />
      </mesh>

      {/* ─ Roof/pediment ─ */}
      <mesh castShadow position={[0, 4.2, 0]}>
        <boxGeometry args={[6.3, 0.5, 6.3]} />
        <meshStandardMaterial color={dark} emissive={new THREE.Color(emissiveColor ?? 0x000000)} emissiveIntensity={emissiveIntensity ?? 0} {...matProps} />
      </mesh>

      {/* ─ Central tower base ─ */}
      <mesh castShadow receiveShadow position={[0, 5.5, 0]}>
        <boxGeometry args={[2.4, 2.2, 2.4]} />
        <meshStandardMaterial color={col} emissive={new THREE.Color(emissiveColor ?? 0x000000)} emissiveIntensity={emissiveIntensity ?? 0} {...matProps} />
      </mesh>

      {/* ─ Tower mid band ─ */}
      <mesh position={[0, 6.7, 0]}>
        <boxGeometry args={[2.6, 0.25, 2.6]} />
        <meshStandardMaterial color={accentLight} emissive={new THREE.Color(accentLight)} emissiveIntensity={(emissiveIntensity ?? 0) + 0.5} {...matProps} />
      </mesh>

      {/* ─ Tower upper ─ */}
      <mesh castShadow position={[0, 7.9, 0]}>
        <boxGeometry args={[2, 1.6, 2]} />
        <meshStandardMaterial color={col} emissive={new THREE.Color(emissiveColor ?? 0x000000)} emissiveIntensity={emissiveIntensity ?? 0} {...matProps} />
      </mesh>

      {/* ─ Dome / roof cone ─ */}
      <mesh castShadow position={[0, 9.3, 0]}>
        <coneGeometry args={[1.4, 2.4, 8]} />
        <meshStandardMaterial color={accentLight} emissive={new THREE.Color(accentLight)} emissiveIntensity={(emissiveIntensity ?? 0) + 0.4} {...matProps} />
      </mesh>

      {/* ─ Spire tip ─ */}
      <mesh castShadow position={[0, 10.8, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 1.2, 8]} />
        <meshStandardMaterial color={accentLight} emissive={new THREE.Color(accentLight)} emissiveIntensity={(emissiveIntensity ?? 0) + 1} {...matProps} />
      </mesh>

      {/* ─ Front columns (4) ─ */}
      {[-1.8, -0.6, 0.6, 1.8].map((x) => (
        <mesh key={x} castShadow position={[x, 2.2, 3.1]}>
          <cylinderGeometry args={[0.22, 0.26, 4, 8]} />
          <meshStandardMaterial color={stone} emissive={new THREE.Color(emissiveColor ?? 0x000000)} emissiveIntensity={(emissiveIntensity ?? 0) * 0.5} {...matProps} />
        </mesh>
      ))}

      {/* ─ Back columns (4) ─ */}
      {[-1.8, -0.6, 0.6, 1.8].map((x) => (
        <mesh key={x} castShadow position={[x, 2.2, -3.1]}>
          <cylinderGeometry args={[0.22, 0.26, 4, 8]} />
          <meshStandardMaterial color={stone} emissive={new THREE.Color(emissiveColor ?? 0x000000)} emissiveIntensity={(emissiveIntensity ?? 0) * 0.5} {...matProps} />
        </mesh>
      ))}

      {/* ─ Entrance arch frame ─ */}
      <mesh castShadow position={[0, 1.8, 3.12]}>
        <boxGeometry args={[1.5, 2.8, 0.15]} />
        <meshStandardMaterial color={dark} emissive={new THREE.Color(emissiveColor ?? 0x000000)} emissiveIntensity={emissiveIntensity ?? 0} {...matProps} />
      </mesh>
      {/* Entrance door (dark opening) */}
      <mesh position={[0, 1.6, 3.13]}>
        <boxGeometry args={[0.9, 2.0, 0.05]} />
        <meshStandardMaterial color="#1c1408" emissive={new THREE.Color(0x1c1408)} emissiveIntensity={0} {...matProps} />
      </mesh>

      {/* ─ Accent banner stripe ─ */}
      <mesh position={[0, 3.8, 3.01]}>
        <boxGeometry args={[6.05, 0.2, 0.05]} />
        <meshStandardMaterial color={accentLight} emissive={new THREE.Color(accentLight)} emissiveIntensity={(emissiveIntensity ?? 0) + 0.6} />
      </mesh>
    </group>
  );
}

// ─── Points badge (floating above town hall) ──────────────────────────────────

export function PointsBadge({ points = 0, badgeHeight = 13 }) {
  return (
    <Html
      position={[0, badgeHeight + 2.2, 0]}
      center
      distanceFactor={35}
      zIndexRange={[12, 13]}
      style={{ pointerEvents: 'none' }}
    >
      <div style={{
        background: 'rgba(217,119,6,0.92)',
        border: '1px solid rgba(251,191,36,0.8)',
        borderRadius: 10,
        padding: '3px 12px',
        fontSize: 13,
        fontFamily: 'monospace',
        fontWeight: 800,
        color: '#fff',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        letterSpacing: 1,
      }}>
        <FaTrophy style={{ marginRight: 4, verticalAlign: 'middle' }} /> {points} баллов
      </div>
    </Html>
  );
}

// ─── Preview (placement ghost) ────────────────────────────────────────────────

function TownHallGLTFPreview({ placementPosRef, inputRef, placementRotYRef }) {
  const { groupRef, blockedRef } = usePlacementTracker(placementPosRef, inputRef, placementRotYRef);
  const matRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  useFrame(({ clock }) => {
    const pulse   = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    const blocked = blockedRef.current;
    const col     = blocked ? 0xff2200 : 0xf59e0b;
    for (const r of matRefs) {
      if (r.current) {
        r.current.emissive.setHex(col);
        r.current.emissiveIntensity = pulse;
        r.current.opacity = 0.82;
      }
    }
  });

  return (
    <group ref={groupRef}>
      <TownHallBody emissiveColor={0xf59e0b} emissiveIntensity={0.6} opacity={0.82} transparent />
    </group>
  );
}

// ─── Placed building ──────────────────────────────────────────────────────────

function TownHallGLTFPlaced({
  position, rotation,
  isSelected, onSelect,
  isConveyorSource, onConveyorClick,
  isCableSource, onCableClick,
  onRightClick,
  currentAmounts,
  points,
  level = 1,
}) {
  const { workArea, badgeHeight } = TOWN_HALL_CONFIG;
  const { placedHitRef, conveyorModeRef, rightClickHitRef, cableModeRef } = useContext(CityContext);
  const lvlConf = getLevelConfig('town-hall', level);
  const scale   = 1 + (lvlConf.scaleBonus ?? 0);
  const accent  = lvlConf.accentColor;
  const glow    = lvlConf.glowIntensity ?? 0;

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
        if (cableModeRef.current)         { onCableClick?.(); }
        else if (conveyorModeRef.current) { onConveyorClick?.(); }
        else                              { onSelect?.(); }
      }}
    >
      <group rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]}>
        <TownHallBody accentOverride={accent} emissiveColor={accent} emissiveIntensity={glow} />
      </group>
      {isSelected && (
        <WorkAreaOverlay
          width={workArea.width}
          depth={workArea.depth}
          color={workArea.color}
          opacity={workArea.opacity}
        />
      )}
      <StorageBadge itemType="town-hall" badgeHeight={badgeHeight} currentAmounts={currentAmounts} level={level} />
      <PointsBadge points={points ?? 0} badgeHeight={badgeHeight} />
      <LevelPlinth level={level} size={6} />
      {isConveyorSource && <ConveyorSourceRing />}
    </group>
  );
}

export const TownHallPreview = TownHallGLTFPreview;
export const TownHallPlaced  = memo(TownHallGLTFPlaced, buildingPropsEqual);
