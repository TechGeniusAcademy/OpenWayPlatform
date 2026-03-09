// ─── LabFactory.jsx ────────────────────────────────────────────────────────────
// Lab Factory: processes ore into ingots (iron, silver, copper).
// Recipe is chosen via right-click. Built with points, upgraded with coins.
// Receives ore from extractors via drone routes and outputs ingots.

import { Suspense, useMemo, useRef, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { usePlacementTracker, LevelBadge, memo, buildingPropsEqual } from '../SharedUI.jsx';
import { CityContext } from '../CityContext.js';

const MODEL_URL = '/models/labfactory.glb';
const SCALE     = 0.6;

useGLTF.preload(MODEL_URL);

// Recipe metadata
export const LAB_RECIPES = {
  iron:   { label: 'Железные слитки',   color: '#94a3b8', icon: '🔩', input: 'Железная руда'     },
  silver: { label: 'Серебряные слитки', color: '#e2e8f0', icon: '⚪', input: 'Серебряная руда'   },
  copper: { label: 'Медные слитки',     color: '#f97316', icon: '🟤', input: 'Медная руда'        },
};

// ─── GLB wrapper ─────────────────────────────────────────────────────────────

function LabFactoryGLB({ opacity = 1, transparent = false }) {
  const { scene } = useGLTF(MODEL_URL);
  const { model, xOffset, yOffset, zOffset } = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const fix = (mat) => {
        const m = mat.clone();
        m.clippingPlanes = [];
        if (transparent) { m.transparent = true; m.opacity = opacity; }
        return m;
      };
      obj.material = Array.isArray(obj.material)
        ? obj.material.map(fix)
        : fix(obj.material);
    });
    const box    = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    return {
      model:   clone,
      xOffset: -center.x * SCALE,
      yOffset: -box.min.y * SCALE,
      zOffset: -center.z * SCALE,
    };
  }, [scene, opacity, transparent]);

  return (
    <primitive
      object={model}
      scale={[SCALE, SCALE, SCALE]}
      position={[xOffset, yOffset, zOffset]}
      castShadow
      receiveShadow
    />
  );
}

// Fallback geometry if GLB fails to load
function LabFactoryFallback({ opacity = 1, transparent = false }) {
  const m = { transparent, opacity };
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 3, 0]}>
        <boxGeometry args={[8, 6, 8]} />
        <meshStandardMaterial color="#1e3a5f" {...m} />
      </mesh>
      <mesh castShadow position={[0, 7, 0]}>
        <cylinderGeometry args={[1, 1.5, 5, 8]} />
        <meshStandardMaterial color="#334155" {...m} />
      </mesh>
      <mesh position={[0, 9.5, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 1, 8]} />
        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.4} {...m} />
      </mesh>
    </group>
  );
}

// ─── Animated smoke/glow indicator ───────────────────────────────────────────

function ProductionIndicator({ recipe }) {
  const ref  = useRef();
  const meta = recipe ? LAB_RECIPES[recipe] : null;

  useFrame(({ clock }) => {
    if (!ref.current || !meta) return;
    const t = clock.getElapsedTime();
    ref.current.position.y = 10 + Math.sin(t * 1.5) * 0.4;
    ref.current.material.opacity = 0.6 + Math.sin(t * 2.0) * 0.2;
  });

  if (!meta) return null;

  const color = new THREE.Color(meta.color);
  return (
    <mesh ref={ref} position={[0, 10, 0]}>
      <sphereGeometry args={[0.8, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.7} depthWrite={false} />
    </mesh>
  );
}

// ─── Preview (placement ghost) ───────────────────────────────────────────────

const _labPrevCol = new THREE.Color();

function LabFactoryGLTFPreview({ placementPosRef, inputRef, placementRotYRef }) {
  const { groupRef, blockedRef } = usePlacementTracker(placementPosRef, inputRef, placementRotYRef);
  const { scene: rawScene }      = useGLTF(MODEL_URL);
  const cloneRef                 = useRef(null);
  const footRef                  = useRef();

  if (!cloneRef.current) {
    const clone = rawScene.clone(true);
    const box    = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    cloneRef.current = {
      mesh:    clone,
      xOffset: -center.x * SCALE,
      yOffset: -box.min.y * SCALE,
      zOffset: -center.z * SCALE,
    };
    clone.traverse((obj) => {
      if (!obj.isMesh) return;
      const fix = (m) => { const mc = m.clone(); mc.clippingPlanes = []; mc.transparent = true; return mc; };
      obj.material = Array.isArray(obj.material) ? obj.material.map(fix) : fix(obj.material);
    });
  }

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    _labPrevCol.setHex(blockedRef.current ? 0xff2200 : 0x22d3ee);
    cloneRef.current.mesh.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        if (m.emissive) m.emissive.copy(_labPrevCol);
        m.emissiveIntensity = pulse * 0.55 + 0.25;
        m.opacity           = 0.78;
        m.transparent       = true;
      });
    });
    if (footRef.current) footRef.current.material.opacity = 0.10 + pulse * 0.07;
  });

  return (
    <group ref={groupRef}>
      <primitive object={cloneRef.current.mesh} scale={[SCALE, SCALE, SCALE]} position={[cloneRef.current.xOffset, cloneRef.current.yOffset, cloneRef.current.zOffset]} />
      {/* Footprint overlay */}
      <mesh ref={footRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function LabFactoryPreview({ placementPosRef, inputRef, placementRotYRef }) {
  return (
    <Suspense fallback={null}>
      <LabFactoryGLTFPreview
        placementPosRef={placementPosRef}
        inputRef={inputRef}
        placementRotYRef={placementRotYRef}
      />
    </Suspense>
  );
}

// ─── Placed building ─────────────────────────────────────────────────────────

export const LabFactoryPlaced = memo(function LabFactoryPlaced({
  position,
  rotation,
  isSelected,
  onSelect,
  onConveyorClick,
  onRightClick,
  level = 1,
  recipe,
  currentAmounts = {},
  ingots = {},
}) {
  const selRef = useRef();
  const { conveyorModeRef, placedHitRef, rightClickHitRef } = useContext(CityContext);

  const handlePointerDown = (e) => {
    e.stopPropagation();
    if (e.button === 2) {
      rightClickHitRef.current = true;
      const { clientX: x, clientY: y } = e.nativeEvent;
      onRightClick?.(x, y);
      return;
    }
    placedHitRef.current = true;
    if (conveyorModeRef.current) { onConveyorClick?.(); }
    else { onSelect?.(); }
  };

  return (
    <group
      position={position}
      rotation={[0, rotation ?? 0, 0]}
      onPointerDown={handlePointerDown}
      ref={selRef}
    >
      <Suspense fallback={<LabFactoryFallback />}>
        <LabFactoryGLB />
      </Suspense>

      {/* Animated production glow */}
      <ProductionIndicator recipe={recipe} />

      {/* Level badge */}
      <LevelBadge level={level} />

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
          <ringGeometry args={[5.5, 6.2, 40]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}, buildingPropsEqual);
