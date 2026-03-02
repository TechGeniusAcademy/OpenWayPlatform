import { Suspense, useMemo, useRef, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { CityContext } from '../CityContext.js';
import {
  usePlacementTracker, LevelBadge, LevelPlinth,
  memo, buildingPropsEqual, WorkAreaOverlay,
} from '../SharedUI.jsx';
import { HANGAR_CONFIG } from '../../items/hangar.js';
import { getLevelConfig } from '../../systems/upgrades.js';

const HANGAR_URL   = '/models/Military Tent.glb';
useGLTF.preload(HANGAR_URL);

const SCALE = 1.5;

// ─── GLB wrapper (placed) ────────────────────────────────────────────────────

function HangarGLB() {
  const { scene } = useGLTF(HANGAR_URL);
  const { model, yOffset } = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const fix = (mat) => {
        const m = mat.clone();
        m.clippingPlanes = [];
        return m;
      };
      obj.material = Array.isArray(obj.material)
        ? obj.material.map(fix)
        : fix(obj.material);
    });
    const box = new THREE.Box3().setFromObject(clone);
    const offset = -box.min.y * SCALE;
    return { model: clone, yOffset: offset };
  }, [scene]);

  return (
    <primitive
      object={model}
      scale={[SCALE, SCALE, SCALE]}
      position={[0, yOffset, 0]}
      castShadow
      receiveShadow
    />
  );
}

// ─── Procedural fallback ──────────────────────────────────────────────────────

function HangarProceduralBody({ opacity = 1, transparent = false }) {
  const m = { transparent, opacity, roughness: 0.4, metalness: 0.6 };
  return (
    <group>
      {/* Main tent body */}
      <mesh castShadow receiveShadow position={[0, 3.5, 0]}>
        <boxGeometry args={[10, 7, 8]} />
        <meshStandardMaterial color="#475569" {...m} />
      </mesh>
      {/* Roof ridge */}
      <mesh castShadow position={[0, 7.5, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[2.2, 2.2, 10, 5, 1, false, Math.PI * 0.5, Math.PI]} />
        <meshStandardMaterial color="#334155" {...m} />
      </mesh>
      {/* Door opening */}
      <mesh position={[5.01, 2.5, 0]}>
        <boxGeometry args={[0.2, 5, 5]} />
        <meshStandardMaterial color="#1e293b" {...m} />
      </mesh>
    </group>
  );
}

// ─── Tarmac platform rendered alongside the hangar ───────────────────────────

function TarmacPlatform({ maxSlots }) {
  const W = 6 + maxSlots * 5;
  return (
    <group position={[HANGAR_CONFIG.platformOffsetX, 0.05, 0]}>
      {/* Base tarmac slab */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, 10]} />
        <meshStandardMaterial color="#1e293b" roughness={0.85} metalness={0.05} />
      </mesh>
      {/* Yellow taxiway lines */}
      {Array.from({ length: maxSlots }).map((_, i) => {
        const slotX = -W / 2 + 3 + i * 5;
        return (
          <mesh key={i} receiveShadow rotation={[-Math.PI / 2, 0, 0]}
            position={[slotX, 0.01, 0]}>
            <planeGeometry args={[0.25, 9.5]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.9} />
          </mesh>
        );
      })}
      {/* Perimeter border */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[W / 2 - 0.1, W / 2, 4]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ─── Hangar body (GLB with procedural fallback) ───────────────────────────────

export function HangarBody({ opacity = 1, transparent = false, isPreview = false }) {
  if (isPreview) {
    return <HangarProceduralBody opacity={opacity} transparent={transparent} />;
  }
  return (
    <Suspense fallback={<HangarProceduralBody opacity={opacity} transparent={transparent} />}>
      <HangarGLB />
    </Suspense>
  );
}

// ─── Placement preview ────────────────────────────────────────────────────────

const _previewCol = new THREE.Color();

function HangarGLTFPreview({ placementPosRef, inputRef, placementRotYRef }) {
  const { groupRef, blockedRef } = usePlacementTracker(placementPosRef, inputRef, placementRotYRef);
  const { scene: rawScene }     = useGLTF(HANGAR_URL);
  const previewCloneRef         = useRef(null);

  if (!previewCloneRef.current) {
    const clone = rawScene.clone(true);
    const box   = new THREE.Box3().setFromObject(clone);
    const yOff  = -box.min.y * SCALE;
    previewCloneRef.current = { mesh: clone, y: yOff };
    clone.traverse((obj) => {
      if (!obj.isMesh) return;
      if (Array.isArray(obj.material)) {
        obj.material = obj.material.map((m) => {
          const mc = m.clone(); mc.clippingPlanes = []; return mc;
        });
      } else if (obj.material) {
        const mc = obj.material.clone();
        mc.clippingPlanes = [];
        obj.material = mc;
      }
    });
  }

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    _previewCol.setHex(blockedRef.current ? 0xff2200 : 0x6366f1);
    if (previewCloneRef.current) {
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
    }
  });

  // Platform ghost — always 1 slot in preview (level unknown)
  const platformW = 6 + 1 * 5;

  return (
    <group ref={groupRef}>
      <primitive
        object={previewCloneRef.current.mesh}
        scale={[SCALE, SCALE, SCALE]}
        position={[0, previewCloneRef.current?.y ?? 0, 0]}
      />
      {/* Platform footprint overlay */}
      <mesh
        position={[HANGAR_CONFIG.platformOffsetX, 0.06, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[platformW, 14]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.25} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ─── Placed building ──────────────────────────────────────────────────────────

function HangarGLTFPlaced({
  position, rotation, isSelected, onSelect,
  onRightClick, level,
}) {
  const { workArea, badgeHeight } = HANGAR_CONFIG;
  const { placedHitRef, rightClickHitRef } = useContext(CityContext);
  const lvlConf  = getLevelConfig('hangar', level);
  const maxSlots = HANGAR_CONFIG.maxFightersPerLevel[Math.min(level, 3) - 1] ?? 1;

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
        onSelect?.();
      }}
    >
      <group rotation={[0, rotation || 0, 0]}>
        <HangarBody />
        <TarmacPlatform maxSlots={maxSlots} />
      </group>

      {/* Level badge */}
      <LevelBadge level={level} badgeHeight={badgeHeight} />
      <LevelPlinth level={level} size={7} />

      {isSelected && (
        <>
          {/* Main hangar zone */}
          <WorkAreaOverlay
            width={workArea.width}
            depth={workArea.depth}
            color={workArea.color}
            opacity={workArea.opacity}
          />
          {/* Platform zone — centred on the tarmac */}
          <group position={[HANGAR_CONFIG.platformOffsetX, 0, 0]}>
            <WorkAreaOverlay
              width={6 + maxSlots * 5 + 4}
              depth={14}
              color="#fbbf24"
              opacity={0.10}
            />
          </group>
        </>
      )}
    </group>
  );
}

// ─── Public exports ───────────────────────────────────────────────────────────

export function HangarPreview({ placementPosRef, inputRef, placementRotYRef }) {
  return (
    <HangarGLTFPreview
      placementPosRef={placementPosRef}
      inputRef={inputRef}
      placementRotYRef={placementRotYRef}
    />
  );
}

export const HangarPlaced = memo(
  function HangarPlaced({
    position, rotation, isSelected, onSelect,
    onRightClick, level = 1,
  }) {
    return (
      <HangarGLTFPlaced
        position={position}
        rotation={rotation}
        isSelected={isSelected}
        onSelect={onSelect}
        onRightClick={onRightClick}
        level={level}
      />
    );
  },
  buildingPropsEqual,
);
