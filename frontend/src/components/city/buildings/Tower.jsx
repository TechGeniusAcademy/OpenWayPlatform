// ─── Tower ────────────────────────────────────────────────────────────────────
// A defensive tower that can be placed at wall junctions.
// Contains an animated archer (slow scan + periodic bow-draw).
// Levels 1-5 with increasing HP, range, and appearance.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { FaHeart } from 'react-icons/fa';
import { getTowerLevelConfig } from '../../items/wallSystem.js';

// ─── Shared archer geometries — created once, reused by every tower ───────────
const GEO_ARC_BODY  = new THREE.CylinderGeometry(0.14, 0.18, 0.7,  6);
const GEO_ARC_HEAD  = new THREE.SphereGeometry  (0.16, 7, 6);
const GEO_ARC_HELM  = new THREE.CylinderGeometry(0.12, 0.17, 0.12, 6);
const GEO_ARC_ARM   = new THREE.CylinderGeometry(0.05, 0.05, 0.45, 5);
const GEO_ARC_BOW   = new THREE.TorusGeometry   (0.22, 0.03, 5, 12, Math.PI * 1.3);
const GEO_ARC_ARROW = new THREE.CylinderGeometry(0.02, 0.02, 0.5,  4);
const GEO_SEL_RING  = new THREE.CircleGeometry  (2.2, 12);

// ── Archer ────────────────────────────────────────────────────────────────────
function Archer({ color = '#7c3aed', platformY }) {
  const groupRef  = useRef();   // whole archer – Y rotation scan
  const bowArmRef = useRef();   // right arm – bow draw animation
  const arrowRef  = useRef();   // arrow shaft – appears on draw
  const drawPhase = useRef(0);  // 0=idle, 1=draw, 2=hold, 3=release

  // Time accumulators
  const scanAngle  = useRef(0);
  const drawTimer  = useRef(2.5 + Math.random() * 3); // start of first shot

  useFrame((_, dt) => {
    if (!groupRef.current) return;

    // Slow scan
    scanAngle.current += dt * 0.45;
    groupRef.current.rotation.y = Math.sin(scanAngle.current) * 1.2;

    // Bow-draw cycle
    drawTimer.current -= dt;
    if (drawTimer.current <= 0) {
      // Cycle: draw(0.4s) → hold(0.3s) → release flash → reset
      if (drawPhase.current === 0) {
        drawPhase.current = 1;
        drawTimer.current = 0.4;
      } else if (drawPhase.current === 1) {
        drawPhase.current = 2;
        drawTimer.current = 0.3;
      } else if (drawPhase.current === 2) {
        drawPhase.current = 3;
        drawTimer.current = 0.08;
      } else {
        drawPhase.current = 0;
        drawTimer.current = 2 + Math.random() * 3;
      }
    }

    // Animate right arm angle based on draw phase
    if (bowArmRef.current) {
      const tgt = drawPhase.current >= 1 && drawPhase.current <= 2 ? -0.9 : -0.25;
      bowArmRef.current.rotation.x += (tgt - bowArmRef.current.rotation.x) * 0.35;
    }
    // Show arrow only during draw & hold
    if (arrowRef.current) {
      arrowRef.current.visible = drawPhase.current === 1 || drawPhase.current === 2;
    }
  });

  const tunic = '#4c1d95';
  const skin  = '#fde68a';
  const bow   = color;

  return (
    <group ref={groupRef} position={[0, platformY, 0]}>
      {/* Body */}
      <mesh castShadow position={[0, 0.55, 0]} geometry={GEO_ARC_BODY}>
        <meshStandardMaterial color={tunic} roughness={0.8} />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 1.05, 0]} geometry={GEO_ARC_HEAD}>
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      {/* Helmet */}
      <mesh castShadow position={[0, 1.17, 0]} geometry={GEO_ARC_HELM}>
        <meshStandardMaterial color={bow} roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Left arm (bow arm — forward) */}
      <mesh castShadow position={[0.2, 0.78, 0.1]} rotation={[-0.25, 0, 0.25]} geometry={GEO_ARC_ARM}>
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      {/* Right arm (draw arm — animated) */}
      <group ref={bowArmRef} position={[-0.2, 0.78, 0]}>
        <mesh castShadow rotation={[0, 0, -0.25]} geometry={GEO_ARC_ARM}>
          <meshStandardMaterial color={skin} roughness={0.8} />
        </mesh>
      </group>
      {/* Bow (arc near left hand) */}
      <mesh castShadow position={[0.26, 0.78, 0.3]} geometry={GEO_ARC_BOW}>
        <meshStandardMaterial color={bow} emissive={new THREE.Color(bow)} emissiveIntensity={0.25} roughness={0.6} />
      </mesh>
      {/* Arrow shaft */}
      <mesh ref={arrowRef} castShadow position={[0.2, 0.78, 0.18]} rotation={[Math.PI / 2, 0, 0]} visible={false} geometry={GEO_ARC_ARROW}>
        <meshStandardMaterial color="#b45309" roughness={0.7} />
      </mesh>
    </group>
  );
}

// ── Tower Body ────────────────────────────────────────────────────────────────
function TowerBody({ cfg }) {
  const { color, accentColor, level } = cfg;
  const baseR  = 1.2 + level * 0.08;
  const bodyH  = 3.0 + level * 0.35;
  const platTk = 0.35;

  return (
    <group>
      {/* Foundation */}
      <mesh receiveShadow position={[0, 0.2, 0]}>
        <cylinderGeometry args={[baseR + 0.4, baseR + 0.6, 0.4, 7]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>

      {/* Main tower body */}
      <mesh castShadow receiveShadow position={[0, bodyH / 2, 0]}>
        <cylinderGeometry args={[baseR, baseR + 0.25, bodyH, 8]} />
        <meshStandardMaterial color={color} roughness={0.8} metalness={level >= 3 ? 0.2 : 0.05} />
      </mesh>

      {/* Arrow slits */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a, i) => (
        <mesh key={i} position={[Math.sin(a) * (baseR + 0.01), bodyH * 0.55, Math.cos(a) * (baseR + 0.01)]} rotation={[0, a, 0]}>
          <boxGeometry args={[0.12, 0.4, 0.08]} />
          <meshBasicMaterial color="#000" />
        </mesh>
      ))}

      {/* Platform floor */}
      <mesh castShadow position={[0, bodyH + platTk / 2, 0]}>
        <cylinderGeometry args={[baseR + 0.5, baseR + 0.3, platTk, 7]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>

      {/* Battlements around top */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const r = baseR + 0.45;
        return (
          <mesh key={i} castShadow position={[Math.sin(a) * r, bodyH + platTk + 0.22, Math.cos(a) * r]}>
            <boxGeometry args={[0.3, 0.44, 0.3]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        );
      })}

      {/* Accent glow ring for level 3+ */}
      {level >= 3 && (
        <mesh position={[0, bodyH * 0.7, 0]}>
          <torusGeometry args={[baseR + 0.08, 0.07, 6, 16]} />
          <meshStandardMaterial color={accentColor} emissive={new THREE.Color(accentColor)} emissiveIntensity={0.5} metalness={0.8} roughness={0.1} />
        </mesh>
      )}

      {/* Magic light level 4+ */}
      {level >= 4 && (
        <pointLight position={[0, bodyH + 1, 0]} color={accentColor} intensity={1.2} distance={8} />
      )}

      {/* Return the platform Y for archer placement */}
      <Archer color={accentColor} platformY={bodyH + platTk + 0.05} />
    </group>
  );
}

// ── HP Badge ──────────────────────────────────────────────────────────────────
function TowerHpBar({ currentHp, maxHp, isSelected, bodyHeight }) {
  if (!isSelected) return null;
  const pct = Math.max(0, Math.min(1, currentHp / maxHp));
  const barColor = pct > 0.6 ? '#4ade80' : pct > 0.3 ? '#fbbf24' : '#f87171';
  return (
    <Html position={[0, bodyHeight + 2.5, 0]} center distanceFactor={35} zIndexRange={[10, 11]} style={{ pointerEvents: 'none' }}>
      <div style={{
        background: 'rgba(0,0,0,0.88)',
        border: `1px solid ${barColor}55`,
        borderRadius: 6, padding: '3px 10px',
        fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: barColor,
        whiteSpace: 'nowrap', userSelect: 'none',
      }}>
        <FaHeart style={{ marginRight: 4, verticalAlign: 'middle', fontSize: 9 }} />{currentHp}/{maxHp}
        <div style={{ height: 3, background: '#374151', borderRadius: 2, marginTop: 2, width: 80 }}>
          <div style={{ height: '100%', width: `${Math.round(pct * 100)}%`, background: barColor, borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
      </div>
    </Html>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function TowerPlaced({ wallData, position, rotation = 0, level = 1, currentHp, maxHp, isSelected, onSelect, onRightClick }) {
  const cfg    = getTowerLevelConfig(level);
  const bodyH  = 3.0 + level * 0.35;

  return (
    <group
      position={position}
      rotation={[0, rotation, 0]}
      onPointerDown={(e) => { e.stopPropagation(); onSelect?.(); }}
      onContextMenu={(e) => { e.nativeEvent?.preventDefault?.(); onRightClick?.(e.nativeEvent?.clientX, e.nativeEvent?.clientY); }}
    >
      <TowerBody cfg={cfg} />
      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={GEO_SEL_RING}>
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.2} />
        </mesh>
      )}
      <TowerHpBar currentHp={currentHp ?? maxHp ?? 200} maxHp={maxHp ?? 200} isSelected={isSelected} bodyHeight={bodyH} />
    </group>
  );
}

// Preview ghost: ref-driven so cursor movement doesn't cause React re-renders
export function TowerPreview({ cursorRef }) {
  const rootRef = useRef();
  const matRef  = useRef();
  const GRID    = 2;

  useFrame(({ clock }) => {
    const root = rootRef.current;
    if (!root) return;
    if (!cursorRef?.current) { root.visible = false; return; }
    const { x, z } = cursorRef.current;
    const snappedX  = Math.round(x / GRID) * GRID;
    const snappedZ  = Math.round(z / GRID) * GRID;
    root.visible = true;
    root.position.set(snappedX, 0, snappedZ);
    if (matRef.current) {
      const p = 0.4 + Math.sin(clock.getElapsedTime() * 4) * 0.25;
      matRef.current.opacity = p;
      matRef.current.emissiveIntensity = p;
    }
  });

  return (
    <group ref={rootRef} visible={false}>
      <mesh position={[0, 1.75, 0]}>
        <cylinderGeometry args={[1.3, 1.5, 3.5, 10]} />
        <meshStandardMaterial ref={matRef} color="#7c3aed" emissive={new THREE.Color('#7c3aed')}
          emissiveIntensity={0.5} transparent opacity={0.45} depthWrite={false} />
      </mesh>
    </group>
  );
}
