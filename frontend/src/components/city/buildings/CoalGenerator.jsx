import { Suspense, useMemo, useEffect, useRef, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { CityContext } from '../CityContext.js';
import {
  usePlacementTracker, StorageBadge, EnergyBadge, WorkAreaOverlay,
  NoPowerBadge, LevelBadge, LevelRing, LevelPlinth, memo, buildingPropsEqual,
} from '../SharedUI.jsx';
import { ConveyorSourceRing } from '../ConveyorBelt.jsx';
import { CableSourceRing } from '../EnergyCable.jsx';
import { COAL_GENERATOR_CONFIG } from '../../items/coalGenerator.js';
import { getLevelConfig } from '../../systems/upgrades.js';

const MODEL_URL = '/models/coal generator.glb';
useGLTF.preload(MODEL_URL);

// ─── Ember / spark particles ─────────────────────────────────────────────────
const EMBER_N  = 14;
const EMBER_GEO = new THREE.SphereGeometry(0.12, 4, 3);
const EMBER_MAT = new THREE.MeshStandardMaterial({
  color: '#ff6600', emissive: '#ff3300', emissiveIntensity: 1.4,
  transparent: true, opacity: 0.85, depthWrite: false,
});
const _ed = new THREE.Object3D();

function EmberParticles({ baseY = 0 }) {
  const ref   = useRef();
  const frame = useRef(0);
  const ts    = useRef(Array.from({ length: EMBER_N }, (_, i) => i / EMBER_N));

  useFrame((_, delta) => {
    if (!ref.current) return;
    frame.current++;
    if (frame.current % 2 !== 0) return;
    for (let i = 0; i < EMBER_N; i++) {
      ts.current[i] = (ts.current[i] + delta * 0.22) % 1;
      const t = ts.current[i];
      const angle  = i * 2.399 + t * 1.5;
      const spread = t * 1.2;
      _ed.position.set(
        Math.sin(angle) * spread,
        baseY + t * 4.5,
        Math.cos(angle) * spread,
      );
      const s = (1 - t) * 0.9 + 0.1;
      _ed.scale.setScalar(s);
      _ed.updateMatrix();
      ref.current.setMatrixAt(i, _ed.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[EMBER_GEO, EMBER_MAT, EMBER_N]} />;
}

// ─── GLB wrapper (placed) ────────────────────────────────────────────────────

function CoalGeneratorGLB({ accentOverride, emissiveColor, emissiveIntensity }) {
  const { scene } = useGLTF(MODEL_URL);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const fix = (mat) => {
        const m = mat.clone();
        m.clippingPlanes = [];
        return m;
      };
      obj.material = Array.isArray(obj.material) ? obj.material.map(fix) : fix(obj.material);
    });
    return clone;
  }, [scene]);

  useEffect(() => {
    const ei     = emissiveIntensity ?? 0;
    const accent = accentOverride ?? '#f97316';
    model.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (mat.emissive) {
          mat.emissive.set(ei > 0 ? (emissiveColor ?? accent) : '#000000');
          mat.emissiveIntensity = ei;
        }
        mat.needsUpdate = true;
      });
    });
  }, [model, emissiveColor, emissiveIntensity, accentOverride]);

  return (
    <group>
      <primitive
        object={model}
        scale={[1, 1, 1]}
        position={[0, 0, 0]}
        castShadow
        receiveShadow
      />
      <EmberParticles baseY={3} />
    </group>
  );
}

// ─── Procedural fallback body ─────────────────────────────────────────────────

function ProceduralBody({ emissiveColor, emissiveIntensity, opacity = 1, transparent = false, accentOverride }) {
  const m  = { transparent, opacity, roughness: 0.55, metalness: 0.4 };
  const ec = emissiveColor ?? '#000000';
  const ei = emissiveIntensity ?? 0;
  const ac = accentOverride ?? '#f97316';
  return (
    <group position={[0, 0, 0]}>
      {/* Base slab */}
      <mesh receiveShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[8, 0.4, 8]} />
        <meshStandardMaterial color="#292524" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.2} {...m} />
      </mesh>
      {/* Main boiler */}
      <mesh castShadow receiveShadow position={[0, 3.5, 0]}>
        <boxGeometry args={[6.5, 6.5, 6.5]} />
        <meshStandardMaterial color="#1c1917" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.35} {...m} />
      </mesh>
      {/* Chimney */}
      <mesh castShadow position={[0, 9.5, 0]}>
        <cylinderGeometry args={[0.55, 0.7, 5, 8]} />
        <meshStandardMaterial color="#292524" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.3} {...m} />
      </mesh>
      {/* Chimney cap glow */}
      <mesh castShadow position={[0, 12.2, 0]}>
        <cylinderGeometry args={[0.72, 0.55, 0.5, 8]} />
        <meshStandardMaterial color={ac} emissive={new THREE.Color(ac)} emissiveIntensity={ei + 0.5} {...m} />
      </mesh>
      {/* Furnace door glow */}
      <mesh position={[0, 2.5, 3.28]}>
        <boxGeometry args={[2.5, 2, 0.1]} />
        <meshStandardMaterial color={ac} emissive={new THREE.Color(ac)} emissiveIntensity={ei + 0.8} transparent opacity={opacity * 0.9} />
      </mesh>
      <EmberParticles baseY={3} />
    </group>
  );
}

export function CoalGeneratorBody({ emissiveColor, emissiveIntensity, opacity = 1, transparent = false, accentOverride, isPreview = false }) {
  if (isPreview) {
    return <ProceduralBody emissiveColor={emissiveColor} emissiveIntensity={emissiveIntensity} opacity={opacity} transparent={transparent} accentOverride={accentOverride} />;
  }
  return (
    <Suspense fallback={<ProceduralBody emissiveColor={emissiveColor} emissiveIntensity={emissiveIntensity} opacity={opacity} transparent={transparent} accentOverride={accentOverride} />}>
      <CoalGeneratorGLB emissiveColor={emissiveColor} emissiveIntensity={emissiveIntensity} accentOverride={accentOverride} />
    </Suspense>
  );
}

// ─── Placement preview ────────────────────────────────────────────────────────

const _previewCol = new THREE.Color();

function CoalGeneratorGLTFPreview({ placementPosRef, inputRef, placementRotYRef }) {
  const { groupRef, blockedRef } = usePlacementTracker(placementPosRef, inputRef, placementRotYRef);
  const { scene: rawScene }     = useGLTF(MODEL_URL);
  const previewCloneRef         = useRef(null);

  if (!previewCloneRef.current) {
    const clone = rawScene.clone(true);
    clone.traverse((obj) => {
      if (!obj.isMesh) return;
      if (Array.isArray(obj.material)) {
        obj.material = obj.material.map((m) => { const mc = m.clone(); mc.clippingPlanes = []; return mc; });
      } else if (obj.material) {
        const mc = obj.material.clone();
        mc.clippingPlanes = [];
        obj.material = mc;
      }
    });
    previewCloneRef.current = clone;
  }

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    _previewCol.setHex(blockedRef.current ? 0xff2200 : 0xff6600);
    if (previewCloneRef.current) {
      previewCloneRef.current.traverse((obj) => {
        if (!obj.isMesh || !obj.material) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((mat) => {
          if (mat.emissive) mat.emissive.copy(_previewCol);
          mat.emissiveIntensity = pulse * 0.5 + 0.3;
          mat.opacity           = 0.80;
          mat.transparent       = true;
        });
      });
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={previewCloneRef.current} scale={[1, 1, 1]} position={[0, 0, 0]} />
    </group>
  );
}

// ─── Placed building ──────────────────────────────────────────────────────────

function CoalGeneratorGLTFPlaced({
  position, rotation, isSelected, onSelect,
  onConveyorClick, isConveyorSource,
  onRightClick, isPowered,
  isCableSource, onCableClick,
  currentAmounts, level,
}) {
  const { workArea, badgeHeight } = COAL_GENERATOR_CONFIG;
  const { placedHitRef, conveyorModeRef, rightClickHitRef, cableModeRef } = useContext(CityContext);
  const lvlConf = getLevelConfig('coal-generator', level);
  const scale   = 1 + (lvlConf?.scaleBonus ?? 0);
  const accent  = lvlConf?.accentColor ?? '#f97316';
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
        if (cableModeRef.current)         { onCableClick?.(); }
        else if (conveyorModeRef.current) { onConveyorClick?.(); }
        else                              { onSelect?.(); }
      }}
    >
      <group rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]}>
        <CoalGeneratorBody accentOverride={accent} emissiveColor={accent} emissiveIntensity={glow} />
      </group>

      {/* Floating badges */}
      <EnergyBadge  itemType="coal-generator" badgeHeight={badgeHeight}       level={level} />
      <StorageBadge itemType="coal-generator" badgeHeight={badgeHeight - 2.5} currentAmounts={currentAmounts} level={level} />
      <LevelPlinth  level={level} size={5} />

      {isConveyorSource && <ConveyorSourceRing />}
      {isCableSource    && <CableSourceRing />}
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

export function CoalGeneratorPreview({ placementPosRef, inputRef, placementRotYRef }) {
  return (
    <CoalGeneratorGLTFPreview
      placementPosRef={placementPosRef}
      inputRef={inputRef}
      placementRotYRef={placementRotYRef}
    />
  );
}

export const CoalGeneratorPlaced = memo(
  function CoalGeneratorPlaced({
    position, rotation, isSelected, onSelect,
    onConveyorClick, isConveyorSource,
    onRightClick, isPowered,
    isCableSource, onCableClick,
    currentAmounts, level = 1,
  }) {
    return (
      <CoalGeneratorGLTFPlaced
        position={position}
        rotation={rotation}
        isSelected={isSelected}
        onSelect={onSelect}
        onConveyorClick={onConveyorClick}
        isConveyorSource={isConveyorSource}
        onRightClick={onRightClick}
        isPowered={isPowered}
        isCableSource={isCableSource}
        onCableClick={onCableClick}
        currentAmounts={currentAmounts}
        level={level}
      />
    );
  },
  buildingPropsEqual,
);
