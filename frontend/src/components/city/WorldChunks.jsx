import { useState, useMemo, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CHUNK_SIZE, RENDER_DIST } from './CityContext.js';
import { registerOreDeposit, unregisterOreDeposit } from '../systems/oreRegistry.js';

// ─── Shared geometries (created once, reused) ─────────────────────────────────
// NOTE: created at module scope — reused across all instances for performance.

const GEO = {
  trunk:      new THREE.CylinderGeometry(0.18, 0.28, 2.2, 7),
  trunkTall:  new THREE.CylinderGeometry(0.14, 0.24, 3.2, 7),
  trunkShort: new THREE.CylinderGeometry(0.16, 0.24, 1.4, 6),
  crown:      new THREE.SphereGeometry(1.4, 8, 7),
  crownWide:  new THREE.SphereGeometry(2.0, 8, 6),
  crownSmall: new THREE.SphereGeometry(0.9, 7, 6),
  cone:       new THREE.ConeGeometry(1.3, 3.2, 8),
  coneTop:    new THREE.ConeGeometry(0.85, 2.2, 8),
  rock:       new THREE.IcosahedronGeometry(0.7, 0),
  rockBig:    new THREE.IcosahedronGeometry(1.1, 0),
  rockSmall:  new THREE.IcosahedronGeometry(0.42, 0),
  oreNode:    new THREE.IcosahedronGeometry(0.5, 0),
  oreVein:    new THREE.OctahedronGeometry(0.28, 0),
  lake:       new THREE.CircleGeometry(5.5, 20),
  lakeSm:     new THREE.CircleGeometry(3.2, 16),
  // Shared reed geometries — 3 size buckets instead of per-reed inline allocation
  reedSm:     new THREE.CylinderGeometry(0.04, 0.07, 0.6,  4),
  reedMd:     new THREE.CylinderGeometry(0.04, 0.07, 0.9,  4),
  reedLg:     new THREE.CylinderGeometry(0.04, 0.07, 1.15, 4),
};

// ─── Shared materials ─────────────────────────────────────────────────────────

const MAT = {
  trunk:      new THREE.MeshStandardMaterial({ color: '#5c3d1e', roughness: 0.9, metalness: 0 }),
  leafGreen:  new THREE.MeshStandardMaterial({ color: '#2a5a2a', roughness: 0.85, metalness: 0 }),
  leafDark:   new THREE.MeshStandardMaterial({ color: '#1a3d1a', roughness: 0.85, metalness: 0 }),
  leafLight:  new THREE.MeshStandardMaterial({ color: '#3d7a3d', roughness: 0.8,  metalness: 0 }),
  leafAutumn: new THREE.MeshStandardMaterial({ color: '#7a4010', roughness: 0.8,  metalness: 0 }),
  rockGray:   new THREE.MeshStandardMaterial({ color: '#6b6b6b', roughness: 0.95, metalness: 0.05 }),
  rockBrown:  new THREE.MeshStandardMaterial({ color: '#7a5c3a', roughness: 0.95, metalness: 0 }),
  coal:       new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9,  metalness: 0.1  }),
  coalVein:   new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.6,  metalness: 0.25, emissive: new THREE.Color('#0a0a0a') }),
  iron:       new THREE.MeshStandardMaterial({ color: '#5a3a2a', roughness: 0.85, metalness: 0.15 }),
  ironVein:   new THREE.MeshStandardMaterial({ color: '#c0581a', roughness: 0.5,  metalness: 0.4,  emissive: new THREE.Color('#3a1800') }),
  silver:     new THREE.MeshStandardMaterial({ color: '#7a7a80', roughness: 0.5,  metalness: 0.7  }),
  silverVein: new THREE.MeshStandardMaterial({ color: '#c8c8d4', roughness: 0.2,  metalness: 0.9,  emissive: new THREE.Color('#303040') }),
  gold:       new THREE.MeshStandardMaterial({ color: '#6b5a2a', roughness: 0.7,  metalness: 0.2  }),
  goldVein:   new THREE.MeshStandardMaterial({ color: '#f0c030', roughness: 0.2,  metalness: 0.85, emissive: new THREE.Color('#604800') }),
  diamond:    new THREE.MeshStandardMaterial({ color: '#4a5a6a', roughness: 0.5,  metalness: 0.2  }),
  diamondVein:new THREE.MeshStandardMaterial({ color: '#80d8ff', roughness: 0.05, metalness: 0.9,  emissive: new THREE.Color('#003060'), transparent: true, opacity: 0.92 }),
  // roughness 0.55 + metalness 0.05 → no mirror specular, no harsh glinting
  waterSurf:  new THREE.MeshStandardMaterial({ color: '#1a6a9a', roughness: 0.55, metalness: 0.05, transparent: true, opacity: 0.82 }),
  waterShore: new THREE.MeshStandardMaterial({ color: '#144060', roughness: 0.6,  metalness: 0.0,  transparent: true, opacity: 0.45 }),
  shore:      new THREE.MeshStandardMaterial({ color: '#8a7a5a', roughness: 0.97, metalness: 0 }),
  reed:       new THREE.MeshStandardMaterial({ color: '#5a7a3a', roughness: 0.9,  metalness: 0 }),
};

// ─── Deterministic RNG ────────────────────────────────────────────────────────

function mkRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function chunkSeed(cx, cz) {
  return ((cx * 73856093) ^ (cz * 19349663)) >>> 0;
}

// ─── Shared info popup (rendered inside canvas via Html) ─────────────────────

const HITBOX_MAT = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

// Module-level tracker — only one info popup open at a time
let _closeActive = null;
function openInfo(setOpen) {
  if (_closeActive) { _closeActive(); }
  setOpen(true);
  _closeActive = () => setOpen(false);
}

function InfoPopup({ height, icon, title, subtitle, color, onClose }) {
  return (
    <Html position={[0, height, 0]} center distanceFactor={28} zIndexRange={[50, 51]}>
      <div
        onPointerDown={e => e.stopPropagation()}
        style={{
          background:    'rgba(8,12,22,0.96)',
          border:        `1px solid ${color}60`,
          borderTop:     `3px solid ${color}`,
          borderRadius:  10,
          padding:       '8px 14px 8px 10px',
          minWidth:      148,
          fontFamily:    'sans-serif',
          userSelect:    'none',
          pointerEvents: 'auto',
          boxShadow:     `0 6px 24px rgba(0,0,0,0.7), 0 0 12px ${color}18`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#f3f4f6', lineHeight: 1.3 }}>{title}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{subtitle}</div>
          </div>
          <span
            onPointerDown={e => { e.stopPropagation(); onClose(); }}
            style={{ cursor: 'pointer', color: '#6b7280', fontSize: 15, padding: '0 3px', lineHeight: 1 }}
          >✕</span>
        </div>
      </div>
    </Html>
  );
}

// ─── Pine tree ────────────────────────────────────────────────────────────────

function PineTree({ x, z, rng }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { scale, ry, leafMat } = useMemo(() => ({
    scale:   0.8 + rng() * 0.7,
    ry:      rng() * Math.PI * 2,
    leafMat: rng() > 0.5 ? MAT.leafDark : MAT.leafGreen,
  }), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]} scale={[scale, scale, scale]}>
      <mesh geometry={GEO.trunkTall} material={MAT.trunk}  position={[0, 1.6, 0]} />
      <mesh geometry={GEO.cone}      material={leafMat}    position={[0, 4.6, 0]} />
      <mesh geometry={GEO.coneTop}   material={leafMat}    position={[0, 6.2, 0]} scale={[0.78, 0.88, 0.78]} />
      {/* Hitbox */}
      <mesh position={[0, 3.5, 0]} material={HITBOX_MAT}
        onPointerDown={e => { if (e.button === 0) { e.stopPropagation(); openInfo(setOpen); } }}
      >
        <cylinderGeometry args={[1.4, 1.4, 7, 8]} />
      </mesh>
      {open && <InfoPopup height={8.5} icon="🌲" title="Сосна" subtitle="Источник древесины" color="#4ade80" onClose={close} />}
    </group>
  );
}

// ─── Round-crown tree ─────────────────────────────────────────────────────────

function RoundTree({ x, z, rng }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { scale, ry, leafMat, crownGeo } = useMemo(() => {
    const mats = [MAT.leafGreen, MAT.leafLight, MAT.leafAutumn];
    return {
      scale:    0.75 + rng() * 0.8,
      ry:       rng() * Math.PI * 2,
      leafMat:  mats[Math.floor(rng() * mats.length)],
      crownGeo: rng() > 0.45 ? GEO.crownWide : GEO.crown,
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]} scale={[scale, scale, scale]}>
      <mesh geometry={GEO.trunk}   material={MAT.trunk}  position={[0, 1.1, 0]} />
      <mesh geometry={crownGeo}    material={leafMat}    position={[0, 3.4, 0]} />
      {/* Hitbox */}
      <mesh position={[0, 2.5, 0]} material={HITBOX_MAT}
        onPointerDown={e => { if (e.button === 0) { e.stopPropagation(); openInfo(setOpen); } }}
      >
        <cylinderGeometry args={[1.8, 1.8, 5, 8]} />
      </mesh>
      {open && <InfoPopup height={6.5} icon="🌳" title="Дерево" subtitle="Источник древесины" color="#86efac" onClose={close} />}
    </group>
  );
}

// ─── Bushy multi-sphere tree ──────────────────────────────────────────────────

/* eslint-disable react/no-array-index-key */
const BUSH_OFFSETS = [[0,2.2,0,1.0],[0.9,1.9,0.5,0.8],[-0.8,1.8,-0.4,0.75],[0.3,2.7,-0.7,0.65]];

function BushyTree({ x, z, rng }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { scale, ry, bushMats } = useMemo(() => ({
    scale:    0.7 + rng() * 0.5,
    ry:       rng() * Math.PI * 2,
    bushMats: BUSH_OFFSETS.map(() => ({
      geo: rng() > 0.5 ? GEO.crown : GEO.crownSmall,
      mat: rng() > 0.4 ? MAT.leafGreen : MAT.leafDark,
    })),
  }), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]} scale={[scale, scale, scale]}>
      <mesh geometry={GEO.trunkShort} material={MAT.trunk} position={[0, 0.7, 0]} />
      {BUSH_OFFSETS.map(([ox, oy, oz, s], i) => (
        <mesh key={i}
          geometry={bushMats[i].geo}
          material={bushMats[i].mat}
          position={[ox, oy, oz]}
          scale={[s, s, s]}
        />
      ))}
      {/* Hitbox */}
      <mesh position={[0, 1.5, 0]} material={HITBOX_MAT}
        onPointerDown={e => { if (e.button === 0) { e.stopPropagation(); openInfo(setOpen); } }}
      >
        <cylinderGeometry args={[1.6, 1.6, 3.5, 8]} />
      </mesh>
      {open && <InfoPopup height={4.5} icon="🌿" title="Кустарник" subtitle="Источник древесины" color="#bbf7d0" onClose={close} />}
    </group>
  );
}

// ─── Rock cluster ─────────────────────────────────────────────────────────────

function RockCluster({ x, z, rng }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { mat, rocks } = useMemo(() => {
    const m = rng() > 0.55 ? MAT.rockBrown : MAT.rockGray;
    const count = 2 + Math.floor(rng() * 3);
    return {
      mat: m,
      rocks: Array.from({ length: count }, () => ({
        ox: (rng() - 0.5) * 2.4, oz: (rng() - 0.5) * 2.4,
        s:  0.5 + rng() * 0.9,
        ry: rng() * Math.PI,     rx: rng() * 0.5,
        geo: rng() > 0.5 ? GEO.rockBig : GEO.rock,
        rz: rng() * 0.4,
      })),
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group position={[x, 0, z]}>
      {rocks.map((r, i) => (
        <mesh key={i}
          geometry={r.geo} material={mat}
          position={[r.ox, r.s * 0.4, r.oz]}
          rotation={[r.rx, r.ry, r.rz]}
          scale={[r.s, r.s * 0.7, r.s]}
        />
      ))}
      {/* Hitbox */}
      <mesh position={[0, 0.6, 0]} material={HITBOX_MAT}
        onPointerDown={e => { if (e.button === 0) { e.stopPropagation(); openInfo(setOpen); } }}
      >
        <cylinderGeometry args={[1.8, 1.8, 1.5, 8]} />
      </mesh>
      {open && <InfoPopup height={2.8} icon="🪨" title="Каменная россыпь" subtitle="Источник камня" color="#d1d5db" onClose={close} />}
    </group>
  );
}

// ─── Ore deposit ──────────────────────────────────────────────────────────────

const ORE_DEFS = [
  { name: 'Уголь',   icon: '⬛', color: '#52525b', rockMat: MAT.coal,    veinMat: MAT.coalVein    },  // 40%
  { name: 'Железо',  icon: '🟤', color: '#b45309', rockMat: MAT.iron,    veinMat: MAT.ironVein    },  // 30%
  { name: 'Серебро', icon: '🔘', color: '#94a3b8', rockMat: MAT.silver,  veinMat: MAT.silverVein  },  // 15%
  { name: 'Золото',  icon: '🟡', color: '#eab308', rockMat: MAT.gold,    veinMat: MAT.goldVein    },  // 10%
  { name: 'Алмаз',  icon: '💎', color: '#38bdf8', rockMat: MAT.diamond, veinMat: MAT.diamondVein },  //  5%
];
const ORE_CUM = [40, 70, 85, 95, 100]; // cumulative weights

function pickOre(rng) {
  const r = rng() * 100;
  return ORE_DEFS[ORE_CUM.findIndex(w => r < w)] ?? ORE_DEFS[0];
}

function OreDeposit({ x, z, rng }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { ore, baseRy, oreRocks, oreVeins } = useMemo(() => {
    const o      = pickOre(rng);
    const bRy    = rng() * Math.PI * 2;
    const count  = 3 + Math.floor(rng() * 3);
    const vCount = 2 + Math.floor(rng() * 3);
    return {
      ore:    o,
      baseRy: bRy,
      oreRocks: Array.from({ length: count }, () => ({
        ox: (rng() - 0.5) * 3.0, oz: (rng() - 0.5) * 3.0,
        s:  0.5 + rng() * 0.8,
        geo: rng() > 0.5 ? GEO.rockBig : GEO.rock,
        rx: rng() * 0.5, ry: rng() * Math.PI, rz: rng() * 0.4,
      })),
      oreVeins: Array.from({ length: vCount }, () => ({
        ox: (rng() - 0.5) * 2.4, oz: (rng() - 0.5) * 2.4,
        s:  0.4 + rng() * 0.45, oy: 0.55 + rng() * 0.4,
        rx: rng() * Math.PI, ry: rng() * Math.PI, rz: rng() * Math.PI,
      })),
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Register this ore deposit so the extractor can snap to it
  useEffect(() => {
    registerOreDeposit(x, z, ore.name, ore.icon, ore.color);
    return () => unregisterOreDeposit(x, z);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group position={[x, 0, z]} rotation={[0, baseRy, 0]}>
      {oreRocks.map((r, i) => (
        <mesh key={`r${i}`}
          geometry={r.geo} material={ore.rockMat}
          position={[r.ox, r.s * 0.35, r.oz]}
          rotation={[r.rx, r.ry, r.rz]}
          scale={[r.s, r.s * 0.65, r.s]}
        />
      ))}
      {oreVeins.map((v, i) => (
        <mesh key={`v${i}`}
          geometry={GEO.oreVein} material={ore.veinMat}
          position={[v.ox, v.oy, v.oz]}
          rotation={[v.rx, v.ry, v.rz]}
          scale={[v.s, v.s, v.s]}
        />
      ))}
      {/* Hitbox */}
      <mesh position={[0, 0.7, 0]} material={HITBOX_MAT}
        onPointerDown={e => { if (e.button === 0) { e.stopPropagation(); openInfo(setOpen); } }}
      >
        <cylinderGeometry args={[2.2, 2.2, 1.6, 8]} />
      </mesh>
      {open && <InfoPopup height={2.8} icon={ore.icon} title={`Залежь: ${ore.name}`} subtitle="Нажмите для добычи руды" color={ore.color} onClose={close} />}
    </group>
  );
}

// ─── Helpers: build organic lake / curved river geometries ───────────────────

function buildLakeGeo(rng, radius, subdivisions = 20) {
  const pts = [];
  for (let i = 0; i < subdivisions; i++) {
    const angle = (i / subdivisions) * Math.PI * 2;
    // Two-frequency perturbation for organic look
    const r = radius * (0.68 + rng() * 0.64);
    pts.push(new THREE.Vector2(Math.cos(angle) * r, Math.sin(angle) * r));
  }
  // Smooth the polygon once by averaging neighbours
  const smooth = pts.map((p, i) => {
    const prev = pts[(i - 1 + pts.length) % pts.length];
    const next = pts[(i + 1) % pts.length];
    return new THREE.Vector2((prev.x + p.x * 2 + next.x) / 4, (prev.y + p.y * 2 + next.y) / 4);
  });
  return new THREE.ShapeGeometry(new THREE.Shape(smooth), 3);
}

function buildRiverGeo(rng, len, wid) {
  const n    = 6;
  const ctrl = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return new THREE.Vector2((t - 0.5) * len, (rng() - 0.5) * wid * 3.5);
  });
  const curve    = new THREE.SplineCurve(ctrl);
  const cpts     = curve.getPoints(32);
  const hw       = wid / 2;
  const left     = cpts.map((p, i) => {
    const t = curve.getTangent(i / (cpts.length - 1));
    return new THREE.Vector2(p.x - t.y * hw, p.y + t.x * hw);
  });
  const right    = [...cpts].reverse().map((p, i) => {
    const ti = cpts.length - 1 - i;
    const t  = curve.getTangent(ti / (cpts.length - 1));
    return new THREE.Vector2(p.x + t.y * hw, p.y - t.x * hw);
  });
  const bankLeft  = cpts.map((p, i) => {
    const t = curve.getTangent(i / (cpts.length - 1));
    return new THREE.Vector2(p.x - t.y * (hw + 1.1), p.y + t.x * (hw + 1.1));
  });
  const bankRight = [...cpts].reverse().map((p, i) => {
    const ti = cpts.length - 1 - i;
    const t  = curve.getTangent(ti / (cpts.length - 1));
    return new THREE.Vector2(p.x + t.y * (hw + 1.1), p.y - t.x * (hw + 1.1));
  });
  return {
    waterGeo: new THREE.ShapeGeometry(new THREE.Shape([...left,  ...right]),     2),
    bankGeo:  new THREE.ShapeGeometry(new THREE.Shape([...bankLeft, ...bankRight]), 2),
  };
}

// ─── Water body (lake / pond) ─────────────────────────────────────────────────

function WaterBody({ x, z, rng }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const { isLake, ry, radius, waterGeo, shoreGeo, bankGeo, rocks, reeds } = useMemo(() => {
    const il     = rng() > 0.35;
    const r      = il ? 5.0 : 3.0;
    const rySeed = rng() * Math.PI;
    const wGeo   = buildLakeGeo(rng, r * 0.92);
    const sGeo   = buildLakeGeo(rng, r * 1.10);
    const bGeo   = buildLakeGeo(rng, r * 1.30);
    const rockCount = 2 + Math.floor(rng() * 4);
    const rks = Array.from({ length: rockCount }, () => {
      const a = rng() * Math.PI * 2;
      const d = r * (0.95 + rng() * 0.22);
      return { ox: Math.cos(a) * d, oz: Math.sin(a) * d, s: 0.14 + rng() * 0.22 };
    });
    const reedCount = 3 + Math.floor(rng() * 5);
    const rds = Array.from({ length: reedCount }, () => {
      const a = rng() * Math.PI * 2;
      const d = r * (0.80 + rng() * 0.22);
      return { ox: Math.cos(a) * d, oz: Math.sin(a) * d, h: 0.5 + rng() * 0.65 };
    });
    return { isLake: il, ry: rySeed, radius: r, waterGeo: wGeo, shoreGeo: sGeo, bankGeo: bGeo, rocks: rks, reeds: rds };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Opacity animation removed — it was mutating the shared MAT.waterSurf material
  // from multiple instances simultaneously, causing constant flickering.

  return (
    <group position={[x, 0.03, z]} rotation={[0, ry, 0]}>
      {/* Sandy bank */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={bankGeo} />
        <primitive object={MAT.shore} attach="material" />
      </mesh>
      {/* Dark shore */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={shoreGeo} />
        <primitive object={MAT.waterShore} attach="material" />
      </mesh>
      {/* Water surface */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={waterGeo} />
        <primitive object={MAT.waterSurf} attach="material" />
      </mesh>
      {/* Shore rocks */}
      {rocks.map((r, i) => (
        <mesh key={`r${i}`}
          geometry={GEO.rockSmall} material={MAT.rockGray}
          position={[r.ox, r.s * 0.28, r.oz]}
          scale={[r.s, r.s * 0.7, r.s]}
        />
      ))}
      {/* Reeds — shared geometries (3 size buckets), no castShadow */}
      {reeds.map((rd, i) => {
        const geo = rd.h < 0.7 ? GEO.reedSm : rd.h < 0.95 ? GEO.reedMd : GEO.reedLg;
        const hy  = rd.h < 0.7 ? 0.30 : rd.h < 0.95 ? 0.45 : 0.575;
        return (
          <mesh key={`rd${i}`} geometry={geo} material={MAT.reed}
            position={[rd.ox, hy, rd.oz]} />
        );
      })}
      {/* Hitbox */}
      <mesh position={[0, 0.3, 0]} material={HITBOX_MAT}
        onPointerDown={e => { if (e.button === 0) { e.stopPropagation(); openInfo(setOpen); } }}
      >
        <cylinderGeometry args={[radius * 1.05, radius * 1.05, 0.8, 14]} />
      </mesh>
      {open && <InfoPopup height={radius * 0.6 + 2} icon="💧" title={isLake ? 'Озеро' : 'Пруд'} subtitle="Источник воды" color="#38bdf8" onClose={close} />}
    </group>
  );
}

// ─── River segment ────────────────────────────────────────────────────────────

function RiverSegment({ x, z, rng }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const { ry, len, wid, waterGeo, bankGeo, rocks } = useMemo(() => {
    const r  = rng() * Math.PI;
    const l  = 10 + rng() * 14;
    const w  = 3.0 + rng() * 2.5;
    const { waterGeo: wG, bankGeo: bG } = buildRiverGeo(rng, l, w);
    const rockCount = 1 + Math.floor(rng() * 3);
    const rks = Array.from({ length: rockCount }, () => {
      const side  = rng() > 0.5 ? 1 : -1;
      const along = (rng() - 0.5) * l * 0.7;
      const perp  = side * (w * 0.5 + 0.3 + rng() * 0.8);
      return { ox: perp, oz: along, s: 0.12 + rng() * 0.2 };
    });
    return { ry: r, len: l, wid: w, waterGeo: wG, bankGeo: bG, rocks: rks };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Opacity animation removed — mutated shared material causing flicker

  return (
    <group position={[x, 0.03, z]} rotation={[0, ry, 0]}>
      {/* Sandy banks */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={bankGeo} />
        <primitive object={MAT.shore} attach="material" />
      </mesh>
      {/* Curved water */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={waterGeo} />
        <primitive object={MAT.waterSurf} attach="material" />
      </mesh>
      {/* Bank rocks */}
      {rocks.map((r, i) => (
        <mesh key={i}
          geometry={GEO.rockSmall} material={MAT.rockGray}
          position={[r.ox, r.s * 0.25, r.oz]}
          scale={[r.s, r.s * 0.6, r.s]}
        />
      ))}
      {/* Hitbox */}
      <mesh position={[0, 0.3, 0]} material={HITBOX_MAT}
        onPointerDown={e => { if (e.button === 0) { e.stopPropagation(); openInfo(setOpen); } }}
      >
        <boxGeometry args={[wid + 2, 0.7, len]} />
      </mesh>
      {open && <InfoPopup height={3.5} icon="🌊" title="Река" subtitle="Источник воды" color="#60a5fa" onClose={close} />}
    </group>
  );
}

// ─── Ground materials ─────────────────────────────────────────────────────────

const GROUND_MATS = [
  new THREE.MeshStandardMaterial({ color: '#1e2e18', roughness: 0.95, metalness: 0 }),
  new THREE.MeshStandardMaterial({ color: '#1a2a14', roughness: 0.95, metalness: 0 }),
  new THREE.MeshStandardMaterial({ color: '#222e1c', roughness: 0.92, metalness: 0 }),
  new THREE.MeshStandardMaterial({ color: '#243020', roughness: 0.92, metalness: 0 }),
];
const PLANE_GEO = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);

// ─── Chunk ────────────────────────────────────────────────────────────────────

// Grid-cell size used to prevent spawn overlaps
const CELL = 6;

function Chunk({ cx, cz }) {
  const ox = cx * CHUNK_SIZE;
  const oz = cz * CHUNK_SIZE;

  const { spawns, groundMat } = useMemo(() => {
    const rng     = mkRng(chunkSeed(cx, cz));
    const cells   = new Set();

    const mark = (wx, wz) => {
      const key = `${Math.round(wx / CELL)}_${Math.round(wz / CELL)}`;
      if (cells.has(key)) return false;
      cells.add(key);
      return true;
    };

    const halfC = (CHUNK_SIZE / 2) * 0.86;
    const rand  = () => (rng() - 0.5) * 2 * halfC;
    const items = [];

    // Water bodies (lake 12%, river 6%)
    const waterRoll = rng();
    if (waterRoll < 0.12) {
      const wx = ox + rand(); const wz = oz + rand();
      if (mark(wx, wz)) items.push({ type: 'lake', x: wx, z: wz });
    } else if (waterRoll < 0.18) {
      const wx = ox + rand(); const wz = oz + rand();
      if (mark(wx, wz)) items.push({ type: 'river', x: wx, z: wz });
    }

    // Ore deposits (0-2)
    const oreCount = Math.floor(rng() * 3);
    for (let i = 0; i < oreCount; i++) {
      const wx = ox + rand(); const wz = oz + rand();
      if (mark(wx, wz)) items.push({ type: 'ore', x: wx, z: wz });
    }

    // Rock clusters (0-3)
    const rockCount = Math.floor(rng() * 4);
    for (let i = 0; i < rockCount; i++) {
      const wx = ox + rand(); const wz = oz + rand();
      if (mark(wx, wz)) items.push({ type: 'rock', x: wx, z: wz });
    }

    // Trees (0-4)
    const treeCount = Math.floor(rng() * 5);
    for (let i = 0; i < treeCount; i++) {
      const wx = ox + rand(); const wz = oz + rand();
      if (!mark(wx, wz)) continue;
      const tr = rng();
      const kind = tr < 0.38 ? 'pine' : tr < 0.68 ? 'round' : 'bushy';
      items.push({ type: kind, x: wx, z: wz });
    }

    const gMat = GROUND_MATS[((Math.abs(cx) + Math.abs(cz)) % GROUND_MATS.length)];
    return { spawns: items, groundMat: gMat };
  }, [cx, cz]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group>
      {/* Ground tile */}
      <mesh receiveShadow position={[ox, 0, oz]} rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={PLANE_GEO} />
        <primitive object={groundMat} attach="material" />
      </mesh>

      {/* Natural features */}
      {spawns.map((sp, i) => {
        const rng = mkRng(chunkSeed(cx * 1000 + i, cz * 1000 + i));
        switch (sp.type) {
          case 'pine':  return <PineTree    key={i} x={sp.x} z={sp.z} rng={rng} />;
          case 'round': return <RoundTree   key={i} x={sp.x} z={sp.z} rng={rng} />;
          case 'bushy': return <BushyTree   key={i} x={sp.x} z={sp.z} rng={rng} />;
          case 'rock':  return <RockCluster key={i} x={sp.x} z={sp.z} rng={rng} />;
          case 'ore':   return <OreDeposit  key={i} x={sp.x} z={sp.z} rng={rng} />;
          case 'lake':  return <WaterBody   key={i} x={sp.x} z={sp.z} rng={rng} />;
          case 'river': return <RiverSegment key={i} x={sp.x} z={sp.z} rng={rng} />;
          default:      return null;
        }
      })}
    </group>
  );
}

// ─── World (infinite chunk manager) ──────────────────────────────────────────

export function World({ camTargetRef }) {
  const [chunks, setChunks] = useState(() => {
    const set = new Set();
    for (let dx = -RENDER_DIST; dx <= RENDER_DIST; dx++)
      for (let dz = -RENDER_DIST; dz <= RENDER_DIST; dz++)
        set.add(`${dx},${dz}`);
    return set;
  });

  useFrame(() => {
    const pos = camTargetRef.current;
    const cx  = Math.round(pos.x / CHUNK_SIZE);
    const cz  = Math.round(pos.z / CHUNK_SIZE);
    const next = new Set();
    for (let dx = -RENDER_DIST; dx <= RENDER_DIST; dx++)
      for (let dz = -RENDER_DIST; dz <= RENDER_DIST; dz++)
        next.add(`${cx + dx},${cz + dz}`);
    if (next.size !== chunks.size || [...next].some(k => !chunks.has(k)))
      setChunks(next);
  });

  return (
    <>
      {[...chunks].map(key => {
        const [cx, cz] = key.split(',').map(Number);
        return <Chunk key={key} cx={cx} cz={cz} />;
      })}
    </>
  );
}
