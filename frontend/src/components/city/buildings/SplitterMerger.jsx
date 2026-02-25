import { useRef, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CityContext } from '../CityContext.js';
import { usePlacementTracker, StorageBadge, WorkAreaOverlay, LevelBadge, LevelRing, memo, buildingPropsEqual } from '../SharedUI.jsx';
import { ConveyorSourceRing } from '../ConveyorBelt.jsx';
import { SPLITTER_CONFIG, MERGER_CONFIG } from '../../items/splitterMerger.js';
import { getLevelConfig } from '../../systems/upgrades.js';

// ─── Splitter body (amber Y-node: 1 in, 2 out) ───────────────────────────────

function SplitterBody({ emissiveColor, emissiveIntensity, opacity = 1, transparent = false, accentOverride }) {
  const col  = accentOverride ?? '#f59e0b';
  const ecol = emissiveColor ?? accentOverride ?? '#f59e0b';
  const ei   = emissiveIntensity ?? 0;
  const mat  = { transparent, opacity, roughness: 0.4, metalness: 0.55 };
  return (
    <group position={[0, 0, 0]}>
      {/* Central hub */}
      <mesh castShadow receiveShadow position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 2.2, 12]} />
        <meshStandardMaterial color={col} emissive={new THREE.Color(ecol)} emissiveIntensity={ei} {...mat} />
      </mesh>
      {/* Incoming arm (−Z direction) */}
      <mesh castShadow position={[0, 0.7, -1.6]}>
        <boxGeometry args={[0.7, 0.7, 2.2]} />
        <meshStandardMaterial color={col} emissive={new THREE.Color(ecol)} emissiveIntensity={ei} {...mat} />
      </mesh>
      {/* Out arm left (+X, +Z) */}
      <mesh castShadow position={[1.35, 0.7, 1.1]} rotation={[0, -Math.PI / 4, 0]}>
        <boxGeometry args={[0.7, 0.7, 2.2]} />
        <meshStandardMaterial color={col} emissive={new THREE.Color(ecol)} emissiveIntensity={ei} {...mat} />
      </mesh>
      {/* Out arm right (−X, +Z) */}
      <mesh castShadow position={[-1.35, 0.7, 1.1]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.7, 0.7, 2.2]} />
        <meshStandardMaterial color={col} emissive={new THREE.Color(ecol)} emissiveIntensity={ei} {...mat} />
      </mesh>
      {/* Top cap */}
      <mesh position={[0, 2.4, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.35, 8]} />
        <meshStandardMaterial color={accentOverride ?? '#fde68a'} emissive={new THREE.Color(ecol)} emissiveIntensity={ei + 0.3} {...mat} />
      </mesh>
    </group>
  );
}

// ─── Merger body (purple reverse-Y: 2 in, 1 out) ─────────────────────────────────

function MergerBody({ emissiveColor, emissiveIntensity, opacity = 1, transparent = false, accentOverride }) {
  const col  = accentOverride ?? '#8b5cf6';
  const ecol = emissiveColor ?? accentOverride ?? '#8b5cf6';
  const ei   = emissiveIntensity ?? 0;
  const mat  = { transparent, opacity, roughness: 0.4, metalness: 0.55 };
  return (
    <group position={[0, 0, 0]}>
      {/* Central hub */}
      <mesh castShadow receiveShadow position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 2.2, 12]} />
        <meshStandardMaterial color={col} emissive={new THREE.Color(ecol)} emissiveIntensity={ei} {...mat} />
      </mesh>
      {/* Outgoing arm (+Z direction) */}
      <mesh castShadow position={[0, 0.7, 1.6]}>
        <boxGeometry args={[0.7, 0.7, 2.2]} />
        <meshStandardMaterial color={col} emissive={new THREE.Color(ecol)} emissiveIntensity={ei} {...mat} />
      </mesh>
      {/* In arm left (+X, −Z) */}
      <mesh castShadow position={[1.35, 0.7, -1.1]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.7, 0.7, 2.2]} />
        <meshStandardMaterial color={col} emissive={new THREE.Color(ecol)} emissiveIntensity={ei} {...mat} />
      </mesh>
      {/* In arm right (−X, −Z) */}
      <mesh castShadow position={[-1.35, 0.7, -1.1]} rotation={[0, -Math.PI / 4, 0]}>
        <boxGeometry args={[0.7, 0.7, 2.2]} />
        <meshStandardMaterial color={col} emissive={new THREE.Color(ecol)} emissiveIntensity={ei} {...mat} />
      </mesh>
      {/* Top cap */}
      <mesh position={[0, 2.4, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.35, 8]} />
        <meshStandardMaterial color={accentOverride ?? '#ddd6fe'} emissive={new THREE.Color(ecol)} emissiveIntensity={ei + 0.3} {...mat} />
      </mesh>
    </group>
  );
}

// ─── Shared preview logic ─────────────────────────────────────────────────────

function BuildingPreview({ placementPosRef, inputRef, placementRotYRef, BodyComponent, baseColor }) {
  const { groupRef, blockedRef } = usePlacementTracker(placementPosRef, inputRef, placementRotYRef);
  const matRefsRef = useRef([]);

  useFrame(({ clock }) => {
    const pulse   = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    const blocked = blockedRef.current;
    const col     = new THREE.Color(blocked ? '#ff2200' : baseColor);
    matRefsRef.current.forEach(m => {
      if (m) { m.emissive.copy(col); m.emissiveIntensity = pulse; m.opacity = 0.82; }
    });
  });

  return (
    <group ref={groupRef}>
      <BodyComponent
        emissiveColor={baseColor}
        emissiveIntensity={0.7}
        opacity={0.82}
        transparent
      />
    </group>
  );
}

// ─── Shared placed logic ──────────────────────────────────────────────────────

function BuildingPlaced({ position, rotation, isSelected, onSelect, onConveyorClick, isConveyorSource, onRightClick, currentAmounts, config, BodyComponent, accentOverride, glowIntensity = 0, scale = 1, level = 1 }) {
  const { workArea, badgeHeight } = config;
  const { placedHitRef, conveyorModeRef, rightClickHitRef, cableModeRef } = useContext(CityContext);

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
        if (cableModeRef.current)         { /* no cable support */ }
        else if (conveyorModeRef.current) { onConveyorClick?.(); }
        else                              { onSelect?.(); }
      }}
    >
      <group rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]}>
        <BodyComponent accentOverride={accentOverride} emissiveColor={accentOverride} emissiveIntensity={glowIntensity} />
      </group>
      <StorageBadge itemType={null} badgeHeight={badgeHeight} currentAmounts={currentAmounts} />
      <LevelBadge level={level} height={badgeHeight + 2} />
      <LevelRing level={level} radius={4} />
      {isConveyorSource && <ConveyorSourceRing />}
      {isSelected && (
        <WorkAreaOverlay
          width={workArea.width}
          depth={workArea.depth}
          color={workArea.color}
          opacity={workArea.opacity}
        />
      )}
    </group>
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function SplitterPreview({ placementPosRef, inputRef, placementRotYRef }) {
  return (
    <BuildingPreview
      placementPosRef={placementPosRef}
      inputRef={inputRef}
      placementRotYRef={placementRotYRef}
      BodyComponent={SplitterBody}
      baseColor="#f59e0b"
    />
  );
}

export const SplitterPlaced = memo(
  function SplitterPlaced({ position, rotation, isSelected, onSelect, onConveyorClick, isConveyorSource, onRightClick, currentAmounts, level = 1 }) {
  const lvlConf = getLevelConfig('splitter', level);
  const scale   = 1 + (lvlConf.scaleBonus ?? 0);
  const accent  = lvlConf.accentColor;
  const glow    = lvlConf.glowIntensity ?? 0;
  return (
    <BuildingPlaced
      position={position}
      rotation={rotation}
      isSelected={isSelected}
      onSelect={onSelect}
      onConveyorClick={onConveyorClick}
      isConveyorSource={isConveyorSource}
      onRightClick={onRightClick}
      currentAmounts={currentAmounts ?? {}}
      config={SPLITTER_CONFIG}
      BodyComponent={SplitterBody}
      accentOverride={accent}
      glowIntensity={glow}
      scale={scale}
      level={level}
    />
  );
  },
  buildingPropsEqual,
);

export function MergerPreview({ placementPosRef, inputRef, placementRotYRef }) {
  return (
    <BuildingPreview
      placementPosRef={placementPosRef}
      inputRef={inputRef}
      placementRotYRef={placementRotYRef}
      BodyComponent={MergerBody}
      baseColor="#8b5cf6"
    />
  );
}

export const MergerPlaced = memo(
  function MergerPlaced({ position, rotation, isSelected, onSelect, onConveyorClick, isConveyorSource, onRightClick, currentAmounts, level = 1 }) {
  const lvlConf = getLevelConfig('merger', level);
  const scale   = 1 + (lvlConf.scaleBonus ?? 0);
  const accent  = lvlConf.accentColor;
  const glow    = lvlConf.glowIntensity ?? 0;
  return (
    <BuildingPlaced
      position={position}
      rotation={rotation}
      isSelected={isSelected}
      onSelect={onSelect}
      onConveyorClick={onConveyorClick}
      isConveyorSource={isConveyorSource}
      onRightClick={onRightClick}
      currentAmounts={currentAmounts ?? {}}
      config={MERGER_CONFIG}
      BodyComponent={MergerBody}
      accentOverride={accent}
      glowIntensity={glow}
      scale={scale}
      level={level}
    />
  );
  },
  buildingPropsEqual,
);
