import { useRef, useMemo, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTransferRule } from '../systems/conveyor.js';
import { ConnectionLabel } from './ConnectionLabel.jsx';
import { CityContext } from './CityContext.js';

// Base rate used to normalise token count / speed ("full belt" reference)
const BASE_RATE = 10;

// Shared dummy Object3D for instanced matrix updates — one per module
const _dummy = new THREE.Object3D();

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

// ─── Optimised animated tokens — ONE InstancedMesh + ONE useFrame ────────────
// Replaces the old per-coin AnimatedCoin components that each registered their
// own useFrame callback.  With 4 tokens × 10 conveyors that was 40 callbacks/frame.
// Now it is 1 callback per belt regardless of token count.

function AnimatedCoins({ fromVec, toVec, offsets, speed, color }) {
  const meshRef  = useRef();
  const timesRef = useRef(offsets.slice()); // mutable progress per coin

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh || offsets.length === 0) return;
    const times = timesRef.current;
    for (let i = 0; i < times.length; i++) {
      times[i] = (times[i] + dt * speed) % 1;
      _dummy.position.lerpVectors(fromVec, toVec, times[i]);
      _dummy.position.y = fromVec.y + 0.13;
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (offsets.length === 0) return null;
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, offsets.length]}>
      {/* 6 segments (was 10) — tokens are tiny, nobody sees the difference */}
      <cylinderGeometry args={[0.2, 0.2, 0.07, 6]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.75}
        metalness={0.85}
        roughness={0.12}
      />
    </instancedMesh>
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

  // Cap tokens at 4 (was 8) — saves ½ the instanced draw work
  const tokenCount = effectiveRate > 0
    ? Math.max(1, Math.min(4, Math.round(4 * effectiveRate / BASE_RATE)))
    : 0;
  const SPEED = effectiveRate > 0 ? Math.max(0.06, 0.4 * effectiveRate / BASE_RATE) : 0;
  const coinOffsets = useMemo(
    () => tokenCount > 0 ? Array.from({ length: tokenCount }, (_, i) => i / tokenCount) : [],
    [tokenCount], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const ruleColor = rule?.color ?? '#fbbf24';
  // Memoize THREE.Color to avoid creating new objects every render
  const ruleColorObj = useMemo(() => new THREE.Color(ruleColor), [ruleColor]);
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
          <meshStandardMaterial color={ruleColor} emissive={ruleColorObj} emissiveIntensity={0.35} />
        </mesh>
        {Array.from({ length: tickCount }, (_, i) => {
          const step = len / tickCount;
          const z    = -len / 2 + step * (i + 0.5);
          return (
            <mesh key={i} position={[0, 0.1, z]} rotation={[0, Math.PI / 4, 0]}>
              <boxGeometry args={[0.24, 0.025, 0.24]} />
              <meshStandardMaterial color={ruleColor} emissive={ruleColorObj} emissiveIntensity={0.5} />
            </mesh>
          );
        })}
      </group>

      {/* Animated tokens — single instanced component (one useFrame for all coins) */}
      <AnimatedCoins
        fromVec={fromVec}
        toVec={toVec}
        offsets={coinOffsets}
        speed={SPEED}
        color={ruleColor}
      />

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

