// ─── ConveyorTargetPulse.jsx ──────────────────────────────────────────────────
//
// When the player is in conveyor mode with a source selected, renders a pulsing
// highlight ring around every building that:
//   1. Can legally receive a conveyor from the selected source (canConnect)
//   2. Does NOT already have an incoming conveyor from any building (1-conveyor limit)
//   3. Is not the source itself
//
// Usage (inside Scene):
//   <ConveyorTargetPulse
//     conveyorFromId={conveyorFromId}
//     placedItems={placedItems}
//     conveyors={conveyors}
//   />

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { canConnect, getConveyorOutLimit, getConveyorInLimit } from '../systems/conveyor.js';

// ─── Single pulsing ring ──────────────────────────────────────────────────────

function PulseRing({ position }) {
  const outerRef  = useRef();
  const innerRef  = useRef();
  const frameRef  = useRef(0);

  useFrame(({ clock }) => {
    if (++frameRef.current % 2 !== 0) return;
    const t       = clock.getElapsedTime();
    const pulse   = Math.abs(Math.sin(t * 3.2));
    const s       = 1.0 + 0.20 * pulse;
    const opacity = 0.5 + 0.5 * pulse;

    if (outerRef.current) {
      outerRef.current.scale.setScalar(s);
      outerRef.current.material.opacity = opacity * 0.65;
    }
    if (innerRef.current) {
      innerRef.current.material.opacity = opacity * 0.2;
    }
  });

  return (
    <group position={[position[0], 0.08, position[2]]}>
      {/* Outer ring */}
      <mesh ref={outerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 2.2, 32]} />
        <meshBasicMaterial
          color="#34d399"
          transparent
          opacity={0.55}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner fill disc */}
      <mesh ref={innerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.45, 32]} />
        <meshBasicMaterial
          color="#6ee7b7"
          transparent
          opacity={0.18}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────

export function ConveyorTargetPulse({ conveyorFromId, placedItems, conveyors }) {
  if (conveyorFromId === null || conveyorFromId === undefined) return null;

  const source = placedItems.find(i => i.id === conveyorFromId);
  if (!source) return null;

  // Items that already have their incoming slots full
  const fullTargets = new Set(
    placedItems
      .filter(item => conveyors.filter(c => c.toId === item.id).length >= getConveyorInLimit(item.type))
      .map(item => item.id),
  );

  // Items that already have an outgoing conveyor FROM this source
  const alreadyFromSource = new Set(
    conveyors.filter(c => c.fromId === conveyorFromId).map(c => c.toId),
  );

  const targets = placedItems.filter(item =>
    item.id !== conveyorFromId &&
    !fullTargets.has(item.id) &&
    !alreadyFromSource.has(item.id) &&
    canConnect(source.type, item.type),
  );

  if (!targets.length) return null;

  return (
    <>
      {targets.map(item => (
        <PulseRing key={item.id} position={item.position} />
      ))}
    </>
  );
}
