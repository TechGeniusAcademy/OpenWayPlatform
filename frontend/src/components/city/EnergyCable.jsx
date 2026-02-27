import { useMemo, useContext } from 'react';
import * as THREE from 'three';
import { getCableRule } from '../systems/energyCable.js';
import { ConnectionLabel } from './ConnectionLabel.jsx';
import { CityContext } from './CityContext.js';

// ─── Sparks REMOVED — were a major useFrame cost per cable ───────────────────

// ─── Cable source indicator ring (static — no useFrame) ─────────────────────

export function CableSourceRing() {
  return (
    <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
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

  // Core pulse animation removed — saves one useFrame per cable
  const sparkOffsets = useMemo(() => [], []);

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
        {/* Glowing energy core — static emissive */}
        <mesh>
          <boxGeometry args={[0.08, 0.08, len]} />
          <meshStandardMaterial
            color={color}
            emissive={colorObj}
            emissiveIntensity={0.9}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Sparks removed — use static cable only */}

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
