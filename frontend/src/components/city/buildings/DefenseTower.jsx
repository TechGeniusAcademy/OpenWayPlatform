// ─── DefenseTower.jsx ─────────────────────────────────────────────────────────
//
// Defense Tower: no resource consumption, works 2 real hours from placement.
// Displays a large animated semi-transparent protective dome.

import { Suspense, useMemo, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CityContext } from '../CityContext.js';
import { useContext } from 'react';
import { usePlacementTracker, memo, buildingPropsEqual } from '../SharedUI.jsx';
import { FaShieldAlt } from 'react-icons/fa';

const MODEL_URL      = '/models/defensetower.glb';
export const DOME_DURATION_MS = 2 * 60 * 60 * 1000; // 2 real hours
const DOME_RADIUS    = 96;
const SCALE          = 4.0;

useGLTF.preload(MODEL_URL);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRemaining(ms) {
  if (ms <= 0) return 'Неактивно';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h > 0 ? h + 'ч ' : ''}${String(m).padStart(2, '0')}м ${String(s).padStart(2, '0')}с`;
}

// ─── Animated protection dome ─────────────────────────────────────────────────

function ProtectionDome({ position }) {
  const domeRef  = useRef();
  const ring1Ref = useRef();
  const ring2Ref = useRef();
  const ring3Ref = useRef();

  useFrame(({ clock }) => {
    const t     = clock.getElapsedTime();
    const pulse = (Math.sin(t * 1.4) + 1) / 2; // 0..1

    if (domeRef.current) {
      domeRef.current.material.opacity = 0.06 + pulse * 0.05;
      const s = 1 + pulse * 0.015;
      domeRef.current.scale.setScalar(s);
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.y = t * 0.28;
      ring1Ref.current.material.opacity = 0.18 + pulse * 0.14;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -t * 0.18;
      ring2Ref.current.material.opacity = 0.12 + pulse * 0.10;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.y = t * 0.10;
      ring3Ref.current.material.opacity = 0.10 + pulse * 0.08;
    }
  });

  return (
    <group position={[position[0], 0, position[2]]}>
      {/* Main hemisphere dome */}
      <mesh ref={domeRef}>
        <sphereGeometry args={[DOME_RADIUS, 40, 28, 0, Math.PI * 2, 0, Math.PI / 2 + 0.12]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.09} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Equatorial ring — flat */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[DOME_RADIUS, 0.18, 5, 90]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      {/* Tilted orbital ring 1 */}
      <mesh ref={ring2Ref} rotation={[Math.PI / 4, 0.4, 0]}>
        <torusGeometry args={[DOME_RADIUS * 0.76, 0.12, 5, 80]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      {/* Tilted orbital ring 2 */}
      <mesh ref={ring3Ref} rotation={[-Math.PI / 5, 1.1, 0]}>
        <torusGeometry args={[DOME_RADIUS * 0.58, 0.10, 5, 70]} />
        <meshBasicMaterial color="#a5f3fc" transparent opacity={0.14} depthWrite={false} />
      </mesh>
      {/* Ground circle edge-glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[DOME_RADIUS - 0.5, DOME_RADIUS + 0.5, 80]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ─── Countdown badge ──────────────────────────────────────────────────────────

function CountdownBadge({ activatedAt }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, activatedAt + DOME_DURATION_MS - Date.now())
  );

  useEffect(() => {
    if (!activatedAt) return;
    const tick = () => setRemaining(Math.max(0, activatedAt + DOME_DURATION_MS - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activatedAt]);

  const active  = remaining > 0;
  const percent = activatedAt ? Math.max(0, remaining / DOME_DURATION_MS) : 0;
  const color   = active ? '#22d3ee' : '#64748b';

  return (
    <Html position={[0, 9, 0]} center distanceFactor={38} zIndexRange={[10, 11]} style={{ pointerEvents: 'none' }}>
      <div style={{
        background: 'rgba(0,0,0,0.78)',
        border: `1px solid ${color}55`,
        borderRadius: 10,
        padding: '4px 10px',
        fontSize: 12,
        fontFamily: 'monospace',
        fontWeight: 700,
        color,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexDirection: 'column',
        minWidth: 110,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <FaShieldAlt style={{ fontSize: 10 }} />
          {formatRemaining(remaining)}
        </div>
        {/* progress bar */}
        <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
          <div style={{
            height: '100%',
            width: `${percent * 100}%`,
            background: active ? `linear-gradient(90deg, #0ea5e9, #22d3ee)` : '#374151',
            borderRadius: 2,
            transition: 'width 1s linear',
          }} />
        </div>
      </div>
    </Html>
  );
}

// ─── GLB wrapper ──────────────────────────────────────────────────────────────

function DefenseTowerGLB() {
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

  return <primitive object={model} scale={[SCALE, SCALE, SCALE]} position={[0, yOffset, 0]} castShadow receiveShadow />;
}

// ─── Procedural fallback ──────────────────────────────────────────────────────

function ProceduralBody({ opacity = 1, transparent = false }) {
  const m = { transparent, opacity, roughness: 0.3, metalness: 0.7 };
  return (
    <group>
      <mesh receiveShadow position={[0, 0.2, 0]}>
        <cylinderGeometry args={[3.2, 3.8, 0.4, 10]} />
        <meshStandardMaterial color="#1e293b" {...m} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 4.0, 0]}>
        <cylinderGeometry args={[1.0, 1.6, 7.5, 8]} />
        <meshStandardMaterial color="#0f172a" emissive={new THREE.Color('#0ea5e9')} emissiveIntensity={0.35} {...m} />
      </mesh>
      <mesh castShadow position={[0, 8.4, 0]}>
        <sphereGeometry args={[1.45, 12, 10]} />
        <meshStandardMaterial color="#0ea5e9" emissive={new THREE.Color('#38bdf8')} emissiveIntensity={0.8} {...m} />
      </mesh>
      {/* 4 antennas */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        return (
          <mesh key={i} castShadow position={[Math.cos(angle) * 1.1, 7.4, Math.sin(angle) * 1.1]}>
            <cylinderGeometry args={[0.09, 0.09, 2.2, 5]} />
            <meshStandardMaterial color="#38bdf8" emissive={new THREE.Color('#22d3ee')} emissiveIntensity={0.6} {...m} />
          </mesh>
        );
      })}
    </group>
  );
}

function DefenseTowerBody({ isPreview = false, opacity = 1, transparent = false }) {
  if (isPreview) return <ProceduralBody opacity={opacity} transparent={transparent} />;
  return (
    <Suspense fallback={<ProceduralBody opacity={opacity} transparent={transparent} />}>
      <DefenseTowerGLB />
    </Suspense>
  );
}

// ─── Placement preview ────────────────────────────────────────────────────────

const _prevCol = new THREE.Color();

function DefenseTowerGLTFPreview({ placementPosRef, inputRef, placementRotYRef }) {
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

  // Dome circle preview (flat ring on ground)
  const ringRef = useRef();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    _prevCol.setHex(blockedRef.current ? 0xff2200 : 0x0ea5e9);
    previewCloneRef.current.mesh.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (mat.emissive) mat.emissive.copy(_prevCol);
        mat.emissiveIntensity = pulse * 0.5 + 0.3;
        mat.opacity           = 0.80;
        mat.transparent       = true;
      });
    });
    if (ringRef.current) {
      ringRef.current.material.opacity = 0.12 + pulse * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={previewCloneRef.current.mesh} scale={[SCALE, SCALE, SCALE]} position={[0, previewCloneRef.current.y, 0]} />
      {/* Dome radius indicator circle */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[DOME_RADIUS - 0.6, DOME_RADIUS + 0.6, 80]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.15} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function DefenseTowerPreview({ placementPosRef, inputRef, placementRotYRef }) {
  return (
    <Suspense fallback={null}>
      <DefenseTowerGLTFPreview
        placementPosRef={placementPosRef}
        inputRef={inputRef}
        placementRotYRef={placementRotYRef}
      />
    </Suspense>
  );
}

// ─── Placed building ──────────────────────────────────────────────────────────

function DefenseTowerPlacedInner({
  position, rotation, isSelected, onSelect, onRightClick,
  currentAmounts = {},
}) {
  const { placedHitRef } = useContext(CityContext);
  const activatedAt = currentAmounts?.activatedAt ?? 0;

  // Compute live remaining without relying on re-render (dome gating)
  const remainingRef = useRef(Math.max(0, activatedAt + DOME_DURATION_MS - Date.now()));
  useEffect(() => {
    const tick = () => { remainingRef.current = Math.max(0, activatedAt + DOME_DURATION_MS - Date.now()); };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activatedAt]);

  const domeActive = activatedAt > 0 && (activatedAt + DOME_DURATION_MS > Date.now());

  return (
    <>
      {/* Dome — rendered at world position regardless of building group */}
      {domeActive && <ProtectionDome position={position} />}

      <group
        position={position}
        rotation={[0, rotation || 0, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (placedHitRef) placedHitRef.current = true;
          onSelect?.();
        }}
        onContextMenu={(e) => {
          e.stopPropagation();
          onRightClick?.(e.clientX, e.clientY);
        }}
      >
        <DefenseTowerBody />

        {/* Selection ring */}
        {isSelected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
            <ringGeometry args={[3.6, 4.4, 32]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.7} />
          </mesh>
        )}

        {/* Countdown timer badge */}
        <CountdownBadge activatedAt={activatedAt} />
      </group>
    </>
  );
}

export const DefenseTowerPlaced = memo(DefenseTowerPlacedInner, (prev, next) => {
  // Always update when activatedAt changes, otherwise use standard comparator
  if (prev.currentAmounts?.activatedAt !== next.currentAmounts?.activatedAt) return false;
  return buildingPropsEqual(prev, next);
});
