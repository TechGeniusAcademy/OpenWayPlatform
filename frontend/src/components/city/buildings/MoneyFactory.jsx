import { Suspense, useMemo, useEffect, useRef, useContext } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { CityContext, MONEY_FACTORY_Y, MONEY_FACTORY_TILT_X, MONEY_FACTORY_TILT_Z } from '../CityContext.js';
import { usePlacementTracker, EnergyBadge, WorkAreaOverlay, NoPowerBadge, LevelBadge, LevelRing, LevelPlinth, memo, buildingPropsEqual } from '../SharedUI.jsx';
import { ConveyorSourceRing } from '../ConveyorBelt.jsx';
import { CableSourceRing } from '../EnergyCable.jsx';
import { MONEY_FACTORY_CONFIG } from '../../items/moneyFactory.js';
import { getLevelConfig } from '../../systems/upgrades.js';

const MODEL_URL = '/models/Factory.glb';
useGLTF.preload(MODEL_URL);

// Clip the model above this Y (world units) — adjust to taste
const CLIP_HEIGHT = 5.5;
const HEIGHT_CLIP_PLANE = new THREE.Plane(new THREE.Vector3(0, -1, 0), CLIP_HEIGHT);

// Chimney smoke starts at the clip height (top of visible building)
const CHIMNEY_POS = [
  new THREE.Vector3(-1.4, CLIP_HEIGHT, 2.2),
  new THREE.Vector3( 0.7, CLIP_HEIGHT, 2.2),
  new THREE.Vector3(-3.1, CLIP_HEIGHT, 2.2),
];
const PUFF_N = 10; // 5 puffs per chimney
const _dummy = new THREE.Object3D();
// Shared smoke geometry and material — all factory instances reuse these
const SMOKE_GEO = new THREE.SphereGeometry(0.22, 5, 4);
const SMOKE_MAT = new THREE.MeshStandardMaterial({
  color: '#9ca3af', transparent: true, opacity: 0.38,
  roughness: 1, metalness: 0, depthWrite: false,
});

// Lightweight instanced smoke — no Sparkles, throttled every 3 frames
function SmokeParticles() {
  const ref    = useRef();
  const frame  = useRef(0);
  const ts     = useRef(Array.from({ length: PUFF_N }, (_, i) => i / PUFF_N));
  const geoRef = SMOKE_GEO;
  const matRef = SMOKE_MAT;

  useFrame((_, delta) => {
    if (!ref.current) return;
    frame.current++;
    if (frame.current % 3 !== 0) return;
    const RISE = 2.8;
    for (let i = 0; i < PUFF_N; i++) {
      ts.current[i] = (ts.current[i] + delta * 0.18) % 1;
      const t = ts.current[i];
      const ch = CHIMNEY_POS[i % CHIMNEY_POS.length];
      const spread = t * 0.7;
      _dummy.position.set(
        ch.x + Math.sin(i * 2.39) * spread,
        ch.y + MONEY_FACTORY_Y + t * RISE,
        ch.z + Math.cos(i * 2.39) * spread,
      );
      _dummy.scale.setScalar(0.18 + t * 0.65);
      _dummy.updateMatrix();
      ref.current.setMatrixAt(i, _dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geoRef, matRef, PUFF_N]} />;
}

function FactoryGLB({ emissiveColor, emissiveIntensity, accentOverride }) {
  const { gl } = useThree();
  const { scene } = useGLTF(MODEL_URL);
  const model = useMemo(() => scene.clone(true), [scene]);

  // Enable local clipping once on the renderer
  useEffect(() => { gl.localClippingEnabled = true; }, [gl]);

  useEffect(() => {
    const ei = emissiveIntensity ?? 0;
    const accent = accentOverride ?? '#22c55e';
    model.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        // Preserve original GLB color/roughness/metalness
        mat.clippingPlanes = [HEIGHT_CLIP_PLANE];
        mat.clipShadows = true;
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
        scale={[0.0101, 0.0101, 0.0101]}
        position={[-0.59, MONEY_FACTORY_Y, 1.10]}
        rotation={[MONEY_FACTORY_TILT_X, 0, MONEY_FACTORY_TILT_Z]}
        castShadow
        receiveShadow
      />
      <SmokeParticles />
    </group>
  );
}

function ProceduralBody({ emissiveColor, emissiveIntensity, opacity = 1, transparent = false, accentOverride }) {
  const m = { transparent, opacity, roughness: 0.55, metalness: 0.3 };
  const ec = emissiveColor ?? '#000000';
  const ei = emissiveIntensity ?? 0;
  return (
    <group position={[0, MONEY_FACTORY_Y, 0]} rotation={[MONEY_FACTORY_TILT_X, 0, MONEY_FACTORY_TILT_Z]}>
      <mesh receiveShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[8.5, 0.4, 8.5]} />
        <meshStandardMaterial color="#374151" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.2} {...m} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 4, 0]}>
        <boxGeometry args={[7, 7.2, 6.5]} />
        <meshStandardMaterial color="#1f2937" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.35} {...m} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 3, 3.8]}>
        <boxGeometry args={[4.5, 5.2, 2]} />
        <meshStandardMaterial color="#111827" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.4} {...m} />
      </mesh>
      <mesh castShadow position={[-2.2, 10.5, -2.2]}>
        <cylinderGeometry args={[0.38, 0.45, 6.5, 8]} />
        <meshStandardMaterial color="#374151" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.3} {...m} />
      </mesh>
      <mesh castShadow position={[2.2, 10, -2.2]}>
        <cylinderGeometry args={[0.38, 0.45, 5.5, 8]} />
        <meshStandardMaterial color="#374151" emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.3} {...m} />
      </mesh>
      <mesh castShadow position={[-2.2, 13.95, -2.2]}>
        <cylinderGeometry args={[0.55, 0.38, 0.55, 8]} />
        <meshStandardMaterial color={accentOverride ?? '#4b5563'} emissive={new THREE.Color(accentOverride ?? ec)} emissiveIntensity={ei + 0.4} {...m} />
      </mesh>
      <mesh castShadow position={[2.2, 12.95, -2.2]}>
        <cylinderGeometry args={[0.55, 0.38, 0.55, 8]} />
        <meshStandardMaterial color={accentOverride ?? '#4b5563'} emissive={new THREE.Color(accentOverride ?? ec)} emissiveIntensity={ei + 0.4} {...m} />
      </mesh>
      {[-1.4, 0, 1.4].map((x, i) => (
        <mesh key={i} position={[x, 3.5, 4.82]}>
          <boxGeometry args={[0.9, 1.3, 0.06]} />
          <meshStandardMaterial color="#fbbf24" emissive={new THREE.Color(emissiveColor ?? '#fbbf24')} emissiveIntensity={ei + 0.6} transparent opacity={opacity} />
        </mesh>
      ))}
      <mesh position={[0, 5.5, 3.82]}>
        <boxGeometry args={[1.4, 1.8, 0.06]} />
        <meshStandardMaterial color={accentOverride ?? '#22c55e'} emissive={new THREE.Color(accentOverride ?? ec)} emissiveIntensity={ei + 0.8} transparent opacity={opacity} />
      </mesh>
    </group>
  );
}

export function MoneyFactoryBody({ emissiveColor, emissiveIntensity, opacity = 1, transparent = false, accentOverride, isPreview = false }) {
  if (isPreview) {
    return <ProceduralBody emissiveColor={emissiveColor} emissiveIntensity={emissiveIntensity} opacity={opacity} transparent={transparent} accentOverride={accentOverride} />;
  }
  return (
    <Suspense fallback={<ProceduralBody emissiveColor={emissiveColor} emissiveIntensity={emissiveIntensity} opacity={opacity} transparent={transparent} accentOverride={accentOverride} />}>
      <FactoryGLB emissiveColor={emissiveColor} emissiveIntensity={emissiveIntensity} accentOverride={accentOverride} />
    </Suspense>
  );
}

const _previewCol = new THREE.Color();

function MoneyFactoryGLTFPreview({ placementPosRef, inputRef, placementRotYRef }) {
  const { groupRef, blockedRef } = usePlacementTracker(placementPosRef, inputRef, placementRotYRef);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    _previewCol.setHex(blockedRef.current ? 0xff2200 : 0x00ff88);
    groupRef.current.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mat = obj.material;
      if (mat.emissive) mat.emissive.copy(_previewCol);
      mat.emissiveIntensity = pulse * 0.5 + 0.3;
      mat.opacity = 0.82;
      mat.transparent = true;
    });
  });
  return (
    <group ref={groupRef}>
      <MoneyFactoryBody emissiveColor="#00ff88" emissiveIntensity={0.35} transparent opacity={0.82} isPreview />
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
      <LevelPlinth level={level} size={5} />
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

export function MoneyFactoryPreview({ placementPosRef, inputRef, placementRotYRef }) {
  return <MoneyFactoryGLTFPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />;
}

export const MoneyFactoryPlaced = memo(
  function MoneyFactoryPlaced({ position, rotation, isSelected, onSelect, onConveyorClick, isConveyorSource, onRightClick, isPowered, isCableSource, onCableClick, level = 1 }) {
    return <MoneyFactoryGLTFPlaced position={position} rotation={rotation} isSelected={isSelected} onSelect={onSelect} onConveyorClick={onConveyorClick} isConveyorSource={isConveyorSource} onRightClick={onRightClick} isPowered={isPowered} isCableSource={isCableSource} onCableClick={onCableClick} level={level} />;
  },
  buildingPropsEqual,
);
