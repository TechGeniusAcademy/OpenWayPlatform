import { useRef, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CityContext, ENERGY_STORAGE_Y, ENERGY_STORAGE_TILT_X, ENERGY_STORAGE_TILT_Z } from '../CityContext.js';
import { usePlacementTracker, StorageBadge, WorkAreaOverlay, NoPowerBadge, LevelBadge, LevelRing, memo, buildingPropsEqual } from '../SharedUI.jsx';
import { ConveyorSourceRing } from '../ConveyorBelt.jsx';
import { CableSourceRing } from '../EnergyCable.jsx';
import { ENERGY_STORAGE_CONFIG } from '../../items/energyStorage.js';
import { getLevelConfig } from '../../systems/upgrades.js';

// ─── Procedural mesh (battery-pack shape) ────────────────────────────────────

export function EnergyStorageBody({ emissiveColor, emissiveIntensity, opacity = 1, transparent = false, accentOverride }) {
  const matProps = { transparent, opacity, roughness: 0.35, metalness: 0.6 };
  return (
    <group position={[0, ENERGY_STORAGE_Y, 0]} rotation={[ENERGY_STORAGE_TILT_X, 0, ENERGY_STORAGE_TILT_Z]}>
      {/* Main body */}
      <mesh castShadow receiveShadow position={[0, 2, 0]}>
        <boxGeometry args={[3, 4, 3]} />
        <meshStandardMaterial color="#1e293b" emissive={new THREE.Color(emissiveColor ?? 0x000000)} emissiveIntensity={emissiveIntensity ?? 0} {...matProps} />
      </mesh>
      {/* Terminal cap */}
      <mesh castShadow position={[0, 4.35, 0]}>
        <boxGeometry args={[2, 0.7, 2]} />
        <meshStandardMaterial color="#64748b" emissive={new THREE.Color(emissiveColor ?? 0x000000)} emissiveIntensity={(emissiveIntensity ?? 0) * 0.6} {...matProps} />
      </mesh>
      {/* Positive terminal nub */}
      <mesh castShadow position={[0, 4.85, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.3, 8]} />
        <meshStandardMaterial color="#94a3b8" emissive={new THREE.Color(emissiveColor ?? 0x000000)} emissiveIntensity={(emissiveIntensity ?? 0) * 0.4} {...matProps} />
      </mesh>
      {/* Accent band 1 */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[3.04, 0.18, 3.04]} />
        <meshStandardMaterial color={accentOverride ?? '#a855f7'} emissive={new THREE.Color(accentOverride ?? 0xa855f7)} emissiveIntensity={(emissiveIntensity ?? 0) + 0.3} {...matProps} />
      </mesh>
      {/* Accent band 2 */}
      <mesh position={[0, 2.8, 0]}>
        <boxGeometry args={[3.04, 0.18, 3.04]} />
        <meshStandardMaterial color={accentOverride ?? '#a855f7'} emissive={new THREE.Color(accentOverride ?? 0xa855f7)} emissiveIntensity={(emissiveIntensity ?? 0) + 0.3} {...matProps} />
      </mesh>
    </group>
  );
}

// ─── Preview (placement ghost) ────────────────────────────────────────────────

function EnergyStorageGLTFPreview({ placementPosRef, inputRef, placementRotYRef }) {
  const { groupRef, blockedRef } = usePlacementTracker(placementPosRef, inputRef, placementRotYRef);
  const mat0 = useRef(); // body
  const mat1 = useRef(); // cap
  const mat2 = useRef(); // nub
  const mat3 = useRef(); // band 1
  const mat4 = useRef(); // band 2

  useFrame(({ clock }) => {
    const pulse   = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    const blocked = blockedRef.current;
    const col     = blocked ? 0xff2200 : 0xaa44ff;
    for (const m of [mat0, mat1, mat2]) {
      if (m.current) { m.current.emissive.setHex(col); m.current.emissiveIntensity = pulse; m.current.opacity = 0.82; }
    }
    for (const m of [mat3, mat4]) {
      if (m.current) { m.current.emissive.setHex(col); m.current.emissiveIntensity = pulse + 0.3; }
    }
  });

  return (
    <group ref={groupRef}>
      <group position={[0, ENERGY_STORAGE_Y, 0]} rotation={[ENERGY_STORAGE_TILT_X, 0, ENERGY_STORAGE_TILT_Z]}>
        <mesh castShadow position={[0, 2, 0]}>
          <boxGeometry args={[3, 4, 3]} />
          <meshStandardMaterial ref={mat0} color="#1e293b" emissive={new THREE.Color(0xaa44ff)} emissiveIntensity={0.8} transparent opacity={0.82} roughness={0.35} metalness={0.6} />
        </mesh>
        <mesh castShadow position={[0, 4.35, 0]}>
          <boxGeometry args={[2, 0.7, 2]} />
          <meshStandardMaterial ref={mat1} color="#64748b" emissive={new THREE.Color(0xaa44ff)} emissiveIntensity={0.5} transparent opacity={0.82} roughness={0.35} metalness={0.6} />
        </mesh>
        <mesh castShadow position={[0, 4.85, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.3, 8]} />
          <meshStandardMaterial ref={mat2} color="#94a3b8" emissive={new THREE.Color(0xaa44ff)} emissiveIntensity={0.3} transparent opacity={0.82} roughness={0.35} metalness={0.6} />
        </mesh>
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[3.04, 0.18, 3.04]} />
          <meshStandardMaterial ref={mat3} color="#a855f7" emissive={new THREE.Color(0xaa44ff)} emissiveIntensity={1.1} transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, 2.8, 0]}>
          <boxGeometry args={[3.04, 0.18, 3.04]} />
          <meshStandardMaterial ref={mat4} color="#a855f7" emissive={new THREE.Color(0xaa44ff)} emissiveIntensity={1.1} transparent opacity={0.9} />
        </mesh>
      </group>
    </group>
  );
}

function EnergyStorageGLTFPlaced({ position, rotation, isSelected, onSelect, onConveyorClick, isConveyorSource, onRightClick, isPowered, currentAmounts, isCableSource, onCableClick, level = 1 }) {
  const { workArea } = ENERGY_STORAGE_CONFIG;
  const { placedHitRef, conveyorModeRef, rightClickHitRef, cableModeRef } = useContext(CityContext);
  const lvlConf = getLevelConfig('energy-storage', level);
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
        <EnergyStorageBody accentOverride={accent} emissiveColor={accent} emissiveIntensity={glow} />
      </group>
      <StorageBadge itemType="energy-storage" badgeHeight={ENERGY_STORAGE_CONFIG.badgeHeight} currentAmounts={currentAmounts} level={level} />
      {isConveyorSource && <ConveyorSourceRing />}
      {isCableSource && <CableSourceRing />}
      {isPowered === false && <NoPowerBadge badgeHeight={ENERGY_STORAGE_CONFIG.badgeHeight} />}
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

export function EnergyStoragePreview({ placementPosRef, inputRef, placementRotYRef }) {
  return <EnergyStorageGLTFPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />;
}

export const EnergyStoragePlaced = memo(
  function EnergyStoragePlaced({ position, rotation, isSelected, onSelect, onConveyorClick, isConveyorSource, onRightClick, isPowered, currentAmounts, isCableSource, onCableClick, level = 1 }) {
    return <EnergyStorageGLTFPlaced position={position} rotation={rotation} isSelected={isSelected} onSelect={onSelect} onConveyorClick={onConveyorClick} isConveyorSource={isConveyorSource} onRightClick={onRightClick} isPowered={isPowered} currentAmounts={currentAmounts} isCableSource={isCableSource} onCableClick={onCableClick} level={level} />;
  },
  buildingPropsEqual,
);
