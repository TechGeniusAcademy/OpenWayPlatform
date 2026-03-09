// ─── Pump.jsx ─────────────────────────────────────────────────────────────────
//
// Water pump — placed directly on a water body (lake / river).
// Acts as the source for a pump-drone route to a pump factory.
// Has a small internal water buffer that the drone picks up from.

import { Suspense, useRef, useContext } from 'react';
import { useFrame }  from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE    from 'three';
import { CityContext } from '../CityContext.js';
import {
  usePlacementTracker, StorageBadge, WorkAreaOverlay,
  LevelPlinth, memo, buildingPropsEqual,
} from '../SharedUI.jsx';
import { ConveyorSourceRing } from '../ConveyorBelt.jsx';
import { PUMP_CONFIG } from '../../items/pump.js';
import { findNearestWater } from '../../systems/waterRegistry.js';
import { FaExclamationTriangle } from 'react-icons/fa';

const MODEL_URL = '/models/pump.glb';
useGLTF.preload(MODEL_URL);

const SCALE = 0.05;
const _previewCol = new THREE.Color();

// ─── GLB wrapper ──────────────────────────────────────────────────────────────

function PumpGLB() {
  const { scene } = useGLTF(MODEL_URL);
  const ref = useRef(null);
  if (!ref.current) {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const fix = (m) => { const mc = m.clone(); mc.clippingPlanes = []; return mc; };
      obj.material = Array.isArray(obj.material) ? obj.material.map(fix) : fix(obj.material);
    });
    const box = new THREE.Box3().setFromObject(clone);
    ref.current = { mesh: clone, y: -box.min.y * SCALE };
  }
  return (
    <primitive
      object={ref.current.mesh}
      scale={[SCALE, SCALE, SCALE]}
      position={[0, ref.current.y, 0]}
      castShadow
      receiveShadow
    />
  );
}

// ─── Placement preview ────────────────────────────────────────────────────────

function PumpPreviewInner({ placementPosRef, inputRef, placementRotYRef }) {
  const { groupRef, blockedRef } = usePlacementTracker(placementPosRef, inputRef, placementRotYRef);
  const { scene: rawScene }      = useGLTF(MODEL_URL);
  const previewRef               = useRef(null);
  const noWaterRef               = useRef(true);
  const hintDivRef               = useRef(null);

  if (!previewRef.current) {
    const clone = rawScene.clone(true);
    const box   = new THREE.Box3().setFromObject(clone);
    previewRef.current = { mesh: clone, y: -box.min.y * SCALE };
    clone.traverse((obj) => {
      if (!obj.isMesh) return;
      const fix = (m) => { const mc = m.clone(); mc.clippingPlanes = []; return mc; };
      obj.material = Array.isArray(obj.material) ? obj.material.map(fix) : fix(obj.material);
    });
  }

  useFrame(({ clock }) => {
    const pos = placementPosRef.current;
    if (pos) {
      const nearWater    = findNearestWater(pos.x, pos.z);
      noWaterRef.current = !nearWater;
      if (!nearWater) blockedRef.current = true;
      if (hintDivRef.current) {
        if (!nearWater) {
          hintDivRef.current.textContent = '! Только на водоём';
          hintDivRef.current.style.color = '#f87171';
        } else {
          hintDivRef.current.textContent = '💧 Водоём обнаружен';
          hintDivRef.current.style.color = '#4ade80';
        }
      }
    }
    const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    _previewCol.setHex(noWaterRef.current ? 0xcc0000 : blockedRef.current ? 0xff6600 : 0x0088ff);
    if (previewRef.current) {
      previewRef.current.mesh.traverse((obj) => {
        if (!obj.isMesh || !obj.material) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((mat) => {
          if (mat.emissive) mat.emissive.copy(_previewCol);
          mat.emissiveIntensity = pulse * 0.5 + 0.3;
          mat.opacity     = 0.78;
          mat.transparent = true;
        });
      });
    }
  });

  return (
    <group ref={groupRef}>
      <primitive
        object={previewRef.current.mesh}
        scale={[SCALE, SCALE, SCALE]}
        position={[0, previewRef.current?.y ?? 0, 0]}
      />
      <Html position={[0, 5.0, 0]} center distanceFactor={28} zIndexRange={[10, 11]} style={{ pointerEvents: 'none' }}>
        <div
          ref={hintDivRef}
          style={{
            background:   'rgba(0,0,0,0.82)',
            border:       '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6,
            padding:      '2px 10px',
            fontSize:     12,
            fontFamily:   'monospace',
            fontWeight:   700,
            color:        '#f87171',
            whiteSpace:   'nowrap',
            userSelect:   'none',
          }}
        >
          <FaExclamationTriangle style={{ marginRight: 4, verticalAlign: 'middle' }} /> Только на водоём
        </div>
      </Html>
    </group>
  );
}

// ─── Placed building ──────────────────────────────────────────────────────────

function PumpGLTFPlaced({
  position, rotation, isSelected, onSelect,
  onConveyorClick, isConveyorSource,
  onRightClick,
  currentAmounts = {}, level = 1,
}) {
  const { placedHitRef, conveyorModeRef, rightClickHitRef } = useContext(CityContext);

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
      <group rotation={[0, rotation || 0, 0]}>
        <Suspense fallback={null}>
          <PumpGLB />
        </Suspense>
      </group>

      <StorageBadge itemType="pump" badgeHeight={PUMP_CONFIG.badgeHeight} currentAmounts={currentAmounts} level={level} />
      <LevelPlinth level={level} size={2.5} />
      {isConveyorSource && <ConveyorSourceRing />}

      {isSelected && (
        <WorkAreaOverlay
          width={PUMP_CONFIG.workArea.width}
          depth={PUMP_CONFIG.workArea.depth}
          color={PUMP_CONFIG.workArea.color}
          opacity={PUMP_CONFIG.workArea.opacity}
        />
      )}
    </group>
  );
}

// ─── Public exports ───────────────────────────────────────────────────────────

export function PumpPreview({ placementPosRef, inputRef, placementRotYRef }) {
  return (
    <PumpPreviewInner
      placementPosRef={placementPosRef}
      inputRef={inputRef}
      placementRotYRef={placementRotYRef}
    />
  );
}

export const PumpPlaced = memo(
  function PumpPlacedBase(props) { return <PumpGLTFPlaced {...props} />; },
  buildingPropsEqual,
);
