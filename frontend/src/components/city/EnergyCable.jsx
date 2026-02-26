import { useRef, useMemo, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getCableRule } from '../systems/energyCable.js';
import { ConnectionLabel } from './ConnectionLabel.jsx';
import { CityContext } from './CityContext.js';

// Shared dummy for instanced matrix writes
const _dummy = new THREE.Object3D();

// ─── Optimised animated sparks — ONE InstancedMesh + ONE useFrame ─────────────
// Replaces individual ElectricSpark components each with their own useFrame.

function ElectricSparks({ fromVec, toVec, offsets, speed, color }) {
  const meshRef  = useRef();
  const timesRef = useRef(offsets.slice());

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const times = timesRef.current;
    for (let i = 0; i < times.length; i++) {
      times[i] = (times[i] + dt * speed) % 1;
      _dummy.position.lerpVectors(fromVec, toVec, times[i]);
      _dummy.position.y = 0.35 + Math.sin(times[i] * Math.PI) * 0.7;
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (offsets.length === 0) return null;
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, offsets.length]}>
      <sphereGeometry args={[0.15, 5, 4]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} toneMapped={false} />
    </instancedMesh>
  );
}

// ─── Cable source indicator ring (yellow pulsing ring) ────────────────────────

export function CableSourceRing() {
  const ringRef = useRef();
  useFrame(({ clock }) => {
    if (ringRef.current) {
      ringRef.current.material.opacity =
        0.35 + Math.sin(clock.getElapsedTime() * 6) * 0.3;
    }
  });
  return (
    <mesh ref={ringRef} position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.2, 3.2, 32]} />
      <meshBasicMaterial
        color="#facc15"
        transparent
        opacity={0.55}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Energy cable 3-D visual ──────────────────────────────────────────────────

export function EnergyCable({ fromId, toId, placedItems, effectiveRate, onRightClick }) {
  const { rightClickHitRef } = useContext(CityContext);
  const from = placedItems.find(i => i.id === fromId);
  const to   = placedItems.find(i => i.id === toId);
  if (!from || !to) return null;

  const rule  = getCableRule(from.type, to.type);
  const color = rule?.color ?? '#facc15';
  // Memoize color object to avoid per-render allocation
  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  const CABLE_Y = 0.3;
  const fromVec = useMemo(
    () => new THREE.Vector3(from.position[0], CABLE_Y, from.position[2]),
    [from.position[0], from.position[2]], // eslint-disable-line
  );
  const toVec = useMemo(
    () => new THREE.Vector3(to.position[0], CABLE_Y, to.position[2]),
    [to.position[0], to.position[2]], // eslint-disable-line
  );

  const { mid, angle, len } = useMemo(() => {
    const dir    = new THREE.Vector3().subVectors(toVec, fromVec);
    const length = dir.length();
    const mid    = new THREE.Vector3().addVectors(fromVec, toVec).multiplyScalar(0.5);
    const angle  = Math.atan2(dir.x, dir.z);
    return { mid, angle, len: length };
  }, [fromVec, toVec]);

  const coreRef = useRef();
  useFrame(({ clock }) => {
    if (coreRef.current) {
      coreRef.current.material.emissiveIntensity =
        0.9 + Math.sin(clock.getElapsedTime() * 4) * 0.4;
    }
  });

  const sparkOffsets = useMemo(() => [0, 0.25, 0.5, 0.75], []);

  return (
    <group>
      {/* Cable outer sheath */}
      <group
        position={mid.toArray()}
        rotation={[0, angle, 0]}
        onPointerDown={(e) => {
          if (e.button === 2) {
            e.stopPropagation();
            rightClickHitRef.current = true;
            onRightClick?.(e.nativeEvent.clientX, e.nativeEvent.clientY);
          }
        }}
      >
        {/* Invisible hit surface for pointer events */}
        <mesh visible={false}>
          <boxGeometry args={[0.6, 0.6, len]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.2, 0.2, len]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.4} />
        </mesh>
        {/* Glowing energy core */}
        <mesh ref={coreRef}>
          <boxGeometry args={[0.08, 0.08, len]} />
          <meshStandardMaterial
            color={color}
            emissive={colorObj}
            emissiveIntensity={0.9}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Animated electric sparks — single instanced component */}
      <ElectricSparks
        fromVec={fromVec}
        toVec={toVec}
        offsets={sparkOffsets}
        speed={0.55}
        color={color}
      />

      {/* Transfer rate label */}
      <ConnectionLabel
        midPos={[mid.x, mid.y + 2, mid.z]}
        icon={rule?.icon ?? '⚡'}
        rate={effectiveRate}
        unit={rule?.unit ?? 'кВт/ч'}
        color={color}
      />
    </group>
  );
}


// ─── Cable source indicator ring (yellow pulsing ring) ────────────────────────

export function CableSourceRing() {
  const ringRef = useRef();
  useFrame(({ clock }) => {
    if (ringRef.current) {
      ringRef.current.material.opacity =
        0.35 + Math.sin(clock.getElapsedTime() * 6) * 0.3;
    }
  });
  return (
    <mesh ref={ringRef} position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.2, 3.2, 32]} />
      <meshBasicMaterial
        color="#facc15"
        transparent
        opacity={0.55}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

