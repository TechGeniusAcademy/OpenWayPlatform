// ─── SteamGenerator.jsx ───────────────────────────────────────────────────────
//
// Visual component for the Steam Generator building.
// Accepts: coal (ore) from Extractor + water from PumpFactory via drones.
// Produces: electricity (solar-type zone) + steam stored locally.
// Ratio: 2 coal + 1 water → 100 кВт/ч + 1 steam.

import { Suspense, useMemo, useEffect, useRef, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { CityContext } from '../CityContext.js';
import {
  usePlacementTracker, StorageBadge, EnergyBadge, WorkAreaOverlay,
  NoPowerBadge, LevelPlinth, memo, buildingPropsEqual,
} from '../SharedUI.jsx';
import { ConveyorSourceRing } from '../ConveyorBelt.jsx';
import { STEAM_GENERATOR_CONFIG } from '../../items/steamGenerator.js';
import { getLevelConfig }         from '../../systems/upgrades.js';

const MODEL_URL = '/models/steamgenerator.glb';
useGLTF.preload(MODEL_URL);

const SCALE = 1.0;

// ─── Steam particle system ────────────────────────────────────────────────────
const STEAM_N   = 16;
const STEAM_GEO = new THREE.SphereGeometry(0.22, 5, 4);
const STEAM_MAT = new THREE.MeshStandardMaterial({
  color: '#c4b5fd', emissive: '#7c3aed', emissiveIntensity: 0.6,
  transparent: true, opacity: 0.55, depthWrite: false,
});
const _sd = new THREE.Object3D();

function SteamParticles({ baseY = 0 }) {
  const ref  = useRef();
  const ts   = useRef(Array.from({ length: STEAM_N }, (_, i) => i / STEAM_N));

  useFrame((_, delta) => {
    if (!ref.current) return;
    for (let i = 0; i < STEAM_N; i++) {
      ts.current[i] = (ts.current[i] + delta * 0.15) % 1;
      const t     = ts.current[i];
      const angle = i * 2.399 + t * 1.2;
      const spread = t * 0.8;
      _sd.position.set(
        Math.sin(angle) * spread,
        baseY + t * 6.0,
        Math.cos(angle) * spread,
      );
      const s = (1 - t) * 1.1 + 0.2;
      _sd.scale.setScalar(s);
      _sd.updateMatrix();
      ref.current.setMatrixAt(i, _sd.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[STEAM_GEO, STEAM_MAT, STEAM_N]} />;
}

// ─── GLB wrapper ──────────────────────────────────────────────────────────────
function SteamGeneratorGLB({ accentOverride, emissiveIntensity }) {
  const { scene } = useGLTF(MODEL_URL);
  const { model, yOffset } = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const fix = (mat) => { const m = mat.clone(); m.clippingPlanes = []; return m; };
      obj.material = Array.isArray(obj.material) ? obj.material.map(fix) : fix(obj.material);
    });
    const box = new THREE.Box3().setFromObject(clone);
    return { model: clone, yOffset: -box.min.y * SCALE };
  }, [scene]);

  useEffect(() => {
    const ei     = emissiveIntensity ?? 0;
    const accent = accentOverride ?? '#a78bfa';
    model.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (mat.emissive) {
          mat.emissive.set(ei > 0 ? accent : '#000000');
          mat.emissiveIntensity = ei;
        }
        mat.needsUpdate = true;
      });
    });
  }, [model, emissiveIntensity, accentOverride]);

  return (
    <group>
      <primitive object={model} scale={[SCALE, SCALE, SCALE]} position={[0, yOffset, 0]} castShadow receiveShadow />
      <SteamParticles baseY={3} />
    </group>
  );
}

// ─── Procedural fallback ──────────────────────────────────────────────────────
function ProceduralBody({ accentOverride, emissiveIntensity, opacity = 1, transparent = false }) {
  const ac = accentOverride ?? '#a78bfa';
  const ei = emissiveIntensity ?? 0;
  const m  = { transparent, opacity, roughness: 0.45, metalness: 0.55 };
  return (
    <group>
      {/* Base */}
      <mesh receiveShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[8, 0.4, 8]} />
        <meshStandardMaterial color="#1e1b4b" {...m} />
      </mesh>
      {/* Boiler drum */}
      <mesh castShadow receiveShadow position={[0, 4, 0]}>
        <cylinderGeometry args={[2.8, 3.2, 7, 12]} />
        <meshStandardMaterial color="#312e81" emissive={new THREE.Color(ac)} emissiveIntensity={ei * 0.3} {...m} />
      </mesh>
      {/* Steam chimney */}
      <mesh castShadow position={[0, 10, 0]}>
        <cylinderGeometry args={[0.6, 0.8, 5, 8]} />
        <meshStandardMaterial color="#1e1b4b" emissive={new THREE.Color(ac)} emissiveIntensity={ei * 0.25} {...m} />
      </mesh>
      {/* Chimney glow cap */}
      <mesh position={[0, 13, 0]}>
        <cylinderGeometry args={[0.82, 0.6, 0.6, 8]} />
        <meshStandardMaterial color={ac} emissive={new THREE.Color(ac)} emissiveIntensity={ei + 0.5} {...m} />
      </mesh>
      {/* Intake pipe - left */}
      <mesh castShadow position={[-3.6, 2.5, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 4.5, 7]} />
        <meshStandardMaterial color="#374151" {...m} />
      </mesh>
      {/* Intake pipe - right */}
      <mesh castShadow position={[3.6, 2.5, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 4.5, 7]} />
        <meshStandardMaterial color="#374151" {...m} />
      </mesh>
      <SteamParticles baseY={4} />
    </group>
  );
}

export function SteamGeneratorBody({ accentOverride, emissiveIntensity, opacity = 1, transparent = false, isPreview = false }) {
  if (isPreview) {
    return <ProceduralBody accentOverride={accentOverride} emissiveIntensity={emissiveIntensity} opacity={opacity} transparent={transparent} />;
  }
  return (
    <Suspense fallback={<ProceduralBody accentOverride={accentOverride} emissiveIntensity={emissiveIntensity} opacity={opacity} transparent={transparent} />}>
      <SteamGeneratorGLB accentOverride={accentOverride} emissiveIntensity={emissiveIntensity} />
    </Suspense>
  );
}

// ─── Placement preview ────────────────────────────────────────────────────────
const _previewCol = new THREE.Color();

function SteamGeneratorGLTFPreview({ placementPosRef, inputRef, placementRotYRef }) {
  const { groupRef, blockedRef } = usePlacementTracker(placementPosRef, inputRef, placementRotYRef);
  const { scene: rawScene }     = useGLTF(MODEL_URL);
  const previewCloneRef         = useRef(null);

  if (!previewCloneRef.current) {
    const clone = rawScene.clone(true);
    const box   = new THREE.Box3().setFromObject(clone);
    previewCloneRef.current = { mesh: clone, y: -box.min.y * SCALE };
    clone.traverse((obj) => {
      if (!obj.isMesh) return;
      if (Array.isArray(obj.material)) {
        obj.material = obj.material.map((m) => { const mc = m.clone(); mc.clippingPlanes = []; return mc; });
      } else if (obj.material) {
        const mc = obj.material.clone(); mc.clippingPlanes = []; obj.material = mc;
      }
    });
  }

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    _previewCol.setHex(blockedRef.current ? 0xff2200 : 0x7c3aed);
    previewCloneRef.current.mesh.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (mat.emissive) mat.emissive.copy(_previewCol);
        mat.emissiveIntensity = pulse * 0.5 + 0.3;
        mat.opacity           = 0.80;
        mat.transparent       = true;
      });
    });
  });

  return (
    <group ref={groupRef}>
      <primitive object={previewCloneRef.current.mesh} scale={[SCALE, SCALE, SCALE]} position={[0, previewCloneRef.current.y, 0]} />
    </group>
  );
}

// ─── Placed building ──────────────────────────────────────────────────────────
function SteamGeneratorGLTFPlaced({
  position, rotation, isSelected, onSelect,
  onConveyorClick, isConveyorSource,
  onRightClick, isPowered,
  currentAmounts, level,
}) {
  const { workArea, badgeHeight } = STEAM_GENERATOR_CONFIG;
  const { placedHitRef, conveyorModeRef, rightClickHitRef } = useContext(CityContext);
  const lvlConf = getLevelConfig('steam-generator', level);
  const scale   = 1 + (lvlConf?.scaleBonus ?? 0);
  const accent  = lvlConf?.accentColor ?? '#a78bfa';
  const glow    = lvlConf?.glowIntensity ?? 0;

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
        if (conveyorModeRef.current) { onConveyorClick?.(); }
        else                         { onSelect?.(); }
      }}
    >
      <group rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]}>
        <SteamGeneratorBody accentOverride={accent} emissiveIntensity={glow} />
      </group>

      <EnergyBadge  itemType="steam-generator" badgeHeight={badgeHeight}       level={level} />
      <StorageBadge itemType="steam-generator" badgeHeight={badgeHeight - 2.5} currentAmounts={currentAmounts} level={level} />
      <LevelPlinth  level={level} size={5} />

      {isConveyorSource && <ConveyorSourceRing />}
      {isPowered === false && <NoPowerBadge badgeHeight={badgeHeight} />}

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

// ─── Public exports ───────────────────────────────────────────────────────────
export function SteamGeneratorPreview({ placementPosRef, inputRef, placementRotYRef }) {
  return (
    <SteamGeneratorGLTFPreview
      placementPosRef={placementPosRef}
      inputRef={inputRef}
      placementRotYRef={placementRotYRef}
    />
  );
}

export const SteamGeneratorPlaced = memo(
  function SteamGeneratorPlaced({
    position, rotation, isSelected, onSelect,
    onConveyorClick, isConveyorSource,
    onRightClick, isPowered,
    currentAmounts, level = 1,
  }) {
    return (
      <SteamGeneratorGLTFPlaced
        position={position}
        rotation={rotation}
        isSelected={isSelected}
        onSelect={onSelect}
        onConveyorClick={onConveyorClick}
        isConveyorSource={isConveyorSource}
        onRightClick={onRightClick}
        isPowered={isPowered}
        currentAmounts={currentAmounts}
        level={level}
      />
    );
  },
  buildingPropsEqual,
);
