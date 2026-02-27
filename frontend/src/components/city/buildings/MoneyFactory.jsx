import { useRef, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, MeshTransmissionMaterial, Sparkles, Float } from '@react-three/drei';
import * as THREE from 'three';
import { CityContext, MONEY_FACTORY_Y, MONEY_FACTORY_TILT_X, MONEY_FACTORY_TILT_Z } from '../CityContext.js';
import { usePlacementTracker, EnergyBadge, WorkAreaOverlay, NoPowerBadge, LevelBadge, LevelRing, memo, buildingPropsEqual } from '../SharedUI.jsx';
import { ConveyorSourceRing } from '../ConveyorBelt.jsx';
import { CableSourceRing } from '../EnergyCable.jsx';
import { MONEY_FACTORY_CONFIG } from '../../items/moneyFactory.js';
import { getLevelConfig } from '../../systems/upgrades.js';

// Shared chimney smoke colour
const SMOKE_COL = new THREE.Color('#aaaaaa');

// ─── MoneyFactoryBody — shared between placed + preview ───────────────────────────
export function MoneyFactoryBody({ emissiveColor, emissiveIntensity, opacity = 1, transparent = false, accentOverride, isPreview = false }) {
  const ec     = emissiveColor ?? '#000000';
  const ei     = emissiveIntensity ?? 0;
  const accent = accentOverride ?? '#22c55e';
  const m      = { roughness: 0.55, metalness: 0.35, transparent, opacity };

  return (
    <group position={[0, MONEY_FACTORY_Y, 0]} rotation={[MONEY_FACTORY_TILT_X, 0, MONEY_FACTORY_TILT_Z]}>

      {/* ─ Foundation slab ─ */}
      <RoundedBox args={[9, 0.45, 9]} radius={0.08} smoothness={2} receiveShadow position={[0, 0.22, 0]}>
        <meshStandardMaterial color="#2d3748" emissive={ec} emissiveIntensity={ei * 0.15} {...m} />
      </RoundedBox>

      {/* ─ Main warehouse body ─ */}
      <RoundedBox args={[7.2, 7.4, 6.6]} radius={0.25} smoothness={3} castShadow receiveShadow position={[0, 4.15, 0]}>
        <meshStandardMaterial color="#1a2535" emissive={ec} emissiveIntensity={ei * 0.35} {...m} />
      </RoundedBox>

      {/* ─ Roof panel ─ */}
      <RoundedBox args={[7.6, 0.35, 7.0]} radius={0.1} smoothness={2} castShadow position={[0, 7.95, 0]}>
        <meshStandardMaterial color="#374151" emissive={ec} emissiveIntensity={ei * 0.2} {...m} />
      </RoundedBox>

      {/* ─ Front office tower ─ */}
      <RoundedBox args={[4.6, 5.4, 2.1]} radius={0.2} smoothness={3} castShadow receiveShadow position={[0, 3.1, 3.9]}>
        <meshStandardMaterial color="#0f172a" emissive={ec} emissiveIntensity={ei * 0.4} {...m} />
      </RoundedBox>

      {/* ─ Office cornice (top trim on front tower) ─ */}
      <RoundedBox args={[4.9, 0.22, 2.4]} radius={0.06} smoothness={2} position={[0, 5.95, 3.9]}>
        <meshStandardMaterial color="#4b5563" emissive={ec} emissiveIntensity={ei * 0.2} {...m} />
      </RoundedBox>

      {/* ─ Loading dock platform ─ */}
      <RoundedBox args={[5.2, 0.55, 1.5]} radius={0.06} smoothness={2} receiveShadow position={[0, 0.7, 5.3]}>
        <meshStandardMaterial color="#334155" emissive={ec} emissiveIntensity={ei * 0.15} {...m} />
      </RoundedBox>

      {/* ─ Front windows (glass — MeshTransmissionMaterial in placed mode) ─ */}
      {[-1.45, 0, 1.45].map((x, i) => (
        <mesh key={i} position={[x, 3.5, 4.96]}>
          <boxGeometry args={[0.95, 1.35, 0.08]} />
          {isPreview ? (
            <meshStandardMaterial color="#fbbf24" emissive={emissiveColor ?? '#fbbf24'} emissiveIntensity={(ei || 0) + 0.8} transparent opacity={transparent ? opacity : 0.9} />
          ) : (
            <MeshTransmissionMaterial
              backside={false}
              samples={2}
              thickness={0.08}
              roughness={0.05}
              transmission={0.92}
              chromaticAberration={0.04}
              color="#fde68a"
              emissive="#fbbf24"
              emissiveIntensity={(ei || 0) + 0.5}
            />
          )}
        </mesh>
      ))}

      {/* ─ Wide factory windows (side of main body) ─ */}
      {[1.8, -1.8].map((x, i) => (
        <mesh key={i} position={[x, 4.5, 3.36]}>
          <boxGeometry args={[1.4, 1.8, 0.07]} />
          {isPreview ? (
            <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={(ei || 0) + 0.4} transparent opacity={transparent ? opacity : 0.85} />
          ) : (
            <MeshTransmissionMaterial
              backside={false}
              samples={2}
              thickness={0.07}
              roughness={0.08}
              transmission={0.88}
              chromaticAberration={0.03}
              color="#93c5fd"
              emissive="#3b82f6"
              emissiveIntensity={(ei || 0) + 0.3}
            />
          )}
        </mesh>
      ))}

      {/* ─ Money $ sign on facade (Float = gentle bob in placed mode) ─ */}
      {isPreview ? (
        <mesh position={[0, 5.5, 4.0]}>
          <boxGeometry args={[1.5, 1.9, 0.07]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={(ei || 0) + 1.2} transparent opacity={transparent ? opacity : 1} />
        </mesh>
      ) : (
        <Float speed={1.4} floatIntensity={0.18} rotationIntensity={0}>
          <mesh position={[0, 5.5, 4.0]}>
            <boxGeometry args={[1.5, 1.9, 0.07]} />
            <meshStandardMaterial color={accent} emissive={new THREE.Color(accent)} emissiveIntensity={(ei || 0) + 1.2} />
          </mesh>
        </Float>
      )}

      {/* ─ Side vents ─ */}
      {[0.0, 1.3, 2.6].map((z, i) => (
        <mesh key={i} position={[3.64, 2.5, z - 1.3]}>
          <boxGeometry args={[0.07, 0.22, 0.82]} />
          <meshStandardMaterial color="#6b7280" emissive={ec} emissiveIntensity={ei * 0.2} transparent={transparent} opacity={opacity} />
        </mesh>
      ))}

      {/* ─ Chimney left ─ */}
      <mesh castShadow position={[-2.2, 10.7, -2.2]}>
        <cylinderGeometry args={[0.38, 0.48, 6.8, 10]} />
        <meshStandardMaterial color="#374151" roughness={0.7} metalness={0.4} emissive={ec} emissiveIntensity={ei * 0.25} transparent={transparent} opacity={opacity} />
      </mesh>
      {/* Chimney left cap */}
      <mesh castShadow position={[-2.2, 14.2, -2.2]}>
        <cylinderGeometry args={[0.56, 0.38, 0.5, 10]} />
        <meshStandardMaterial color={accent} emissive={new THREE.Color(accent)} emissiveIntensity={(ei || 0) + 0.5} roughness={0.4} metalness={0.5} transparent={transparent} opacity={opacity} />
      </mesh>
      {/* Chimney left smoke */}
      {!isPreview && (
        <Sparkles position={[-2.2, 15.0, -2.2]} count={14} scale={[1.2, 2.2, 1.2]} size={3.5} speed={0.25} color={SMOKE_COL} opacity={0.45} />
      )}

      {/* ─ Chimney right ─ */}
      <mesh castShadow position={[2.2, 10.2, -2.2]}>
        <cylinderGeometry args={[0.38, 0.48, 5.8, 10]} />
        <meshStandardMaterial color="#374151" roughness={0.7} metalness={0.4} emissive={ec} emissiveIntensity={ei * 0.25} transparent={transparent} opacity={opacity} />
      </mesh>
      {/* Chimney right cap */}
      <mesh castShadow position={[2.2, 13.2, -2.2]}>
        <cylinderGeometry args={[0.56, 0.38, 0.5, 10]} />
        <meshStandardMaterial color={accent} emissive={new THREE.Color(accent)} emissiveIntensity={(ei || 0) + 0.5} roughness={0.4} metalness={0.5} transparent={transparent} opacity={opacity} />
      </mesh>
      {/* Chimney right smoke */}
      {!isPreview && (
        <Sparkles position={[2.2, 14.0, -2.2]} count={10} scale={[1.0, 1.8, 1.0]} size={3.0} speed={0.2} color={SMOKE_COL} opacity={0.38} />
      )}

    </group>
  );
}

// ─── Preview (placement ghost) ────────────────────────────────────────────────

const _col = new THREE.Color();

function MoneyFactoryGLTFPreview({ placementPosRef, inputRef, placementRotYRef }) {
  const { groupRef, blockedRef } = usePlacementTracker(placementPosRef, inputRef, placementRotYRef);

  // Traverse all materials each frame to pulse emissive + keep opacity
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    const hex   = blockedRef.current ? 0xff2200 : 0x00ff88;
    _col.setHex(hex);
    groupRef.current.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mat = obj.material;
      if (mat.emissive) mat.emissive.copy(_col);
      mat.emissiveIntensity = pulse * 0.5 + 0.3;
      mat.opacity = 0.82;
      mat.transparent = true;
    });
  });

  return (
    <group ref={groupRef}>
      <MoneyFactoryBody
        emissiveColor="#00ff88"
        emissiveIntensity={0.35}
        transparent
        opacity={0.82}
        isPreview
      />
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
