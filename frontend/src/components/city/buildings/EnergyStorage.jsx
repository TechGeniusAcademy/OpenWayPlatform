import { useRef, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { CityContext, ENERGY_STORAGE_Y, ENERGY_STORAGE_TILT_X, ENERGY_STORAGE_TILT_Z } from '../CityContext.js';
import { usePlacementTracker, StorageBadge, WorkAreaOverlay, NoPowerBadge, LevelBadge, LevelRing, LevelPlinth, memo, buildingPropsEqual } from '../SharedUI.jsx';
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
  const { scene } = useGLTF('/models/Storage Unit.glb');
  const cloneRef = useRef(null);
  if (!cloneRef.current) cloneRef.current = scene.clone(true);
  const _col = useRef(new THREE.Color());

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    _col.current.setHex(blockedRef.current ? 0xff2200 : 0xaa44ff);
    cloneRef.current?.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mat = obj.material;
      if (mat.emissive) mat.emissive.copy(_col.current);
      mat.emissiveIntensity = pulse * 0.5 + 0.3;
      mat.opacity = 0.78;
      mat.transparent = true;
    });
  });

  return (
    <group ref={groupRef}>
      <primitive object={cloneRef.current} />
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

  const { scene: storageScene } = useGLTF('/models/Storage Unit.glb');
  const storageCloneRef = useRef(null);
  if (!storageCloneRef.current) storageCloneRef.current = storageScene.clone(true);

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
        <primitive object={storageCloneRef.current} />
      </group>
      <StorageBadge itemType="energy-storage" badgeHeight={ENERGY_STORAGE_CONFIG.badgeHeight} currentAmounts={currentAmounts} level={level} />
      <LevelPlinth level={level} size={4} />
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

useGLTF.preload('/models/Storage Unit.glb');

export function EnergyStoragePreview({ placementPosRef, inputRef, placementRotYRef }) {
  return <EnergyStorageGLTFPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />;
}

export const EnergyStoragePlaced = memo(
  function EnergyStoragePlaced({ position, rotation, isSelected, onSelect, onConveyorClick, isConveyorSource, onRightClick, isPowered, currentAmounts, isCableSource, onCableClick, level = 1 }) {
    return <EnergyStorageGLTFPlaced position={position} rotation={rotation} isSelected={isSelected} onSelect={onSelect} onConveyorClick={onConveyorClick} isConveyorSource={isConveyorSource} onRightClick={onRightClick} isPowered={isPowered} currentAmounts={currentAmounts} isCableSource={isCableSource} onCableClick={onCableClick} level={level} />;
  },
  buildingPropsEqual,
);
