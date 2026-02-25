import { useRef, useMemo, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTransferRule } from '../systems/conveyor.js';
import { ConnectionLabel } from './ConnectionLabel.jsx';
import { CityContext } from './CityContext.js';

// Base rate used to normalise token count / speed ("full belt" reference)
const BASE_RATE = 10;

// ─── Source ring (glows orange when building is selected as conveyor source) ──

export function ConveyorSourceRing() {
  const ringRef = useRef();
  useFrame(({ clock }) => {
    if (ringRef.current) {
      ringRef.current.material.opacity = 0.35 + Math.sin(clock.getElapsedTime() * 5) * 0.3;
    }
  });
  return (
    <mesh ref={ringRef} position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.0, 2.8, 32]} />
      <meshBasicMaterial color="#f97316" transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

// ─── Animated resource token ──────────────────────────────────────────────────

export function AnimatedCoin({ fromVec, toVec, offset, speed, color }) {
  const meshRef = useRef();
  const tRef    = useRef(offset);

  useFrame((_, dt) => {
    tRef.current = (tRef.current + dt * speed) % 1;
    if (meshRef.current) {
      meshRef.current.position.lerpVectors(fromVec, toVec, tRef.current);
      meshRef.current.position.y = fromVec.y + 0.13;
    }
  });

  const initPos = new THREE.Vector3().lerpVectors(fromVec, toVec, offset);
  return (
    <mesh ref={meshRef} position={[initPos.x, fromVec.y + 0.13, initPos.z]}>
      <cylinderGeometry args={[0.2, 0.2, 0.07, 10]} />
      <meshStandardMaterial
        color={color}
        emissive={new THREE.Color(color)}
        emissiveIntensity={0.75}
        metalness={0.85}
        roughness={0.12}
      />
    </mesh>
  );
}

// ─── Conveyor belt 3-D visual ─────────────────────────────────────────────────

export function ConveyorBelt({ fromId, toId, placedItems, effectiveRate, onRightClick }) {
  const { rightClickHitRef } = useContext(CityContext);
  const from = placedItems.find(i => i.id === fromId);
  const to   = placedItems.find(i => i.id === toId);
  if (!from || !to) return null;

  const rule = getTransferRule(from.type, to.type);

  const BELT_Y  = 0.22;
  const fromVec = useMemo(
    () => new THREE.Vector3(from.position[0], BELT_Y, from.position[2]),
    [from.position[0], from.position[2]] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const toVec = useMemo(
    () => new THREE.Vector3(to.position[0], BELT_Y, to.position[2]),
    [to.position[0], to.position[2]] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const { mid, angle, len } = useMemo(() => {
    const dir   = new THREE.Vector3().subVectors(toVec, fromVec);
    const len   = dir.length();
    const mid   = new THREE.Vector3().addVectors(fromVec, toVec).multiplyScalar(0.5);
    const angle = Math.atan2(dir.x, dir.z);
    return { mid, angle, len };
  }, [fromVec, toVec]);

  // ─ Animation: token count & speed both scale with effectiveRate ───────────
  const tokenCount = effectiveRate > 0
    ? Math.max(1, Math.min(8, Math.round(6 * effectiveRate / BASE_RATE)))
    : 0;
  const SPEED = effectiveRate > 0 ? Math.max(0.06, 0.4 * effectiveRate / BASE_RATE) : 0;
  const coinOffsets = useMemo(
    () => tokenCount > 0 ? Array.from({ length: tokenCount }, (_, i) => i / tokenCount) : [],
    [tokenCount], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const ruleColor = rule?.color ?? '#fbbf24';
  const tickCount = Math.max(1, Math.floor(len / 2.5));

  return (
    <group>
      {/* Belt body */}
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
          <boxGeometry args={[1.2, 0.5, len]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
        <mesh receiveShadow>
          <boxGeometry args={[0.9, 0.14, len]} />
          <meshStandardMaterial color="#1e293b" roughness={0.85} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.075, 0]}>
          <boxGeometry args={[0.78, 0.03, len - 0.15]} />
          <meshStandardMaterial color="#374151" roughness={0.9} />
        </mesh>
        {[-0.43, 0.43].map((x, i) => (
          <mesh key={i} position={[x, 0.08, 0]}>
            <boxGeometry args={[0.08, 0.22, len]} />
            <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.5} />
          </mesh>
        ))}
        <mesh position={[0, 0.095, 0]}>
          <boxGeometry args={[0.22, 0.025, len - 0.3]} />
          <meshStandardMaterial color={ruleColor} emissive={new THREE.Color(ruleColor)} emissiveIntensity={0.35} />
        </mesh>
        {Array.from({ length: tickCount }, (_, i) => {
          const step = len / tickCount;
          const z    = -len / 2 + step * (i + 0.5);
          return (
            <mesh key={i} position={[0, 0.1, z]} rotation={[0, Math.PI / 4, 0]}>
              <boxGeometry args={[0.24, 0.025, 0.24]} />
              <meshStandardMaterial color={ruleColor} emissive={new THREE.Color(ruleColor)} emissiveIntensity={0.5} />
            </mesh>
          );
        })}
      </group>

      {/* Animated tokens */}
      {coinOffsets.map((off, i) => (
        <AnimatedCoin
          key={i}
          fromVec={fromVec}
          toVec={toVec}
          offset={off}
          speed={SPEED}
          color={ruleColor}
        />
      ))}

      {/* Transfer rate label */}
      <ConnectionLabel
        midPos={[mid.x, mid.y + 2, mid.z]}
        icon={rule?.icon ?? '🛤️'}
        rate={effectiveRate}
        unit={rule?.unit ?? '/ч'}
        color={ruleColor}
      />
    </group>
  );
}
