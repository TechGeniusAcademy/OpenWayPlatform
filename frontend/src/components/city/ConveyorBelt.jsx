import { useRef, useMemo, useContext, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTransferRule, getConveyorOutPort, getConveyorInPort } from '../systems/conveyor.js';
import { ConnectionLabel } from './ConnectionLabel.jsx';
import { CityContext } from './CityContext.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_RATE  = 10;
const BELT_Y     = 0.42;
const BELT_W     = 0.96;
const BELT_H     = 0.07;
const RAIL_H     = 0.26;
const RAIL_X     = 0.54;
const ROLLER_R   = 0.055;
const ROLLER_SEG = 6;
const LEG_SPACE  = 3.6;

// Shared dummy for frame-level instanced updates
const _dummy = new THREE.Object3D();
const _dir   = new THREE.Vector3();

// ─── Template geometries (unit-size, never mutated — cloned per merge) ────────
const TMPL = {
  beltSurface: new THREE.BoxGeometry(BELT_W, BELT_H, 1),
  sideRail:    new THREE.BoxGeometry(0.09, RAIL_H, 1),
  legPost:     new THREE.BoxGeometry(0.07, 0.36, 0.07),
  legCross:    new THREE.BoxGeometry(0.88, 0.05, 0.06),
  endCap:      new THREE.CylinderGeometry(RAIL_H * 0.5, RAIL_H * 0.5, BELT_W + 0.18, 8),
  roller:      new THREE.CylinderGeometry(ROLLER_R, ROLLER_R, BELT_W + 0.12, ROLLER_SEG),
  coin:        new THREE.CylinderGeometry(0.18, 0.18, 0.06, 10),
  item:        new THREE.BoxGeometry(0.30, 0.24, 0.30),
  hitSeg:      new THREE.BoxGeometry(1.4, 0.5, 1),
};

// ─── Shared materials ─────────────────────────────────────────────────────────
const MAT = {
  rubber: new THREE.MeshStandardMaterial({ color: '#17202a', roughness: 0.97, metalness: 0.02 }),
  rail:   new THREE.MeshStandardMaterial({ color: '#2d3e50', roughness: 0.55, metalness: 0.65 }),
  roller: new THREE.MeshStandardMaterial({ color: '#718096', roughness: 0.35, metalness: 0.80 }),
  leg:    new THREE.MeshStandardMaterial({ color: '#1e2d3d', roughness: 0.65, metalness: 0.50 }),
  endCap: new THREE.MeshStandardMaterial({ color: '#3b4e63', roughness: 0.45, metalness: 0.70 }),
  hitbox: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
};

// ─── Bezier routing parameters ────────────────────────────────────────────────
const JOINT_RADIUS = 0.75;
const CURVE_STEPS  = 8;

// ─── Geometry merge helper (no external deps) ─────────────────────────────────
function mergeGeos(geos) {
  if (geos.length === 0) return new THREE.BufferGeometry();
  if (geos.length === 1) return geos[0];

  let totalVerts = 0;
  let totalIdxs  = 0;
  let hasIdx     = false;
  for (const g of geos) {
    totalVerts += g.attributes.position.count;
    if (g.index) { totalIdxs += g.index.count; hasIdx = true; }
  }

  const posBuf = new Float32Array(totalVerts * 3);
  const norBuf = new Float32Array(totalVerts * 3);
  const uvBuf  = new Float32Array(totalVerts * 2);
  const idxArr = hasIdx ? [] : null;

  let vOff = 0;
  for (const g of geos) {
    const n = g.attributes.position.count;
    posBuf.set(g.attributes.position.array, vOff * 3);
    if (g.attributes.normal) norBuf.set(g.attributes.normal.array, vOff * 3);
    if (g.attributes.uv)     uvBuf.set(g.attributes.uv.array,     vOff * 2);
    if (idxArr && g.index) {
      const ia = g.index.array;
      for (let i = 0; i < ia.length; i++) idxArr.push(ia[i] + vOff);
    }
    vOff += n;
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(posBuf, 3));
  out.setAttribute('normal',   new THREE.BufferAttribute(norBuf, 3));
  out.setAttribute('uv',       new THREE.BufferAttribute(uvBuf,  2));
  if (idxArr) out.setIndex(idxArr);
  return out;
}

// ─── World-space transformed geometry clone ───────────────────────────────────
const _pObj = new THREE.Object3D();
const _cObj = new THREE.Object3D();
const _mat4 = new THREE.Matrix4();
const _V0   = new THREE.Vector3(0, 0, 0);
const _V1   = new THREE.Vector3(1, 1, 1);

function tGeo(tmpl, groupPos, groupAngleY, localPos, localScaleVec, localRz) {
  const geo = tmpl.clone();
  _pObj.position.copy(groupPos);
  _pObj.rotation.set(0, groupAngleY, 0);
  _pObj.scale.set(1, 1, 1);
  _pObj.updateMatrix();
  _cObj.position.copy(localPos ?? _V0);
  _cObj.scale.copy(localScaleVec ?? _V1);
  _cObj.rotation.set(0, 0, localRz ?? 0);
  _cObj.updateMatrix();
  _mat4.multiplyMatrices(_pObj.matrix, _cObj.matrix);
  geo.applyMatrix4(_mat4);
  return geo;
}

// ─── Segment mid/angle/len ────────────────────────────────────────────────────
function segInfo(ax, az, bx, bz) {
  const from  = new THREE.Vector3(ax, BELT_Y, az);
  const to    = new THREE.Vector3(bx, BELT_Y, bz);
  const dir   = new THREE.Vector3().subVectors(to, from);
  const len   = dir.length();
  const mid   = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const angle = Math.atan2(dir.x, dir.z);
  return { mid, angle, len };
}

// ─── Build full merged belt geometry (called in useMemo) ──────────────────────
function buildMergedBelt(straightSegs, curveSegs) {
  const rubberGeos = [];
  const railGeos   = [];
  const legGeos    = [];
  const rollerGeos = [];
  const endCapGeos = [];

  function addBeltRail(mid, angle, len) {
    rubberGeos.push(tGeo(TMPL.beltSurface, mid, angle, null, new THREE.Vector3(1, 1, len + 0.10)));
    railGeos.push(tGeo(TMPL.sideRail, mid, angle, new THREE.Vector3(-RAIL_X, RAIL_H * 0.5 - BELT_H * 0.1, 0), new THREE.Vector3(1, 1, len + 0.18)));
    railGeos.push(tGeo(TMPL.sideRail, mid, angle, new THREE.Vector3( RAIL_X, RAIL_H * 0.5 - BELT_H * 0.1, 0), new THREE.Vector3(1, 1, len + 0.18)));
  }

  // Compact curve mini-segments — belt + rails only
  for (const segs of curveSegs) {
    for (const seg of segs) {
      const { mid, angle, len } = segInfo(seg.ax, seg.az, seg.bx, seg.bz);
      if (len < 0.05) continue;
      addBeltRail(mid, angle, len);
    }
  }

  // Straight segments — belt + rails + rollers + legs + endCaps
  for (let si = 0; si < straightSegs.length; si++) {
    const seg    = straightSegs[si];
    const { mid, angle, len } = segInfo(seg.ax, seg.az, seg.bx, seg.bz);
    if (len < 0.05) continue;
    const isLast = si === straightSegs.length - 1;

    addBeltRail(mid, angle, len);

    // Rollers
    const rCount = Math.max(2, Math.floor(len / 1.05));
    const rStep  = len / rCount;
    for (let i = 0; i < rCount; i++) {
      const z = -len / 2 + rStep * (i + 0.5);
      rollerGeos.push(tGeo(TMPL.roller, mid, angle, new THREE.Vector3(0, -BELT_H * 0.5 + ROLLER_R * 0.5, z), null, Math.PI / 2));
    }

    // EndCap at start of every straight segment
    endCapGeos.push(tGeo(TMPL.endCap, mid, angle, new THREE.Vector3(0, ROLLER_R, -len / 2), null, Math.PI / 2));
    if (isLast)
      endCapGeos.push(tGeo(TMPL.endCap, mid, angle, new THREE.Vector3(0, ROLLER_R,  len / 2), null, Math.PI / 2));

    // Support legs
    const legCount = Math.max(2, Math.round(len / LEG_SPACE) + 1);
    const legY     = -(RAIL_H * 0.5 + 0.17);
    for (let li = 0; li < legCount; li++) {
      const lz = -len / 2 + (len / (legCount - 1)) * li;
      legGeos.push(tGeo(TMPL.legPost,  mid, angle, new THREE.Vector3(-0.40, legY, lz), null,  0.10));
      legGeos.push(tGeo(TMPL.legPost,  mid, angle, new THREE.Vector3( 0.40, legY, lz), null, -0.10));
      legGeos.push(tGeo(TMPL.legCross, mid, angle, new THREE.Vector3(0,    legY, lz)));
    }
  }

  return {
    rubberGeo: mergeGeos(rubberGeos),
    railGeo:   mergeGeos(railGeos),
    rollerGeo: mergeGeos(rollerGeos),
    endCapGeo: mergeGeos(endCapGeos),
    legGeo:    mergeGeos(legGeos),
  };
}

// ─── Bezier route builder ─────────────────────────────────────────────────────
function buildBeltRoute(pts) {
  if (pts.length < 2) return { straightSegs: [], curveSegs: [], animPoints: pts };
  const n = pts.length;
  const straightSegs = [];
  const curveSegs    = [];
  const animPoints   = [pts[0].clone()];
  let segStart = pts[0].clone();

  for (let i = 1; i < n; i++) {
    const isLast = i === n - 1;
    const cur    = pts[i];
    if (!isLast) {
      const dirIn  = new THREE.Vector3().subVectors(cur, pts[i - 1]).normalize();
      const dirOut = new THREE.Vector3().subVectors(pts[i + 1], cur).normalize();
      const r = Math.min(JOINT_RADIUS, pts[i - 1].distanceTo(cur) * 0.45, cur.distanceTo(pts[i + 1]) * 0.45);
      const jIn  = cur.clone().sub(dirIn.clone().multiplyScalar(r));
      const jOut = cur.clone().add(dirOut.clone().multiplyScalar(r));
      if (segStart.distanceTo(jIn) > 0.05)
        straightSegs.push({ ax: segStart.x, az: segStart.z, bx: jIn.x, bz: jIn.z });
      animPoints.push(jIn.clone());
      const curvePts = new THREE.QuadraticBezierCurve3(jIn, cur, jOut).getPoints(CURVE_STEPS);
      const miniSegs = [];
      for (let k = 0; k < curvePts.length - 1; k++) {
        miniSegs.push({ ax: curvePts[k].x, az: curvePts[k].z, bx: curvePts[k+1].x, bz: curvePts[k+1].z });
        animPoints.push(curvePts[k + 1].clone());
      }
      curveSegs.push(miniSegs);
      segStart = jOut.clone();
    } else {
      if (segStart.distanceTo(cur) > 0.05)
        straightSegs.push({ ax: segStart.x, az: segStart.z, bx: cur.x, bz: cur.z });
      animPoints.push(cur.clone());
    }
  }
  return { straightSegs, curveSegs, animPoints };
}

// ─── Source ring ──────────────────────────────────────────────────────────────
export function ConveyorSourceRing() {
  return (
    <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.0, 2.8, 32]} />
      <meshBasicMaterial color="#f97316" transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

// ─── Polyline helpers ─────────────────────────────────────────────────────────
function lerpPolyline(pts, t, out) {
  let total = 0;
  const lens = [0];
  for (let i = 1; i < pts.length; i++) { total += pts[i-1].distanceTo(pts[i]); lens.push(total); }
  if (total < 0.001) { out.copy(pts[0]); return; }
  const d = Math.max(0, Math.min(1, t)) * total;
  for (let i = 1; i < pts.length; i++) {
    if (d <= lens[i] || i === pts.length - 1) {
      const segLen = lens[i] - lens[i-1];
      out.lerpVectors(pts[i-1], pts[i], segLen > 0.001 ? Math.max(0, Math.min(1, (d - lens[i-1]) / segLen)) : 0);
      return;
    }
  }
}

function lerpPolylineDir(pts, t, out) {
  let total = 0;
  const lens = [0];
  for (let i = 1; i < pts.length; i++) { total += pts[i-1].distanceTo(pts[i]); lens.push(total); }
  if (total < 0.001) { out.set(0, 0, 1); return; }
  const d = Math.max(0, Math.min(1, t)) * total;
  for (let i = 1; i < pts.length; i++) {
    if (d <= lens[i] || i === pts.length - 1) {
      out.subVectors(pts[i], pts[i-1]).normalize();
      return;
    }
  }
}

// ─── Animated cargo items ─────────────────────────────────────────────────────
function AnimatedItemsPolyline({ points, offsets, speed, color, resource }) {
  const geo      = resource === 'coins' ? TMPL.coin : TMPL.item;
  const meshRef  = useRef();
  const frameRef = useRef(0);
  const timesRef = useRef(offsets.slice());

  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color,
      emissive: new THREE.Color(color), emissiveIntensity: 0.35,
      roughness: 0.65, metalness: 0.25,
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
      lerpPolylineDir(points, times[i], _dir);
      if (resource === 'coins') {
        _dummy.position.y += 0.12;
        _dummy.rotation.set(Math.PI / 2, 0, 0);
      } else {
        _dummy.position.y += 0.20;
        _dummy.rotation.set(0, Math.atan2(_dir.x, _dir.z), 0);
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

// ─── Main ConveyorBelt component ──────────────────────────────────────────────
export function ConveyorBelt({ fromId, toId, waypoints = [], placedItems, effectiveRate, onRightClick }) {
  const { rightClickHitRef } = useContext(CityContext);
  const from = placedItems.find(i => i.id === fromId);
  const to   = placedItems.find(i => i.id === toId);
  if (!from || !to) return null;

  const rule    = getTransferRule(from.type, to.type);
  const outPort = getConveyorOutPort(from.type);
  const inPort  = getConveyorInPort(to.type);

  const allPoints = useMemo(() => [
    new THREE.Vector3(from.position[0] + (outPort?.dx ?? 0), BELT_Y, from.position[2] + (outPort?.dz ?? 0)),
    ...(waypoints ?? []).map(w => new THREE.Vector3(w.x, BELT_Y, w.z)),
    new THREE.Vector3(to.position[0] + (inPort?.dx ?? 0),   BELT_Y, to.position[2] + (inPort?.dz ?? 0)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [from.position[0], from.position[2], to.position[0], to.position[2], JSON.stringify(waypoints)]);

  const { straightSegs, curveSegs, animPoints } = useMemo(
    () => buildBeltRoute(allPoints),
    [allPoints], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Merged geometry — 5 draw calls per belt regardless of length or waypoint count
  const merged = useMemo(
    () => buildMergedBelt(straightSegs, curveSegs),
    [straightSegs, curveSegs], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Dispose geometries on update / unmount
  const mergedRef = useRef(null);
  useEffect(() => {
    const prev = mergedRef.current;
    if (prev && prev !== merged) {
      Object.values(prev).forEach(g => g?.dispose?.());
    }
    mergedRef.current = merged;
    return () => { Object.values(merged).forEach(g => g?.dispose?.()); };
  }, [merged]);

  const tokenCount = effectiveRate > 0 ? Math.max(1, Math.min(3, Math.round(3 * effectiveRate / BASE_RATE))) : 0;
  const SPEED      = effectiveRate > 0 ? Math.max(0.02, 0.12 * effectiveRate / BASE_RATE) : 0;
  const itemOffsets = useMemo(
    () => tokenCount > 0 ? Array.from({ length: tokenCount }, (_, i) => i / tokenCount) : [],
    [tokenCount], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const ruleColor = rule?.color ?? '#fbbf24';
  const midPoint  = allPoints[Math.floor(allPoints.length / 2)];

  const handlePointerDown = (e) => {
    if (e.button === 2) {
      e.stopPropagation();
      rightClickHitRef.current = true;
      onRightClick?.(e.nativeEvent.clientX, e.nativeEvent.clientY);
    }
  };

  return (
    <group>
      {/* 5 draw calls — entire belt merged per material */}
      <mesh receiveShadow geometry={merged.rubberGeo} material={MAT.rubber} />
      <mesh geometry={merged.railGeo}   material={MAT.rail}   />
      <mesh geometry={merged.rollerGeo} material={MAT.roller} />
      <mesh geometry={merged.endCapGeo} material={MAT.endCap} />
      <mesh geometry={merged.legGeo}    material={MAT.leg}    />

      {/* Invisible hitboxes for right-click detection (per straight segment) */}
      {straightSegs.map((s, i) => {
        const { mid, angle, len } = segInfo(s.ax, s.az, s.bx, s.bz);
        return (
          <mesh key={i} position={mid.toArray()} rotation={[0, angle, 0]}
            geometry={TMPL.hitSeg} material={MAT.hitbox} scale={[1, 1, len]}
            onPointerDown={handlePointerDown}
          />
        );
      })}

      {/* Cargo items animate along a dense bezier-accurate polyline */}
      <AnimatedItemsPolyline
        points={animPoints} offsets={itemOffsets}
        speed={SPEED} color={ruleColor} resource={rule?.resource}
      />

      <ConnectionLabel
        midPos={[midPoint.x, midPoint.y + 2, midPoint.z]}
        icon={rule?.icon ?? 'road'}
        rate={effectiveRate}
        unit={rule?.unit ?? '/ч'}
        color={ruleColor}
      />
    </group>
  );
}
