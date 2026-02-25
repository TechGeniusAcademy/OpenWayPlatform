import { useRef, useMemo, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getCableRule } from '../systems/energyCable.js';
import { ConnectionLabel } from './ConnectionLabel.jsx';
import { CityContext } from './CityContext.js';

// ─── Animated electric spark ──────────────────────────────────────────────────

function ElectricSpark({ fromVec, toVec, offset, speed, color }) {
  const meshRef = useRef();
  const tRef    = useRef(offset);

  useFrame((_, dt) => {
    tRef.current = (tRef.current + dt * speed) % 1;
    if (meshRef.current) {
      meshRef.current.position.lerpVectors(fromVec, toVec, tRef.current);
      meshRef.current.position.y = 0.35 + Math.sin(tRef.current * Math.PI) * 0.7;
      meshRef.current.material.emissiveIntensity =
        0.9 + Math.sin(tRef.current * Math.PI * 10) * 0.6;
    }
  });

  const initPos = new THREE.Vector3().lerpVectors(fromVec, toVec, offset);
  return (
    <mesh ref={meshRef} position={[initPos.x, 0.35, initPos.z]}>
      <sphereGeometry args={[0.15, 6, 6]} />
      <meshStandardMaterial
        color={color}
        emissive={new THREE.Color(color)}
        emissiveIntensity={1.2}
        toneMapped={false}
      />
    </mesh>
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

  const SPARKS = 4;
  const sparkOffsets = useMemo(
    () => Array.from({ length: SPARKS }, (_, i) => i / SPARKS),
    [],
  );

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
            emissive={new THREE.Color(color)}
            emissiveIntensity={0.9}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Animated electric sparks */}
      {sparkOffsets.map((off, i) => (
        <ElectricSpark
          key={i}
          fromVec={fromVec}
          toVec={toVec}
          offset={off}
          speed={0.55}
          color={color}
        />
      ))}

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
