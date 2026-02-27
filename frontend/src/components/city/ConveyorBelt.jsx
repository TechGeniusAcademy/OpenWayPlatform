import { useRef, useMemo, useContext, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTransferRule, getConveyorOutPort, getConveyorInPort } from '../systems/conveyor.js';
import { ConnectionLabel } from './ConnectionLabel.jsx';
import { CityContext } from './CityContext.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_RATE  = 10;
const BELT_Y     = 0.42;   // height of belt surface above ground (on legs)
const BELT_W     = 0.96;   // rubber tread width
const BELT_H     = 0.07;   // rubber tread thickness
const RAIL_H     = 0.26;   // side rail height
const RAIL_X     = 0.54;   // side rail X offset from centre
const ROLLER_R   = 0.055;  // roller cylinder radius
const ROLLER_SEG = 6;      // cylinder segments (low poly)
const LEG_SPACE  = 3.6;    // distance between support leg pairs

// Shared dummy Object3D for instanced matrix updates — one per module
const _dummy = new THREE.Object3D();

// ─── Module-level shared geometries (created once, reused forever) ────────────
const GEO = {
  beltSurface: new THREE.BoxGeometry(BELT_W, BELT_H, 1),
  sideRail:    new THREE.BoxGeometry(0.09, RAIL_H, 1),
  legPost:     new THREE.BoxGeometry(0.07, 0.36, 0.07),
  legCross:    new THREE.BoxGeometry(0.88, 0.05, 0.06),
  coin:        new THREE.CylinderGeometry(0.18, 0.18, 0.06, 10),
  endCap:      new THREE.CylinderGeometry(RAIL_H * 0.5, RAIL_H * 0.5, BELT_W + 0.18, 8),
  roller:      new THREE.CylinderGeometry(ROLLER_R, ROLLER_R, BELT_W + 0.12, ROLLER_SEG),
  item:        new THREE.BoxGeometry(0.30, 0.24, 0.30),
  hitbox:      new THREE.BoxGeometry(1.4, 0.5, 1),
};

// ─── Shared static materials ──────────────────────────────────────────────────
const MAT = {
  rubber: new THREE.MeshStandardMaterial({ color: '#17202a', roughness: 0.97, metalness: 0.02 }),
  rail:   new THREE.MeshStandardMaterial({ color: '#2d3e50', roughness: 0.55, metalness: 0.65 }),
  roller: new THREE.MeshStandardMaterial({ color: '#718096', roughness: 0.35, metalness: 0.80 }),
  leg:    new THREE.MeshStandardMaterial({ color: '#1e2d3d', roughness: 0.65, metalness: 0.50 }),
  endCap: new THREE.MeshStandardMaterial({ color: '#3b4e63', roughness: 0.45, metalness: 0.70 }),
  hitbox: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
};

// ─── Source ring (static — no useFrame) ──────────────────────────────────────
export function ConveyorSourceRing() {
  return (
    <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.0, 2.8, 32]} />
      <meshBasicMaterial color="#f97316" transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

// ─── Rollers — ONE InstancedMesh = ONE draw call regardless of belt length ────
function BeltRollers({ len }) {
  const meshRef = useRef();
  const count   = useMemo(() => Math.max(2, Math.floor(len / 1.05)), [len]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const step = len / count;
    for (let i = 0; i < count; i++) {
      const z = -len / 2 + step * (i + 0.5);
      _dummy.position.set(0, -BELT_H * 0.5 + ROLLER_R * 0.5, z);
      _dummy.rotation.set(0, 0, Math.PI / 2); // lie along X axis
      _dummy.scale.setScalar(1);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [len, count]);

  return (
    <instancedMesh ref={meshRef} args={[GEO.roller, MAT.roller, count]} />
  );
}

// ─── Support legs — pairs of posts + cross brace at regular intervals ─────────
function SupportLegs({ len }) {
  const positions = useMemo(() => {
    const n = Math.max(2, Math.round(len / LEG_SPACE) + 1);
    return Array.from({ length: n }, (_, i) => -len / 2 + (len / (n - 1)) * i);
  }, [len]);

  return (
    <>
      {positions.map((z, i) => (
        <group key={i} position={[0, -(RAIL_H * 0.5 + 0.17), z]}>
          <mesh geometry={GEO.legPost} material={MAT.leg} position={[-0.40, 0, 0]} rotation={[0, 0,  0.10]} />
          <mesh geometry={GEO.legPost} material={MAT.leg} position={[ 0.40, 0, 0]} rotation={[0, 0, -0.10]} />
          <mesh geometry={GEO.legCross} material={MAT.leg} />
        </group>
      ))}
    </>
  );
}

// ─── Интерполяция позиции вдоль ломаной (polyline) ───────────────────────────
function lerpPolyline(pts, t, out) {
  let total = 0;
  const lens = [0];
  for (let i = 1; i < pts.length; i++) {
    total += pts[i - 1].distanceTo(pts[i]);
    lens.push(total);
  }
  if (total < 0.001) { out.copy(pts[0]); return; }
  const d = Math.max(0, Math.min(1, t)) * total;
  for (let i = 1; i < pts.length; i++) {
    if (d <= lens[i] || i === pts.length - 1) {
      const segLen = lens[i] - lens[i - 1];
      const segT   = segLen > 0.001 ? (d - lens[i - 1]) / segLen : 0;
      out.lerpVectors(pts[i - 1], pts[i], Math.max(0, Math.min(1, segT)));
      return;
    }
  }
}

// ─── Движущиеся грузы вдоль ломаной ──────────────────────────────────────────
function AnimatedItemsPolyline({ points, offsets, speed, color, resource }) {
  const geo      = resource === 'coins' ? GEO.coin : GEO.item;
  const meshRef  = useRef();
  const frameRef = useRef(0);
  const timesRef = useRef(offsets.slice());

  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color,
      emissive:          new THREE.Color(color),
      emissiveIntensity: 0.35,
      roughness:         0.65,
      metalness:         0.25,
    }),
    [color],
  );

  useFrame((_, dt) => {
    if (++frameRef.current % 2 !== 0) return;
    const mesh = meshRef.current;
    if (!mesh || !points || points.length < 2 || offsets.length === 0) return;
    const times = timesRef.current;
    for (let i = 0; i < times.length; i++) {
      times[i] = (times[i] + dt * speed) % 1;
      lerpPolyline(points, times[i], _dummy.position);
      _dummy.position.y += resource === 'coins' ? 0.12 : 0.20;
      if (resource === 'coins') {
        _dummy.rotation.set(Math.PI / 2, times[i] * Math.PI * 4, 0);
      } else {
        _dummy.rotation.set(0, times[i] * Math.PI * 0.3, 0);
      }
      _dummy.scale.setScalar(1);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (offsets.length === 0) return null;
  return <instancedMesh ref={meshRef} args={[geo, mat, offsets.length]} />;
}

// ─── Один сегмент ленты между двумя точками ───────────────────────────────────
function BeltSegmentBody({ ax, az, bx, bz, onPointerDown, showEndCap }) {
  const { mid, angle, len } = useMemo(() => {
    const from = new THREE.Vector3(ax, BELT_Y, az);
    const to   = new THREE.Vector3(bx, BELT_Y, bz);
    const dir  = new THREE.Vector3().subVectors(to, from);
    const l    = dir.length();
    const m    = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const a    = Math.atan2(dir.x, dir.z);
    return { mid: m, angle: a, len: l };
  }, [ax, az, bx, bz]);

  if (len < 0.05) return null;

  return (
    <group position={mid.toArray()} rotation={[0, angle, 0]} onPointerDown={onPointerDown}>
      <mesh visible={false} geometry={GEO.hitbox} material={MAT.hitbox} scale={[1, 1, len]} />
      <mesh receiveShadow geometry={GEO.beltSurface} material={MAT.rubber} scale={[1, 1, len]} />
      <mesh geometry={GEO.sideRail} material={MAT.rail}
        position={[-RAIL_X, RAIL_H * 0.5 - BELT_H * 0.1, 0]} scale={[1, 1, len + 0.14]} />
      <mesh geometry={GEO.sideRail} material={MAT.rail}
        position={[ RAIL_X, RAIL_H * 0.5 - BELT_H * 0.1, 0]} scale={[1, 1, len + 0.14]} />
      {/* Барабан/шкив на начале каждого сегмента */}
      <mesh geometry={GEO.endCap} material={MAT.endCap}
        rotation={[0, 0, Math.PI / 2]} position={[0, ROLLER_R, -len / 2]} />
      {/* Барабан/шкив на конце только финального сегмента */}
      {showEndCap && (
        <mesh geometry={GEO.endCap} material={MAT.endCap}
          rotation={[0, 0, Math.PI / 2]} position={[0, ROLLER_R, len / 2]} />
      )}
      <BeltRollers len={len} />
      <SupportLegs len={len} />
    </group>
  );
}

// ─── Конвейерная лента — поддерживает waypoints (маршрут с изгибами) ──────────
export function ConveyorBelt({ fromId, toId, waypoints = [], placedItems, effectiveRate, onRightClick }) {
  const { rightClickHitRef } = useContext(CityContext);
  const from = placedItems.find(i => i.id === fromId);
  const to   = placedItems.find(i => i.id === toId);
  if (!from || !to) return null;

  const rule    = getTransferRule(from.type, to.type);
  const outPort = getConveyorOutPort(from.type);
  const inPort  = getConveyorInPort(to.type);

  // Полный маршрут: выходной порт источника → точки пути → входной порт назначения
  const allPoints = useMemo(() => [
    new THREE.Vector3(
      from.position[0] + (outPort?.dx ?? 0), BELT_Y,
      from.position[2] + (outPort?.dz ?? 0),
    ),
    ...(waypoints ?? []).map(w => new THREE.Vector3(w.x, BELT_Y, w.z)),
    new THREE.Vector3(
      to.position[0] + (inPort?.dx ?? 0), BELT_Y,
      to.position[2] + (inPort?.dz ?? 0),
    ),
  ], // eslint-disable-next-line react-hooks/exhaustive-deps
  [from.position[0], from.position[2], to.position[0], to.position[2], JSON.stringify(waypoints)]);

  const tokenCount = effectiveRate > 0
    ? Math.max(1, Math.min(3, Math.round(3 * effectiveRate / BASE_RATE)))
    : 0;
  const SPEED = effectiveRate > 0 ? Math.max(0.02, 0.12 * effectiveRate / BASE_RATE) : 0;
  const itemOffsets = useMemo(
    () => tokenCount > 0 ? Array.from({ length: tokenCount }, (_, i) => i / tokenCount) : [],
    [tokenCount], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const ruleColor = rule?.color ?? '#fbbf24';
  // Лейбл ставится примерно в центр пути
  const midPoint = allPoints[Math.floor(allPoints.length / 2)];

  const handlePointerDown = (e) => {
    if (e.button === 2) {
      e.stopPropagation();
      rightClickHitRef.current = true;
      onRightClick?.(e.nativeEvent.clientX, e.nativeEvent.clientY);
    }
  };

  return (
    <group>
      {/* Все сегменты ленты по маршруту */}
      {allPoints.slice(0, -1).map((pt, i) => (
        <BeltSegmentBody
          key={i}
          ax={pt.x} az={pt.z}
          bx={allPoints[i + 1].x} bz={allPoints[i + 1].z}
          onPointerDown={handlePointerDown}
          showEndCap={i === allPoints.length - 2}
        />
      ))}

      {/* Грузы, движущиеся вдоль всего маршрута */}
      <AnimatedItemsPolyline
        points={allPoints}
        offsets={itemOffsets}
        speed={SPEED}
        color={ruleColor}
        resource={rule?.resource}
      />

      {/* Лейбл с текущей скоростью передачи */}
      <ConnectionLabel
        midPos={[midPoint.x, midPoint.y + 2, midPoint.z]}
        icon={rule?.icon ?? '🛤️'}
        rate={effectiveRate}
        unit={rule?.unit ?? '/ч'}
        color={ruleColor}
      />
    </group>
  );
}
