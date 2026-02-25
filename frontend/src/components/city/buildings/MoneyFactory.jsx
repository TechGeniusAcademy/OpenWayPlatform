import { useRef, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CityContext, MONEY_FACTORY_Y, MONEY_FACTORY_TILT_X, MONEY_FACTORY_TILT_Z } from '../CityContext.js';
import { usePlacementTracker, EnergyBadge, WorkAreaOverlay, NoPowerBadge, LevelBadge, LevelRing, memo, buildingPropsEqual } from '../SharedUI.jsx';
import { ConveyorSourceRing } from '../ConveyorBelt.jsx';
import { CableSourceRing } from '../EnergyCable.jsx';
import { MONEY_FACTORY_CONFIG } from '../../items/moneyFactory.js';
import { getLevelConfig } from '../../systems/upgrades.js';

// ─── Procedural mesh ──────────────────────────────────────────────────────────

export function MoneyFactoryBody({ emissiveColor, emissiveIntensity, opacity = 1, transparent = false, accentOverride }) {
  const m = { transparent, opacity, roughness: 0.55, metalness: 0.3 };
  const ec = emissiveColor ?? 0x000000;
  const ei = emissiveIntensity ?? 0;
  return (
    <group position={[0, MONEY_FACTORY_Y, 0]} rotation={[MONEY_FACTORY_TILT_X, 0, MONEY_FACTORY_TILT_Z]}>
      {/* Foundation slab */}
      <mesh receiveShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[8.5, 0.4, 8.5]} />
        <meshStandardMaterial color="#374151" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.2} {...m} />
      </mesh>
      {/* Main warehouse body */}
      <mesh castShadow receiveShadow position={[0, 4, 0]}>
        <boxGeometry args={[7, 7.2, 6.5]} />
        <meshStandardMaterial color="#1f2937" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.35} {...m} />
      </mesh>
      {/* Front office block */}
      <mesh castShadow receiveShadow position={[0, 3, 3.8]}>
        <boxGeometry args={[4.5, 5.2, 2]} />
        <meshStandardMaterial color="#111827" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.4} {...m} />
      </mesh>
      {/* Roof trim */}
      <mesh castShadow position={[0, 7.7, 0]}>
        <boxGeometry args={[7.4, 0.4, 7]} />
        <meshStandardMaterial color="#374151" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.25} {...m} />
      </mesh>
      {/* Loading dock */}
      <mesh receiveShadow position={[0, 0.6, 5.2]}>
        <boxGeometry args={[5, 0.6, 1.4]} />
        <meshStandardMaterial color="#4b5563" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.2} {...m} />
      </mesh>
      {/* Chimney left */}
      <mesh castShadow position={[-2.2, 10.5, -2.2]}>
        <cylinderGeometry args={[0.38, 0.45, 6.5, 10]} />
        <meshStandardMaterial color="#374151" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.3} {...m} />
      </mesh>
      <mesh castShadow position={[-2.2, 13.95, -2.2]}>
        <cylinderGeometry args={[0.55, 0.38, 0.55, 10]} />
        <meshStandardMaterial color={accentOverride ?? '#4b5563'} emissive={new THREE.Color(accentOverride ?? emissiveColor ?? '#00ff88')} emissiveIntensity={ei + 0.4} {...m} />
      </mesh>
      {/* Chimney right */}
      <mesh castShadow position={[2.2, 10, -2.2]}>
        <cylinderGeometry args={[0.38, 0.45, 5.5, 10]} />
        <meshStandardMaterial color="#374151" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.3} {...m} />
      </mesh>
      <mesh castShadow position={[2.2, 12.95, -2.2]}>
        <cylinderGeometry args={[0.55, 0.38, 0.55, 10]} />
        <meshStandardMaterial color={accentOverride ?? '#4b5563'} emissive={new THREE.Color(accentOverride ?? emissiveColor ?? '#00ff88')} emissiveIntensity={ei + 0.4} {...m} />
      </mesh>
      {/* Office windows */}
      {[-1.4, 0, 1.4].map((x, i) => (
        <mesh key={i} position={[x, 3.5, 4.82]}>
          <boxGeometry args={[0.9, 1.3, 0.06]} />
          <meshStandardMaterial color="#fbbf24" emissive={new THREE.Color(emissiveColor ?? 0xfbbf24)} emissiveIntensity={ei + 0.6} transparent opacity={opacity} />
        </mesh>
      ))}
      {/* Money $ sign */}
      <mesh position={[0, 5.5, 3.82]}>
        <boxGeometry args={[1.4, 1.8, 0.06]} />
        <meshStandardMaterial color={accentOverride ?? '#22c55e'} emissive={new THREE.Color(accentOverride ?? emissiveColor ?? '#00ff88')} emissiveIntensity={ei + 0.8} transparent opacity={opacity} />
      </mesh>
      {/* Side vents */}
      {[0, 1.2, 2.4].map((z, i) => (
        <mesh key={i} position={[3.53, 2.5, z - 1.2]}>
          <boxGeometry args={[0.06, 0.22, 0.8]} />
          <meshStandardMaterial color="#6b7280" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.3} transparent={transparent} opacity={opacity} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Preview (placement ghost) ────────────────────────────────────────────────

function MoneyFactoryGLTFPreview({ placementPosRef, inputRef, placementRotYRef }) {
  const { groupRef, blockedRef } = usePlacementTracker(placementPosRef, inputRef, placementRotYRef);
  const matMain    = useRef();
  const matFront   = useRef();
  const matChimL   = useRef();
  const matChimR   = useRef();
  const matWindows = useRef();
  const matSign    = useRef();

  useFrame(({ clock }) => {
    const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    const col   = blockedRef.current ? 0xff2200 : 0x00ff88;
    for (const r of [matMain, matFront]) {
      if (r.current) { r.current.emissive.setHex(col); r.current.emissiveIntensity = pulse * 0.4; r.current.opacity = 0.82; }
    }
    for (const r of [matChimL, matChimR]) {
      if (r.current) { r.current.emissive.setHex(col); r.current.emissiveIntensity = pulse + 0.4; r.current.opacity = 0.82; }
    }
    if (matWindows.current) { matWindows.current.emissive.setHex(blockedRef.current ? 0xff2200 : 0xfbbf24); matWindows.current.emissiveIntensity = pulse + 0.5; matWindows.current.opacity = 0.82; }
    if (matSign.current)    { matSign.current.emissive.setHex(col);    matSign.current.emissiveIntensity    = pulse + 0.8; matSign.current.opacity = 0.82; }
  });

  return (
    <group ref={groupRef}>
      <group position={[0, MONEY_FACTORY_Y, 0]} rotation={[MONEY_FACTORY_TILT_X, 0, MONEY_FACTORY_TILT_Z]}>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[8.5, 0.4, 8.5]} />
          <meshStandardMaterial color="#374151" transparent opacity={0.82} roughness={0.55} metalness={0.3} />
        </mesh>
        <mesh castShadow position={[0, 4, 0]}>
          <boxGeometry args={[7, 7.2, 6.5]} />
          <meshStandardMaterial ref={matMain} color="#1f2937" emissive={new THREE.Color(0x00ff88)} emissiveIntensity={0.35} transparent opacity={0.82} roughness={0.55} metalness={0.3} />
        </mesh>
        <mesh castShadow position={[0, 3, 3.8]}>
          <boxGeometry args={[4.5, 5.2, 2]} />
          <meshStandardMaterial ref={matFront} color="#111827" emissive={new THREE.Color(0x00ff88)} emissiveIntensity={0.4} transparent opacity={0.82} roughness={0.55} metalness={0.3} />
        </mesh>
        <mesh castShadow position={[-2.2, 13.95, -2.2]}>
          <cylinderGeometry args={[0.55, 0.38, 0.55, 10]} />
          <meshStandardMaterial ref={matChimL} color="#4b5563" emissive={new THREE.Color(0x00ff88)} emissiveIntensity={0.9} transparent opacity={0.82} roughness={0.55} metalness={0.3} />
        </mesh>
        <mesh castShadow position={[2.2, 12.95, -2.2]}>
          <cylinderGeometry args={[0.55, 0.38, 0.55, 10]} />
          <meshStandardMaterial ref={matChimR} color="#4b5563" emissive={new THREE.Color(0x00ff88)} emissiveIntensity={0.9} transparent opacity={0.82} roughness={0.55} metalness={0.3} />
        </mesh>
        {[-1.4, 0, 1.4].map((x, i) => (
          <mesh key={i} position={[x, 3.5, 4.82]}>
            <boxGeometry args={[0.9, 1.3, 0.06]} />
            <meshStandardMaterial ref={i === 1 ? matWindows : undefined} color="#fbbf24" emissive={new THREE.Color(0xfbbf24)} emissiveIntensity={1.1} transparent opacity={0.82} />
          </mesh>
        ))}
        <mesh position={[0, 5.5, 3.82]}>
          <boxGeometry args={[1.4, 1.8, 0.06]} />
          <meshStandardMaterial ref={matSign} color="#22c55e" emissive={new THREE.Color(0x00ff88)} emissiveIntensity={1.3} transparent opacity={0.82} />
        </mesh>
      </group>
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

// ─── Public API ───────────────────────────────────────────────────────────────

export function MoneyFactoryPreview({ placementPosRef, inputRef, placementRotYRef }) {
  return <MoneyFactoryGLTFPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />;
}

export const MoneyFactoryPlaced = memo(
  function MoneyFactoryPlaced({ position, rotation, isSelected, onSelect, onConveyorClick, isConveyorSource, onRightClick, isPowered, isCableSource, onCableClick, level = 1 }) {
    return <MoneyFactoryGLTFPlaced position={position} rotation={rotation} isSelected={isSelected} onSelect={onSelect} onConveyorClick={onConveyorClick} isConveyorSource={isConveyorSource} onRightClick={onRightClick} isPowered={isPowered} isCableSource={isCableSource} onCableClick={onCableClick} level={level} />;
  },
  buildingPropsEqual,
);
