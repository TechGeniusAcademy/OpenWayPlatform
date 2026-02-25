// ─── Street Lamp — 3D building component ────────────────────────────────────
//
// Procedural mesh: tapered pole → curved arm → glass bulb housing.
// A THREE.PointLight under the bulb activates automatically at night
// according to the game clock supplied via gameTimeRef.
//
// To tune all visual / gameplay values → edit items/streetLamp.js

import { useRef, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CityContext } from '../CityContext.js';
import { usePlacementTracker, WorkAreaOverlay, NoPowerBadge, LevelBadge, LevelRing, memo, buildingPropsEqual } from '../SharedUI.jsx';
import { Html } from '@react-three/drei';
import { CableSourceRing } from '../EnergyCable.jsx';
import { FaBolt } from 'react-icons/fa';
import { STREET_LAMP_CONFIG } from '../../items/streetLamp.js';
import { getLevelConfig } from '../../systems/upgrades.js';

const {
  poleHeight, poleRadius, armLength, armHeight,
  headRadius,
  lightColor, lightIntensity, lightDistance, lightDecay,
  dayStart, dayEnd, powerRequired,
} = STREET_LAMP_CONFIG;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns true when the lamp should be ON for a given game hour. */
function isLampOn(gameHour) {
  return gameHour < dayStart || gameHour >= dayEnd;
}

const LIGHT_COLOR_OBJ = new THREE.Color(lightColor);

// ─── Shared body (used by both preview & placed) ──────────────────────────────

export function StreetLampBody({ emissiveColor, emissiveIntensity = 0, opacity = 1, transparent = false }) {
  const m = { transparent, opacity };
  const ec = emissiveColor ?? new THREE.Color(0x000000);
  const poleColor  = '#4a5568';
  const metalColor = '#718096';
  const headColor  = '#1a202c';

  return (
    <group>
      {/* ── Base plate ── */}
      <mesh receiveShadow position={[0, 0.07, 0]}>
        <cylinderGeometry args={[poleRadius * 2.8, poleRadius * 3.2, 0.14, 12]} />
        <meshStandardMaterial color={poleColor} roughness={0.6} metalness={0.5} {...m} />
      </mesh>

      {/* ── Lower pole (thick) ── */}
      <mesh castShadow position={[0, poleHeight * 0.28, 0]}>
        <cylinderGeometry args={[poleRadius * 0.85, poleRadius * 1.3, poleHeight * 0.55, 10]} />
        <meshStandardMaterial color={poleColor} roughness={0.5} metalness={0.6} {...m} />
      </mesh>

      {/* ── Upper pole (slender) ── */}
      <mesh castShadow position={[0, poleHeight * 0.72, 0]}>
        <cylinderGeometry args={[poleRadius * 0.55, poleRadius * 0.88, poleHeight * 0.44, 10]} />
        <meshStandardMaterial color={metalColor} roughness={0.4} metalness={0.7} {...m} />
      </mesh>

      {/* ── Horizontal arm ── */}
      <mesh castShadow position={[armLength / 2, armHeight, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[poleRadius * 0.5, poleRadius * 0.5, armLength, 8]} />
        <meshStandardMaterial color={metalColor} roughness={0.4} metalness={0.7} {...m} />
      </mesh>

      {/* ── Lamp housing (outer shell) ── */}
      <mesh castShadow position={[armLength, armHeight - 0.15, 0]}>
        <cylinderGeometry args={[headRadius, headRadius * 0.8, headRadius * 0.9, 12]} />
        <meshStandardMaterial color={headColor} roughness={0.5} metalness={0.8} {...m} />
      </mesh>

      {/* ── Glass bulb ── */}
      <mesh position={[armLength, armHeight - 0.35, 0]}>
        <sphereGeometry args={[headRadius * 0.68, 14, 10]} />
        <meshStandardMaterial
          color={lightColor}
          emissive={ec}
          emissiveIntensity={emissiveIntensity}
          roughness={0.05}
          metalness={0.0}
          transparent
          opacity={transparent ? opacity * 0.9 : 0.92}
        />
      </mesh>

      {/* ── Reflector disc (underside of housing) ── */}
      <mesh position={[armLength, armHeight - 0.52, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[headRadius * 0.72, 12]} />
        <meshStandardMaterial
          color="#c0a020"
          emissive={ec}
          emissiveIntensity={emissiveIntensity * 0.6}
          metalness={0.9}
          roughness={0.2}
          {...m}
        />
      </mesh>
    </group>
  );
}

// ─── Preview ghost ────────────────────────────────────────────────────────────

function StreetLampPreviewInner({ placementPosRef, inputRef, placementRotYRef }) {
  const { groupRef, blockedRef } = usePlacementTracker(placementPosRef, inputRef, placementRotYRef);
  const bulbRef = useRef();

  useFrame(({ clock }) => {
    const pulse   = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    const blocked = blockedRef.current;
    if (bulbRef.current) {
      bulbRef.current.emissive.setHex(blocked ? 0xff2200 : 0xffe080);
      bulbRef.current.emissiveIntensity = pulse;
      bulbRef.current.opacity = 0.78;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Simplified preview version — reuses full body with animated bulb ref */}
      <group>
        {/* Base */}
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[poleRadius * 2.8, poleRadius * 3.2, 0.14, 12]} />
          <meshStandardMaterial color="#4a5568" transparent opacity={0.82} />
        </mesh>
        {/* Lower pole */}
        <mesh position={[0, poleHeight * 0.28, 0]}>
          <cylinderGeometry args={[poleRadius * 0.85, poleRadius * 1.3, poleHeight * 0.55, 10]} />
          <meshStandardMaterial color="#4a5568" transparent opacity={0.82} />
        </mesh>
        {/* Upper pole */}
        <mesh position={[0, poleHeight * 0.72, 0]}>
          <cylinderGeometry args={[poleRadius * 0.55, poleRadius * 0.88, poleHeight * 0.44, 10]} />
          <meshStandardMaterial color="#718096" transparent opacity={0.82} />
        </mesh>
        {/* Arm */}
        <mesh position={[armLength / 2, armHeight, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[poleRadius * 0.5, poleRadius * 0.5, armLength, 8]} />
          <meshStandardMaterial color="#718096" transparent opacity={0.82} />
        </mesh>
        {/* Housing */}
        <mesh position={[armLength, armHeight - 0.15, 0]}>
          <cylinderGeometry args={[headRadius, headRadius * 0.8, headRadius * 0.9, 12]} />
          <meshStandardMaterial color="#1a202c" transparent opacity={0.82} />
        </mesh>
        {/* Bulb */}
        <mesh position={[armLength, armHeight - 0.35, 0]}>
          <sphereGeometry args={[headRadius * 0.68, 14, 10]} />
          <meshStandardMaterial ref={bulbRef} color={lightColor} emissive={new THREE.Color(0xffe080)} emissiveIntensity={0.8} transparent opacity={0.85} roughness={0.05} />
        </mesh>
      </group>
    </group>
  );
}

// ─── Placed building ──────────────────────────────────────────────────────────

function StreetLampPlacedBase({
  position, rotation,
  isSelected, onSelect,
  isConveyorSource, onConveyorClick,
  isCableSource, onCableClick,
  onRightClick,
  gameTimeRef,
  isPowered,
  level = 1,
}) {
  const { workArea, badgeHeight } = STREET_LAMP_CONFIG;
  const { placedHitRef, conveyorModeRef, rightClickHitRef, cableModeRef } = useContext(CityContext);
  const lvlConf = getLevelConfig('street-lamp', level);
  const scale   = 1 + (lvlConf.scaleBonus ?? 0);
  const accentColor = lvlConf.accentColor ?? lightColor;

  const lightRef     = useRef();
  const bulbMatRef   = useRef();
  const reflMatRef   = useRef();

  // ── Animate light on/off based on game clock AND power state ────────────
  useFrame(() => {
    const hour = gameTimeRef?.current ?? 0;
    const on   = isPowered !== false && isLampOn(hour);

    if (lightRef.current) {
      // Smooth intensity transition
      const target = on ? lightIntensity : 0;
      lightRef.current.intensity = THREE.MathUtils.lerp(
        lightRef.current.intensity, target, 0.05,
      );
    }

    if (bulbMatRef.current) {
      const targetEI = on ? 6.0 : 0.0;
      bulbMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        bulbMatRef.current.emissiveIntensity, targetEI, 0.05,
      );
    }
    if (reflMatRef.current) {
      const targetEI = on ? 3.5 : 0.0;
      reflMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        reflMatRef.current.emissiveIntensity, targetEI, 0.05,
      );
    }
  });

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
        <mesh receiveShadow position={[0, 0.07, 0]}>
          <cylinderGeometry args={[poleRadius * 2.8, poleRadius * 3.2, 0.14, 12]} />
          <meshStandardMaterial color="#4a5568" roughness={0.6} metalness={0.5} />
        </mesh>
        <mesh castShadow position={[0, poleHeight * 0.28, 0]}>
          <cylinderGeometry args={[poleRadius * 0.85, poleRadius * 1.3, poleHeight * 0.55, 10]} />
          <meshStandardMaterial color="#4a5568" roughness={0.5} metalness={0.6} />
        </mesh>
        <mesh castShadow position={[0, poleHeight * 0.72, 0]}>
          <cylinderGeometry args={[poleRadius * 0.55, poleRadius * 0.88, poleHeight * 0.44, 10]} />
          <meshStandardMaterial color="#718096" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Arm */}
        <mesh castShadow position={[armLength / 2, armHeight, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[poleRadius * 0.5, poleRadius * 0.5, armLength, 8]} />
          <meshStandardMaterial color="#718096" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Housing shell */}
        <mesh castShadow position={[armLength, armHeight - 0.15, 0]}>
          <cylinderGeometry args={[headRadius, headRadius * 0.8, headRadius * 0.9, 12]} />
          <meshStandardMaterial color="#1a202c" roughness={0.5} metalness={0.8} />
        </mesh>

        {/* ── Animated bulb ── */}
        <mesh position={[armLength, armHeight - 0.35, 0]}>
          <sphereGeometry args={[headRadius * 0.68, 14, 10]} />
          <meshStandardMaterial
            ref={bulbMatRef}
            color={accentColor}
            emissive={accentColor}
            emissiveIntensity={0}
            roughness={0.05}
            metalness={0}
            transparent
            opacity={0.92}
          />
        </mesh>

        {/* ── Animated reflector disc ── */}
        <mesh position={[armLength, armHeight - 0.52, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[headRadius * 0.72, 12]} />
          <meshStandardMaterial
            ref={reflMatRef}
            color="#c0a020"
            emissive={accentColor}
            emissiveIntensity={0}
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>

        {/* ── Three.js PointLight (casts actual scene lighting) ── */}
        <pointLight
          ref={lightRef}
          position={[armLength, armHeight - 0.5, 0]}
          color={accentColor}
          intensity={0}           // starts at 0; animated in useFrame
          distance={lightDistance}
          decay={lightDecay}
          castShadow={false}      // shadow from every street lamp is expensive; enable if needed
        />
      </group>

      {isCableSource && <CableSourceRing />}

      {/* Work-area overlay only while selected */}
      {isSelected && (
        <WorkAreaOverlay
          width={workArea.width}
          depth={workArea.depth}
          color={workArea.color}
          opacity={workArea.opacity}
        />
      )}

      {/* Power-consumption badge — always visible */}
      <Html
        position={[0, badgeHeight, 0]}
        center
        distanceFactor={35}
        zIndexRange={[10, 11]}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          background: 'rgba(0,0,0,0.72)',
          border: '1px solid rgba(255,255,255,0.13)',
          borderRadius: 8,
          padding: '2px 9px',
          fontSize: 12,
          fontFamily: 'monospace',
          fontWeight: 700,
          color: '#fde047',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}>
          <FaBolt style={{ marginRight: 4, verticalAlign: 'middle', fontSize: 10 }} /> {powerRequired} кВт
        </div>
      </Html>

      {/* No-power warning */}
      {isPowered === false && <NoPowerBadge badgeHeight={badgeHeight + 1.5} />}
      <LevelBadge level={level} height={badgeHeight + 2} />
      <LevelRing level={level} radius={3} />
    </group>
  );
}

export const StreetLampPreview = StreetLampPreviewInner;
export const StreetLampPlaced  = memo(StreetLampPlacedBase, buildingPropsEqual);
