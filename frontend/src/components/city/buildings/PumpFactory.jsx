// ─── PumpFactory.jsx ──────────────────────────────────────────────────────────
//
// Pump Factory (Насосная станция) — stores water received from pumps via
// pump drones. Requires energy to operate. Upgradeable to 5 levels with
// increasing water tank capacity: 200 / 400 / 800 / 1 200 / 1 500 litres.

import { Suspense, useRef, useContext } from 'react';
import { useFrame }  from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE    from 'three';
import { CityContext } from '../CityContext.js';
import {
  usePlacementTracker, StorageBadge, WorkAreaOverlay,
  NoPowerBadge, LevelPlinth, memo, buildingPropsEqual,
} from '../SharedUI.jsx';
import { getLevelConfig } from '../../systems/upgrades.js';
import { PUMP_FACTORY_CONFIG } from '../../items/pumpFactory.js';
import { FaTint } from 'react-icons/fa';

const MODEL_URL = '/models/pumpfactory.glb';
useGLTF.preload(MODEL_URL);

const SCALE = 1;
const _previewCol = new THREE.Color();

// ─── Water level indicator badge ─────────────────────────────────────────────

function WaterLevelBadge({ currentAmounts, level, badgeHeight }) {
  const conf     = getLevelConfig('pump-factory', level);
  const capacity = conf?.waterCapacity ?? PUMP_FACTORY_CONFIG.baseCapacity;
  const current  = currentAmounts?.water ?? 0;
  const pct      = Math.min(100, Math.round((current / capacity) * 100));
  const accent   = conf?.accentColor ?? '#38bdf8';

  return (
    <Html
      position={[0, badgeHeight + 3.5, 0]}
      center
      distanceFactor={35}
      zIndexRange={[10, 11]}
      style={{ pointerEvents: 'none' }}
    >
      <div style={{
        background:   'rgba(0,0,0,0.88)',
        border:       `1px solid ${accent}50`,
        borderTop:    `2px solid ${accent}`,
        borderRadius: 8,
        padding:      '3px 10px',
        fontSize:     12,
        fontFamily:   'monospace',
        fontWeight:   700,
        color:        accent,
        whiteSpace:   'nowrap',
        userSelect:   'none',
        minWidth:     110,
      }}>
        <FaTint style={{ color: accent, verticalAlign: 'middle', marginRight: 4 }} />
        {Math.round(current)} / {capacity} л
        <div style={{ height: 4, background: '#1e3a5f', borderRadius: 3, marginTop: 3 }}>
          <div style={{
            height:       '100%',
            width:        `${pct}%`,
            background:   accent,
            borderRadius: 3,
            transition:   'width 1s',
          }} />
        </div>
      </div>
    </Html>
  );
}

// ─── GLB wrapper ──────────────────────────────────────────────────────────────

function PumpFactoryGLB({ emissiveColor, emissiveIntensity }) {
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

  // Apply emissive from level config
  const ei     = emissiveIntensity ?? 0;
  const eColor = emissiveColor     ?? '#000000';
  if (ref.current) {
    ref.current.mesh.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (mat.emissive) {
          mat.emissive.set(ei > 0 ? eColor : '#000000');
          mat.emissiveIntensity = ei;
        }
      });
    });
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

function PumpFactoryPreviewInner({ placementPosRef, inputRef, placementRotYRef }) {
  const { groupRef, blockedRef } = usePlacementTracker(placementPosRef, inputRef, placementRotYRef);
  const { scene: rawScene }      = useGLTF(MODEL_URL);
  const previewRef               = useRef(null);

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
    const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    _previewCol.setHex(blockedRef.current ? 0xff2200 : 0x0088ff);
    if (previewRef.current) {
      previewRef.current.mesh.traverse((obj) => {
        if (!obj.isMesh || !obj.material) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((mat) => {
          if (mat.emissive) mat.emissive.copy(_previewCol);
          mat.emissiveIntensity = pulse * 0.5 + 0.3;
          mat.opacity     = 0.80;
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
    </group>
  );
}

// ─── Placed building ──────────────────────────────────────────────────────────

function PumpFactoryGLTFPlaced({
  position, rotation, isSelected, onSelect,
  onConveyorClick, isConveyorSource,
  onRightClick, isPowered,
  currentAmounts = {}, level = 1,
}) {
  const { placedHitRef, conveyorModeRef, rightClickHitRef } = useContext(CityContext);
  const lvlConf = getLevelConfig('pump-factory', level);
  const scale   = 1 + (lvlConf?.scaleBonus    ?? 0);
  const accent  = lvlConf?.accentColor ?? '#38bdf8';
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
        <Suspense fallback={null}>
          <PumpFactoryGLB emissiveColor={accent} emissiveIntensity={glow} />
        </Suspense>
      </group>

      <WaterLevelBadge currentAmounts={currentAmounts} level={level} badgeHeight={PUMP_FACTORY_CONFIG.badgeHeight} />
      <StorageBadge itemType="pump-factory" badgeHeight={PUMP_FACTORY_CONFIG.badgeHeight} currentAmounts={currentAmounts} level={level} />
      <LevelPlinth level={level} size={4} />
      {isPowered === false && <NoPowerBadge badgeHeight={PUMP_FACTORY_CONFIG.badgeHeight} />}

      {isSelected && (
        <WorkAreaOverlay
          width={PUMP_FACTORY_CONFIG.workArea.width}
          depth={PUMP_FACTORY_CONFIG.workArea.depth}
          color={PUMP_FACTORY_CONFIG.workArea.color}
          opacity={PUMP_FACTORY_CONFIG.workArea.opacity}
        />
      )}
    </group>
  );
}

// ─── Public exports ───────────────────────────────────────────────────────────

export function PumpFactoryPreview({ placementPosRef, inputRef, placementRotYRef }) {
  return (
    <PumpFactoryPreviewInner
      placementPosRef={placementPosRef}
      inputRef={inputRef}
      placementRotYRef={placementRotYRef}
    />
  );
}

export const PumpFactoryPlaced = memo(
  function PumpFactoryPlacedBase(props) { return <PumpFactoryGLTFPlaced {...props} />; },
  buildingPropsEqual,
);
