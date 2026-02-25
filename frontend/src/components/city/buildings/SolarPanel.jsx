import { useRef, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CityContext, SOLAR_PANEL_Y, SOLAR_PANEL_TILT_X, SOLAR_PANEL_TILT_Z } from '../CityContext.js';
import { usePlacementTracker, EnergyBadge, WorkAreaOverlay, LevelBadge, LevelRing, memo, buildingPropsEqual } from '../SharedUI.jsx';
import { ConveyorSourceRing } from '../ConveyorBelt.jsx';
import { CableSourceRing } from '../EnergyCable.jsx';
import { SOLAR_PANEL_CONFIG } from '../../items/solarPanel.js';
import { getLevelConfig } from '../../systems/upgrades.js';

// ─── Procedural mesh ──────────────────────────────────────────────────────────

export function SolarPanelBody({ emissiveColor, emissiveIntensity, opacity = 1, transparent = false, accentOverride }) {
  const m = { transparent, opacity, roughness: 0.4, metalness: 0.5 };
  const ec = emissiveColor ?? 0x000000;
  const ei = emissiveIntensity ?? 0;
  return (
    <group position={[0, SOLAR_PANEL_Y, 0]} rotation={[SOLAR_PANEL_TILT_X, 0, SOLAR_PANEL_TILT_Z]}>
      {/* Ground anchor disc */}
      <mesh receiveShadow position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 16]} />
        <meshStandardMaterial color="#475569" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.3} {...m} />
      </mesh>
      {/* Vertical mast */}
      <mesh castShadow position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.13, 0.18, 3.2, 10]} />
        <meshStandardMaterial color="#64748b" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.3} metalness={0.8} roughness={0.2} transparent={transparent} opacity={opacity} />
      </mesh>
      {/* Tilt arm */}
      <mesh castShadow position={[0, 3.1, -0.3]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.18, 0.18, 1.1]} />
        <meshStandardMaterial color="#64748b" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.3} metalness={0.8} roughness={0.2} transparent={transparent} opacity={opacity} />
      </mesh>
      {/* Panel frame — tilted 25° toward sun */}
      <group position={[0, 3.6, -0.2]} rotation={[-0.44, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[4.1, 0.12, 2.9]} />
          <meshStandardMaterial color="#334155" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.4} {...m} />
        </mesh>
        <mesh castShadow position={[0, 0.07, 0]}>
          <boxGeometry args={[3.8, 0.07, 2.6]} />
          <meshStandardMaterial color={accentOverride ?? '#0c4a6e'} emissive={new THREE.Color(accentOverride ?? emissiveColor ?? 0x0ea5e9)} emissiveIntensity={ei + 0.15} transparent={transparent} opacity={opacity} roughness={0.2} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.09, 0]}>
          <boxGeometry args={[3.8, 0.06, 0.06]} />
          <meshStandardMaterial color="#1e40af" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.5} transparent={transparent} opacity={opacity} />
        </mesh>
        {[-1.27, 0, 1.27].map((x, i) => (
          <mesh key={i} position={[x, 0.09, 0]}>
            <boxGeometry args={[0.06, 0.06, 2.6]} />
            <meshStandardMaterial color="#1e40af" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.5} transparent={transparent} opacity={opacity} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ─── Preview (placement ghost) ────────────────────────────────────────────────

function SolarPanelGLTFPreview({ placementPosRef, inputRef, placementRotYRef }) {
  const { groupRef, blockedRef } = usePlacementTracker(placementPosRef, inputRef, placementRotYRef);
  const matBody  = useRef();
  const matCell  = useRef();
  const matFrame = useRef();

  useFrame(({ clock }) => {
    const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    const col   = blockedRef.current ? 0xff2200 : 0x00aaff;
    if (matBody.current)  { matBody.current.emissive.setHex(col);  matBody.current.emissiveIntensity  = pulse * 0.4; matBody.current.opacity  = 0.82; }
    if (matCell.current)  { matCell.current.emissive.setHex(col);  matCell.current.emissiveIntensity  = pulse + 0.2; matCell.current.opacity  = 0.82; }
    if (matFrame.current) { matFrame.current.emissive.setHex(col); matFrame.current.emissiveIntensity = pulse * 0.5; matFrame.current.opacity = 0.82; }
  });

  return (
    <group ref={groupRef}>
      <group position={[0, SOLAR_PANEL_Y, 0]} rotation={[SOLAR_PANEL_TILT_X, 0, SOLAR_PANEL_TILT_Z]}>
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.7, 16]} />
          <meshStandardMaterial color="#475569" transparent opacity={0.82} />
        </mesh>
        <mesh castShadow position={[0, 1.6, 0]}>
          <cylinderGeometry args={[0.13, 0.18, 3.2, 10]} />
          <meshStandardMaterial ref={matBody} color="#64748b" emissive={new THREE.Color(0x00aaff)} emissiveIntensity={0.4} metalness={0.8} roughness={0.2} transparent opacity={0.82} />
        </mesh>
        <mesh castShadow position={[0, 3.1, -0.3]} rotation={[0.35, 0, 0]}>
          <boxGeometry args={[0.18, 0.18, 1.1]} />
          <meshStandardMaterial color="#64748b" emissive={new THREE.Color(0x00aaff)} emissiveIntensity={0.3} metalness={0.8} roughness={0.2} transparent opacity={0.82} />
        </mesh>
        <group position={[0, 3.6, -0.2]} rotation={[-0.44, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[4.1, 0.12, 2.9]} />
            <meshStandardMaterial ref={matFrame} color="#334155" emissive={new THREE.Color(0x00aaff)} emissiveIntensity={0.5} transparent opacity={0.82} roughness={0.4} metalness={0.5} />
          </mesh>
          <mesh castShadow position={[0, 0.07, 0]}>
            <boxGeometry args={[3.8, 0.07, 2.6]} />
            <meshStandardMaterial ref={matCell} color="#0c4a6e" emissive={new THREE.Color(0x00aaff)} emissiveIntensity={0.8} transparent opacity={0.82} roughness={0.2} metalness={0.1} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function SolarPanelGLTFPlaced({ position, rotation, isSelected, onSelect, onConveyorClick, isConveyorSource, onRightClick, isCableSource, onCableClick, level = 1 }) {
  const { workArea } = SOLAR_PANEL_CONFIG;
  const { placedHitRef, conveyorModeRef, rightClickHitRef, cableModeRef } = useContext(CityContext);
  const lvlConf = getLevelConfig('solar-panel', level);
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
        if (cableModeRef.current)     { onCableClick?.(); }
        else if (conveyorModeRef.current) { onConveyorClick?.(); }
        else                          { onSelect?.(); }
      }}
    >
      <group rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]}>
        <SolarPanelBody accentOverride={accent} emissiveColor={accent} emissiveIntensity={glow} />
      </group>
      <EnergyBadge itemType="solar-panel" badgeHeight={SOLAR_PANEL_CONFIG.badgeHeight} level={level} />
      <LevelBadge level={level} height={SOLAR_PANEL_CONFIG.badgeHeight + 2} />
      <LevelRing level={level} radius={4} />
      {isConveyorSource && <ConveyorSourceRing />}
      {isCableSource && <CableSourceRing />}
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

export function SolarPanelPreview({ placementPosRef, inputRef, placementRotYRef }) {
  return <SolarPanelGLTFPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />;
}

export const SolarPanelPlaced = memo(
  function SolarPanelPlaced({ position, rotation, isSelected, onSelect, onConveyorClick, isConveyorSource, onRightClick, isCableSource, onCableClick, level = 1 }) {
    return <SolarPanelGLTFPlaced position={position} rotation={rotation} isSelected={isSelected} onSelect={onSelect} onConveyorClick={onConveyorClick} isConveyorSource={isConveyorSource} onRightClick={onRightClick} isCableSource={isCableSource} onCableClick={onCableClick} level={level} />;
  },
  buildingPropsEqual,
);

