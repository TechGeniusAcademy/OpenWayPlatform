import { Suspense, useMemo, useEffect, useRef, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { CityContext, MONEY_FACTORY_Y, MONEY_FACTORY_TILT_X, MONEY_FACTORY_TILT_Z } from '../CityContext.js';
import { usePlacementTracker, EnergyBadge, WorkAreaOverlay, NoPowerBadge, LevelBadge, LevelRing, memo, buildingPropsEqual } from '../SharedUI.jsx';
import { ConveyorSourceRing } from '../ConveyorBelt.jsx';
import { CableSourceRing } from '../EnergyCable.jsx';
import { MONEY_FACTORY_CONFIG } from '../../items/moneyFactory.js';
import { getLevelConfig } from '../../systems/upgrades.js';

const MODEL_URL = '/models/money-factory.glb';
useGLTF.preload(MODEL_URL);

const _tint = new THREE.Color();

function FactoryGLB({ emissiveColor, emissiveIntensity }) {
  const { scene } = useGLTF(MODEL_URL);
  const model = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    const ei = emissiveIntensity ?? 0;
    _tint.set(ei > 0 ? (emissiveColor ?? '#000000') : '#000000');
    model.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (mat.emissive) { mat.emissive.copy(_tint); mat.emissiveIntensity = ei; }
        mat.needsUpdate = true;
      });
    });
  }, [model, emissiveColor, emissiveIntensity]);
  return (
    <primitive
      object={model}
      scale={[2.25, 2.25, 2.25]}
      position={[0, MONEY_FACTORY_Y, 0]}
      rotation={[MONEY_FACTORY_TILT_X, 0, MONEY_FACTORY_TILT_Z]}
      castShadow
      receiveShadow
    />
  );
}

function ProceduralBody({ emissiveColor, emissiveIntensity, opacity = 1, transparent = false, accentOverride }) {
  const m = { transparent, opacity, roughness: 0.55, metalness: 0.3 };
  const ec = emissiveColor ?? '#000000';
  const ei = emissiveIntensity ?? 0;
  return (
    <group position={[0, MONEY_FACTORY_Y, 0]} rotation={[MONEY_FACTORY_TILT_X, 0, MONEY_FACTORY_TILT_Z]}>
      <mesh receiveShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[8.5, 0.4, 8.5]} />
        <meshStandardMaterial color="#374151" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.2} {...m} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 4, 0]}>
        <boxGeometry args={[7, 7.2, 6.5]} />
        <meshStandardMaterial color="#1f2937" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.35} {...m} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 3, 3.8]}>
        <boxGeometry args={[4.5, 5.2, 2]} />
        <meshStandardMaterial color="#111827" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.4} {...m} />
      </mesh>
      <mesh castShadow position={[-2.2, 10.5, -2.2]}>
        <cylinderGeometry args={[0.38, 0.45, 6.5, 8]} />
        <meshStandardMaterial color="#374151" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.3} {...m} />
      </mesh>
      <mesh castShadow position={[2.2, 10, -2.2]}>
        <cylinderGeometry args={[0.38, 0.45, 5.5, 8]} />
        <meshStandardMaterial color="#374151" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.3} {...m} />
      </mesh>
      <mesh castShadow position={[-2.2, 13.95, -2.2]}>
        <cylinderGeometry args={[0.55, 0.38, 0.55, 8]} />
        <meshStandardMaterial color={accentOverride ?? '#4b5563'} emissive={new THREE.Color(accentOverride ?? ec)} emissiveIntensity={ei + 0.4} {...m} />
      </mesh>
      <mesh castShadow position={[2.2, 12.95, -2.2]}>
        <cylinderGeometry args={[0.55, 0.38, 0.55, 8]} />
        <meshStandardMaterial color={accentOverride ?? '#4b5563'} emissive={new THREE.Color(accentOverride ?? ec)} emissiveIntensity={ei + 0.4} {...m} />
      </mesh>
      {[-1.4, 0, 1.4].map((x, i) => (
        <mesh key={i} position={[x, 3.5, 4.82]}>
          <boxGeometry args={[0.9, 1.3, 0.06]} />
          <meshStandardMaterial color="#fbbf24" emissive={new THREE.Color(emissiveColor ?? '#fbbf24')} emissiveIntensity={ei + 0.6} transparent opacity={opacity} />
        </mesh>
      ))}
      <mesh position={[0, 5.5, 3.82]}>
        <boxGeometry args={[1.4, 1.8, 0.06]} />
        <meshStandardMaterial color={accentOverride ?? '#22c55e'} emissive={new THREE.Color(accentOverride ?? ec)} emissiveIntensity={ei + 0.8} transparent opacity={opacity} />
      </mesh>
    </group>
  );
}

export function MoneyFactoryBody({ emissiveColor, emissiveIntensity, opacity = 1, transparent = false, accentOverride, isPreview = false }) {
  if (isPreview) {
    return <ProceduralBody emissiveColor={emissiveColor} emissiveIntensity={emissiveIntensity} opacity={opacity} transparent={transparent} accentOverride={accentOverride} />;
  }
  return (
    <Suspense fallback={<ProceduralBody emissiveColor={emissiveColor} emissiveIntensity={emissiveIntensity} opacity={opacity} transparent={transparent} accentOverride={accentOverride} />}>
      <FactoryGLB emissiveColor={emissiveColor} emissiveIntensity={emissiveIntensity} accentOverride={accentOverride} />
    </Suspense>
  );
}

const _previewCol = new THREE.Color();

function MoneyFactoryGLTFPreview({ placementPosRef, inputRef, placementRotYRef }) {
  const { groupRef, blockedRef } = usePlacementTracker(placementPosRef, inputRef, placementRotYRef);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    _previewCol.setHex(blockedRef.current ? 0xff2200 : 0x00ff88);
    groupRef.current.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mat = obj.material;
      if (mat.emissive) mat.emissive.copy(_previewCol);
      mat.emissiveIntensity = pulse * 0.5 + 0.3;
      mat.opacity = 0.82;
      mat.transparent = true;
    });
  });
  return (
    <group ref={groupRef}>
      <MoneyFactoryBody emissiveColor="#00ff88" emissiveIntensity={0.35} transparent opacity={0.82} isPreview />
    </group>
  );
}

function MoneyFactoryGLTFPlaced({ position, rotation, isSelected, onSelect, onConveyorClick, isConveyorSource, onRightClick, isPowered, isCableSource, onCableClick, level = 1 }) {
  const { workArea } = MONEY_FACTORY_CONFIG;
  const { placedHitRef, conveyorModeRef, rightClickHitRef, cableModeRef } = useContext(CityContext);
  const lvlConf = getLevelConfig('money-factory', level);
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
        <MoneyFactoryBody accentOverride={accent} emissiveColor={accent} emissiveIntensity={glow} />
      </group>
      <EnergyBadge itemType="money-factory" badgeHeight={MONEY_FACTORY_CONFIG.badgeHeight} level={level} />
      <LevelBadge level={level} height={MONEY_FACTORY_CONFIG.badgeHeight + 2} />
      <LevelRing level={level} radius={5} />
      {isConveyorSource && <ConveyorSourceRing />}
      {isCableSource && <CableSourceRing />}
      {isPowered === false && <NoPowerBadge badgeHeight={MONEY_FACTORY_CONFIG.badgeHeight} />}
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

export function MoneyFactoryPreview({ placementPosRef, inputRef, placementRotYRef }) {
  return <MoneyFactoryGLTFPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />;
}

export const MoneyFactoryPlaced = memo(
  function MoneyFactoryPlaced({ position, rotation, isSelected, onSelect, onConveyorClick, isConveyorSource, onRightClick, isPowered, isCableSource, onCableClick, level = 1 }) {
    return <MoneyFactoryGLTFPlaced position={position} rotation={rotation} isSelected={isSelected} onSelect={onSelect} onConveyorClick={onConveyorClick} isConveyorSource={isConveyorSource} onRightClick={onRightClick} isPowered={isPowered} isCableSource={isCableSource} onCableClick={onCableClick} level={level} />;
  },
  buildingPropsEqual,
);
