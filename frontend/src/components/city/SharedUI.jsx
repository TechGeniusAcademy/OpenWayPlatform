import { useRef, useMemo, useContext, Component, memo } from 'react';

// ─── Shared memo comparator for placed buildings ──────────────────────────────
//
// Skips re-renders when only callback props (onSelect, onConveyorClick, etc.)
// changed reference but not behaviour. Compares position array by value and
// currentAmounts by shallow object equality.
const CALLBACK_KEYS = new Set(['onSelect', 'onConveyorClick', 'onCableClick', 'onRightClick']);
export function buildingPropsEqual(prev, next) {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const k of keys) {
    if (CALLBACK_KEYS.has(k)) continue;
    if (k === 'position') {
      const p = prev.position, n = next.position;
      if (!p || !n || p[0] !== n[0] || p[1] !== n[1] || p[2] !== n[2]) return false;
      continue;
    }
    if (k === 'currentAmounts') {
      const pa = prev.currentAmounts ?? {}, na = next.currentAmounts ?? {};
      const pk = Object.keys(pa), nk = Object.keys(na);
      if (pk.length !== nk.length) return false;
      for (const key of pk) { if (pa[key] !== na[key]) return false; }
      continue;
    }
    if (prev[k] !== next[k]) return false;
  }
  return true;
}
export { memo };
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CityContext } from './CityContext.js';
import { isColliding } from '../items/collision.js';
import { getProductions, getStorages, ENERGY_TYPES } from '../systems/energy.js';
import { getLevelConfig } from '../systems/upgrades.js';
import { FaBolt, FaBatteryFull, FaSun, FaWind, FaFire, FaCoins } from 'react-icons/fa';
import { GiMining } from 'react-icons/gi';

const TYPE_ICON = { solar: FaSun, wind: FaWind, fuel: FaFire, coins: FaCoins, ore: GiMining };

// ─── Model error boundary ─────────────────────────────────────────────────────

export class ModelErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// ─── Placement mouse tracker (raycast to ground) ──────────────────────────────

export function usePlacementTracker(placementPosRef, inputRef, placementRotYRef) {
  const { camera, gl, raycaster } = useThree();
  const { placedItemsRef, placingItemRef } = useContext(CityContext);
  const groupRef    = useRef();
  const blockedRef  = useRef(false);
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hitPoint    = useMemo(() => new THREE.Vector3(), []);
  // Reuse a single Vector2 to avoid per-frame garbage collection
  const ndcVec      = useMemo(() => new THREE.Vector2(), []);
  const trackFrameRef = useRef(0); // throttle: raycaster+isColliding every 2nd frame

  useFrame(() => {
    if (++trackFrameRef.current % 2 !== 0) return;
    const inp = inputRef.current;
    if (inp.mouseX === null || !groupRef.current) return;
    ndcVec.set(
      (inp.mouseX / gl.domElement.clientWidth)  *  2 - 1,
     -(inp.mouseY / gl.domElement.clientHeight) *  2 + 1,
    );
    raycaster.setFromCamera(ndcVec, camera);
    if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
      groupRef.current.position.set(hitPoint.x, 0, hitPoint.z);
      groupRef.current.rotation.y = placementRotYRef.current;
      placementPosRef.current = { x: hitPoint.x, y: 0, z: hitPoint.z };
      blockedRef.current = isColliding(
        { x: hitPoint.x, z: hitPoint.z },
        placingItemRef?.current,
        placedItemsRef?.current ?? [],
      );
    }
  });
  return { groupRef, blockedRef };
}

// ─── Glowing placement previews ───────────────────────────────────────────────

export function GlowBoxPreview({ placementPosRef, inputRef, placementRotYRef }) {
  const { groupRef, blockedRef } = usePlacementTracker(placementPosRef, inputRef, placementRotYRef);
  const matRef = useRef();
  const glowFrameRef = useRef(0); // throttle: pulse at ~20fps is imperceptible
  useFrame(({ clock }) => {
    if (++glowFrameRef.current % 3 !== 0) return;
    if (!matRef.current) return;
    const pulse   = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    const blocked = blockedRef.current;
    matRef.current.color.setHex(blocked ? 0x6e0a0a : 0x0a6ebd);
    matRef.current.emissive.setHex(blocked ? 0xff2200 : 0x00aaff);
    matRef.current.emissiveIntensity = pulse;
  });
  return (
    <group ref={groupRef}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 1, 3]} />
        <meshStandardMaterial
          ref={matRef}
          color="#0a6ebd"
          emissive={new THREE.Color(0x00aaff)}
          emissiveIntensity={0.8}
          transparent
          opacity={0.82}
        />
      </mesh>
    </group>
  );
}

export function GlowBoxPlaced({ position, rotation }) {
  return (
    <mesh castShadow position={[position[0], position[1] + 0.5, position[2]]} rotation={[0, rotation || 0, 0]}>
      <boxGeometry args={[2, 1, 3]} />
      <meshStandardMaterial color="#0a6ebd" emissive={new THREE.Color(0x003366)} emissiveIntensity={0.3} />
    </mesh>
  );
}

// ─── Floating energy badge ────────────────────────────────────────────────────

export function EnergyBadge({ itemType, badgeHeight = 6, level = 1 }) {
  const prods = getProductions(itemType);
  if (!prods.length) return null;
  const lvlConf = getLevelConfig(itemType, level);
  const mult    = lvlConf.rateMultiplier ?? 1.0;

  const items = prods.map(p => {
    const meta = ENERGY_TYPES[p.type];
    const rate = mult === 1.0 ? p.ratePerHour : Math.round(p.ratePerHour * mult * 10) / 10;
    const Icon = TYPE_ICON[p.type] ?? FaBolt;
    return { Icon, label: `${rate}${meta?.unit ?? ''}/ч` };
  });

  return (
    <Html
      position={[0, badgeHeight, 0]}
      center
      distanceFactor={35}
      zIndexRange={[10, 11]}
      style={{ pointerEvents: 'none' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pointerEvents: 'none' }}>
        {items.map((item, i) => (
          <div key={i} style={{
            background: 'rgba(0,0,0,0.72)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            padding: '2px 8px',
            fontSize: 12,
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#fde047',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            display: 'flex', alignItems: 'center', gap: 4,
          }}><item.Icon style={{ fontSize: 10, flexShrink: 0 }} />{item.label}</div>
        ))}
      </div>
    </Html>
  );
}

// ─── Floating storage badge — shows current/max per resource ──────────────────
/**
 * @param {{ itemType: string, badgeHeight?: number, currentAmounts?: Record<string,number> }} props
 */
export function StorageBadge({ itemType, badgeHeight = 6, currentAmounts = {}, level = 1 }) {
  const stors = getStorages(itemType);
  if (!stors.length) return null;
  const lvlConf  = getLevelConfig(itemType, level);
  const capMult  = lvlConf.capacityMultiplier ?? 1.0;

  const items = stors.map(s => {
    const meta    = ENERGY_TYPES[s.type];
    const unit    = s.unit ?? meta?.unit ?? '';
    const current = Math.floor(currentAmounts[s.type] ?? 0);
    const maxCap  = Math.round(s.capacity * capMult);
    const Icon    = TYPE_ICON[s.type] ?? FaBatteryFull;
    return { Icon, label: `${current} / ${maxCap} ${unit}` };
  });

  return (
    <Html
      position={[0, badgeHeight, 0]}
      center
      distanceFactor={35}
      zIndexRange={[10, 11]}
      style={{ pointerEvents: 'none' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pointerEvents: 'none' }}>
        {items.map((item, i) => (
          <div key={i} style={{
            background: 'rgba(0,0,0,0.82)',
            border: '1px solid rgba(168,85,247,0.55)',
            borderRadius: 8,
            padding: '2px 9px',
            fontSize: 12,
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#d8b4fe',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            display: 'flex', alignItems: 'center', gap: 4,
          }}><item.Icon style={{ fontSize: 10, flexShrink: 0 }} />{item.label}</div>
        ))}
      </div>
    </Html>
  );
}

// ─── No-power badge (shown on buildings outside an energy zone) ────────────────

export function NoPowerBadge({ badgeHeight = 7 }) {
  return (
    <Html
      position={[0, badgeHeight + 1.5, 0]}
      center
      distanceFactor={35}
      zIndexRange={[15, 16]}
      style={{ pointerEvents: 'none' }}
    >
      <div style={{
        background:   'rgba(239,68,68,0.92)',
        border:       '1px solid rgba(239,68,68,0.8)',
        borderRadius: 8,
        padding:      '3px 11px',
        fontSize:     12,
        fontFamily:   'monospace',
        fontWeight:   700,
        color:        '#fff',
        whiteSpace:   'nowrap',
        userSelect:   'none',
      }}>
        <FaBolt style={{ verticalAlign: 'middle', marginRight: 4, fontSize: 11 }} /> Нужна энергия
      </div>
    </Html>
  );
}

// ─── Work-area zone overlay ───────────────────────────────────────────────────

export function WorkAreaOverlay({ width, depth, color, opacity }) {
  const border = useMemo(() => {
    const hw = width / 2, hd = depth / 2;
    const pts = new Float32Array([
      -hw, 0, -hd,  hw, 0, -hd,
       hw, 0, -hd,  hw, 0,  hd,
       hw, 0,  hd, -hw, 0,  hd,
      -hw, 0,  hd, -hw, 0, -hd,
    ]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    return geo;
  }, [width, depth]);

  return (
    <group position={[0, 0.05, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments geometry={border}>
        <lineBasicMaterial color={color} />
      </lineSegments>
    </group>
  );
}

// ─── Level badge: floating HTML indicator (hidden at level 1) ─────────────────

const ROMAN        = ['', 'I', 'II', 'III', 'IV'];
const LEVEL_COLORS = ['', '#4ade80', '#fbbf24', '#f97316', '#ef4444'];

/**
 * Floats a small Roman-numeral badge to the right of a building.
 * Renders nothing at level 1 (default appearance).
 * @param {{ level?: number, height?: number }} props
 */
export function LevelBadge({ level = 1, height = 10 }) {
  if (level <= 1) return null;
  const color = LEVEL_COLORS[level] ?? '#4ade80';
  return (
    <Html
      position={[3.2, height, 0]}
      center
      distanceFactor={35}
      zIndexRange={[12, 13]}
      style={{ pointerEvents: 'none' }}
    >
      <div style={{
        background:   'rgba(0,0,0,0.85)',
        border:       `1px solid ${color}`,
        borderRadius: 6,
        padding:      '1px 7px',
        fontSize:     11,
        fontFamily:   'monospace',
        fontWeight:   900,
        color,
        letterSpacing: 1,
        whiteSpace:   'nowrap',
        userSelect:   'none',
        textShadow:   `0 0 8px ${color}`,
      }}>
        {ROMAN[level] ?? level}
      </div>
    </Html>
  );
}

// ─── Level ring: 3-D glowing circle around the building base ─────────────────
/**
 * Renders nothing at level 1.
 * @param {{ level?: number, radius?: number }} props
 */
export function LevelRing({ level = 1, radius = 4 }) {
  const g1      = useRef();
  const g2      = useRef();
  const g3      = useRef();
  const mat1    = useRef();
  const mat2    = useRef();
  const mat3    = useRef();
  const frameRef = useRef(0); // throttle counter

  // Update every 3rd frame — rings rotate very slowly, nobody notices ~20fps refresh
  useFrame(({ clock }) => {
    if (++frameRef.current % 3 !== 0) return;
    const t = clock.getElapsedTime();
    if (g1.current)   g1.current.rotation.y   =  t * 0.7;
    if (g2.current)   g2.current.rotation.y   = -t * 1.1;
    if (g3.current)   g3.current.rotation.y   =  t * 0.45;
    if (mat1.current) mat1.current.opacity = 0.50 + Math.sin(t * 2.8) * 0.22;
    if (mat2.current) mat2.current.opacity = 0.38 + Math.sin(t * 2.0 + 1.0) * 0.18;
    if (mat3.current) mat3.current.opacity = 0.28 + Math.sin(t * 1.5 + 2.0) * 0.14;
  });

  if (level <= 1) return null;
  const color = LEVEL_COLORS[level] ?? '#4ade80';
  const r1 = radius * 0.65;
  const r2 = radius;
  const r3 = radius * 1.35;

  return (
    <group position={[0, 0.06, 0]}>
      {/* Кольцо 1 — уровень 2+ */}
      <group ref={g1}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r1 - 0.14, r1 + 0.14, 20]} />
          <meshBasicMaterial ref={mat1} color={color} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
      {/* Кольцо 2 — уровень 3+ */}
      {level >= 3 && (
        <group ref={g2}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r2 - 0.14, r2 + 0.14, 20]} />
            <meshBasicMaterial ref={mat2} color={color} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      )}
      {/* Кольцо 3 — уровень 4+ */}
      {level >= 4 && (
        <group ref={g3}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r3 - 0.14, r3 + 0.14, 20]} />
            <meshBasicMaterial ref={mat3} color={color} transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      )}
      {/* PointLight removed — routed through LampLightPool would be needed for
          correctness; for now the emissive rings give sufficient visual indication
          without the per-building GPU lighting cost */}
    </group>
  );
}
