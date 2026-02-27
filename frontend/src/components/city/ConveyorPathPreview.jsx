// ─── ConveyorPathPreview.jsx ─────────────────────────────────────────────────
//
// Визуальный призрак маршрута конвейера в режиме прокладки пути (Factorio-стиль).
// Рисует оранжевую линию: исток → точки-ориентиры → курсор.
// Маркеры-сферы показывают уже поставленные точки.
// Курсор привязывается к сетке (snapConveyorPoint).

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getConveyorOutPort } from '../systems/conveyor.js';

// Шаг привязки к сетке (в мировых единицах)
export const CONVEYOR_SNAP = 1;

export function snapConveyorPoint(x, z) {
  return {
    x: Math.round(x / CONVEYOR_SNAP) * CONVEYOR_SNAP,
    z: Math.round(z / CONVEYOR_SNAP) * CONVEYOR_SNAP,
  };
}

const PREVIEW_Y = 0.55; // чуть выше поверхности ленты

// ─── Материалы и геометрии (создаются один раз) ───────────────────────────────
const _dotMat  = new THREE.MeshBasicMaterial({ color: '#f97316', transparent: true, opacity: 0.75, depthTest: false });
const _dotGeo  = new THREE.SphereGeometry(0.22, 6, 4);
const _snapMat = new THREE.MeshBasicMaterial({ color: '#fbbf24', transparent: true, opacity: 0.95, depthTest: false });
const _snapGeo = new THREE.SphereGeometry(0.30, 6, 4);

// ─── Маркеры точек-ориентиров (обновляются каждые 3 кадра) ───────────────────
function WaypointDots({ waypointsRef }) {
  const groupRef = useRef();
  const frameRef = useRef(0);

  useFrame(() => {
    if (++frameRef.current % 3 !== 0) return;
    const g = groupRef.current;
    if (!g) return;
    // Удаляем все старые
    while (g.children.length > 0) g.remove(g.children[0]);
    for (const w of waypointsRef.current) {
      const mesh = new THREE.Mesh(_dotGeo, _dotMat);
      mesh.position.set(w.x, PREVIEW_Y, w.z);
      g.add(mesh);
    }
  });

  return <group ref={groupRef} />;
}

// ─── Индикатор привязки курсора ───────────────────────────────────────────────
function SnapCursor({ cursorRef }) {
  const meshRef  = useRef();
  const frameRef = useRef(0);

  useFrame(() => {
    if (++frameRef.current % 2 !== 0) return;
    const mesh = meshRef.current;
    if (!mesh) return;
    if (!cursorRef?.current) { mesh.visible = false; return; }
    const { x, z } = snapConveyorPoint(cursorRef.current.x, cursorRef.current.z);
    mesh.position.set(x, PREVIEW_Y, z);
    mesh.visible = true;
  });

  return <mesh ref={meshRef} geometry={_snapGeo} material={_snapMat} visible={false} />;
}

// ─── Основной компонент превью ────────────────────────────────────────────────
// Props:
//   sourceId      — id здания-источника
//   placedItems   — массив зданий
//   waypointsRef  — ref с массивом [{x, z}, ...] точек-ориентиров
//   cursorRef     — ref с текущим {x, z} позицией мыши
export function ConveyorPathPreview({ sourceId, placedItems, waypointsRef, cursorRef }) {
  const lineRef  = useRef();
  const frameRef = useRef(0);

  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  useEffect(() => () => geo.dispose(), [geo]);

  const source = placedItems.find(i => i.id === sourceId);

  useFrame(() => {
    if (++frameRef.current % 2 !== 0) return;
    if (!source || !lineRef.current) return;

    const outPort = getConveyorOutPort(source.type);
    const pts = [
      new THREE.Vector3(
        source.position[0] + (outPort?.dx ?? 0),
        PREVIEW_Y,
        source.position[2] + (outPort?.dz ?? 0),
      ),
      ...waypointsRef.current.map(w => new THREE.Vector3(w.x, PREVIEW_Y, w.z)),
    ];

    if (cursorRef?.current) {
      const { x, z } = snapConveyorPoint(cursorRef.current.x, cursorRef.current.z);
      pts.push(new THREE.Vector3(x, PREVIEW_Y, z));
    }

    if (pts.length >= 2) {
      geo.setFromPoints(pts);
    }
  });

  if (!source) return null;

  return (
    <group>
      {/* Линия пути */}
      <line ref={lineRef} geometry={geo}>
        <lineBasicMaterial color="#f97316" transparent opacity={0.85} depthTest={false} />
      </line>

      {/* Маркеры точек-ориентиров */}
      <WaypointDots waypointsRef={waypointsRef} />

      {/* Привязанная позиция курсора */}
      <SnapCursor cursorRef={cursorRef} />
    </group>
  );
}
