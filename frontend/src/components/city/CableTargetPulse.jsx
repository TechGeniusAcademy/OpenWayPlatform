// ─── CableTargetPulse.jsx ─────────────────────────────────────────────────────
//
// When the player is in cable mode with a source selected, this component
// renders a pulsing highlight ring around every building that:
//   1. Can legally receive a cable from the selected source (canCableConnect)
//   2. Is NOT already connected to that exact source via an existing cable
//
// Usage (inside Scene):
//   <CableTargetPulse
//     cableFromId={cableFromId}
//     placedItems={placedItems}
//     energyCables={energyCables}
//   />

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { canCableConnect } from '../systems/energyCable.js';

// ─── Single pulsing ring ──────────────────────────────────────────────────────

function PulseRing({ position }) {
  const outerRef  = useRef();
  const innerRef  = useRef();
  const frameRef  = useRef(0);

  useFrame(({ clock }) => {
    if (++frameRef.current % 2 !== 0) return;
    const t   = clock.getElapsedTime();
    const s   = 1.0 + 0.22 * Math.abs(Math.sin(t * 3.5));
    const opacity = 0.55 + 0.45 * Math.abs(Math.sin(t * 3.5));

    if (outerRef.current) {
      outerRef.current.scale.setScalar(s);
      outerRef.current.material.opacity = opacity * 0.7;
    }
    if (innerRef.current) {
      innerRef.current.scale.setScalar(1 / s); // counter-scale for halo feel
      innerRef.current.material.opacity = opacity;
    }
  });

  return (
    <group position={[position[0], 0.08, position[2]]}>
      {/* Outer glow disc */}
      <mesh ref={outerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 2.4, 32]} />
        <meshBasicMaterial
          color="#facc15"
          transparent
          opacity={0.55}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner fill disc */}
      <mesh ref={innerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.55, 32]} />
        <meshBasicMaterial
          color="#fef08a"
          transparent
          opacity={0.18}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ─── Container — only renders when a cable source is selected ─────────────────

export function CableTargetPulse({ cableFromId, placedItems, energyCables }) {
  if (cableFromId === null || cableFromId === undefined) return null;

  const source = placedItems.find(i => i.id === cableFromId);
  if (!source) return null;

  // Build set of items already connected FROM this source
  const alreadyConnected = new Set(
    (energyCables ?? [])
      .filter(c => c.fromId === cableFromId)
      .map(c => c.toId),
  );

  // Candidates: can receive a cable from source AND not already connected AND not the source itself
  const targets = placedItems.filter(item =>
    item.id !== cableFromId &&
    !alreadyConnected.has(item.id) &&
    canCableConnect(source.type, item.type),
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
