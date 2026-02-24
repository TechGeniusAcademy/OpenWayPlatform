import { useRef, useState, useEffect, useMemo, useCallback, createContext, useContext, Suspense, Component } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import styles from './OpenCity.module.css';

// ─── Context (avoids prop drilling into Building) ────────────────────────────
const CityContext = createContext(null);

// ─── Constants ──────────────────────────────────────────────────────────────

const CHUNK_SIZE  = 40;   // world units per chunk side
const RENDER_DIST = 4;    // chunks radius

// RTS Camera
const CAM_PAN_SPEED   = 22;    // units/sec keyboard pan

const CAM_ZOOM_MIN    = 10;    // min height
const CAM_ZOOM_MAX    = 140;   // max height
const CAM_ZOOM_STEP   = 6;
const CAM_TILT        = 55;    // degrees above horizon (fixed RTS angle)
const CAM_ROT_SPEED   = 1.5;   // radians/sec for Q/E rotation

// ─── Building (selectable object) ──────────────────────────────────────────

function Building({ d, id }) {
  const { lmbHeldRef, selectedRef, meshMapRef, placingItemRef } = useContext(CityContext);
  const meshRef = useRef();

  // Register / unregister this mesh in the global map (for clear)
  useEffect(() => {
    meshMapRef.current.set(id, meshRef);
    return () => { meshMapRef.current.delete(id); };
  }, [id, meshMapRef]);

  // Restore highlight after chunk reload
  useEffect(() => {
    if (selectedRef.current.has(id) && meshRef.current) {
      meshRef.current.material.emissive.setHex(0x1a88ff);
      meshRef.current.material.emissiveIntensity = 0.55;
    }
  });

  const doSelect = useCallback(() => {
    if (!meshRef.current || selectedRef.current.has(id)) return;
    selectedRef.current.add(id);
    meshRef.current.material.emissive.setHex(0x1a88ff);
    meshRef.current.material.emissiveIntensity = 0.55;
  }, [id, selectedRef]);

  return (
    <mesh
      ref={meshRef}
      castShadow
      receiveShadow
      position={[d.bx, d.bh / 2, d.bz]}
      onPointerDown={(e) => {
        if (e.button === 0 && !placingItemRef.current) { e.stopPropagation(); doSelect(); }
      }}
      onPointerMove={(e) => {
        if (lmbHeldRef.current && !placingItemRef.current) { e.stopPropagation(); doSelect(); }
      }}
    >
      <boxGeometry args={[d.bw, d.bh, d.bd]} />
      <meshStandardMaterial
        color={`hsl(${Math.floor(d.hue * 360)}, 20%, 30%)`}
        roughness={0.7}
        metalness={0.1}
      />
    </mesh>
  );
}

// ─── Chunk ──────────────────────────────────────────────────────────────────

function Chunk({ cx, cz }) {
  const x = cx * CHUNK_SIZE;
  const z = cz * CHUNK_SIZE;

  const gridHelper = useMemo(() => {
    const g = new THREE.GridHelper(CHUNK_SIZE, 8, '#1e2e1e', '#1e2e1e');
    g.material.transparent = true;
    g.material.opacity     = 0.5;
    return g;
  }, []);

  useEffect(() => () => { gridHelper.dispose?.(); }, [gridHelper]);

  // Deterministic pseudo-random for decorations based on chunk coords
  const seed = cx * 73856093 ^ cz * 19349663;
  const rng  = (n) => (((seed ^ n * 2654435761) >>> 0) % 1000) / 1000;

  const decorations = useMemo(() => {
    const items = [];
    // Scatter some placeholder boxes (will be replaced by .glb later)
    const count = Math.floor(rng(1) * 4);
    for (let i = 0; i < count; i++) {
      const bx  = x + (rng(i * 10 + 2) - 0.5) * CHUNK_SIZE * 0.8;
      const bz  = z + (rng(i * 10 + 3) - 0.5) * CHUNK_SIZE * 0.8;
      const bh  = 1 + rng(i * 10 + 4) * 6;
      const bw  = 0.8 + rng(i * 10 + 5) * 3;
      const bd  = 0.8 + rng(i * 10 + 6) * 3;
      const hue = rng(i * 10 + 7);
      items.push({ bx, bz, bh, bw, bd, hue });
    }
    return items;
  }, [cx, cz]);

  return (
    <group>
      {/* Ground tile */}
      <mesh
        receiveShadow
        position={[x, 0, z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[CHUNK_SIZE, CHUNK_SIZE]} />
        <meshStandardMaterial
          color={`hsl(${120 + (cx + cz) * 7}, 18%, ${14 + (Math.abs(cx) + Math.abs(cz)) % 3}%)`}
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Chunk grid */}
      <primitive
        object={gridHelper}
        position={[x, 0.02, z]}
      />

      {/* Placeholder buildings / props (will be swapped for .glb) */}
      {decorations.map((d, i) => (
        <Building key={i} d={d} id={`${cx}_${cz}_${i}`} />
      ))}
    </group>
  );
}

// ─── World (infinite chunk manager) ─────────────────────────────────────────

function World({ camTargetRef }) {
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

// ─── RTS Camera Controller ────────────────────────────────────────────────────
// camTargetRef  – {x, z} point on the ground the camera looks at
// camStateRef   – { zoom, rotY } mutable camera state

function RTSCamera({ camTargetRef, camStateRef, keysRef, inputRef }) {
  const { camera, gl } = useThree();
  // Smooth target for interpolation
  const smoothTarget = useRef(new THREE.Vector3());
  const smoothZoom   = useRef(50);
  const smoothRotY   = useRef(0);

  useEffect(() => {
    camera.fov  = 50;
    camera.near = 0.5;
    camera.far  = 800;
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame((_, delta) => {
    const dt      = Math.min(delta, 0.05);
    const keys    = keysRef.current;
    const inp     = inputRef.current;
    const state   = camStateRef.current;
    const target  = camTargetRef.current;

    // ── Rotation (Q/E) ──
    if (keys['KeyQ']) state.rotY += CAM_ROT_SPEED * dt;
    if (keys['KeyE']) state.rotY -= CAM_ROT_SPEED * dt;

    // ── Pan direction vectors based on camera rotation ──
    const forward = new THREE.Vector3(
      -Math.sin(state.rotY), 0, -Math.cos(state.rotY)
    );
    const right = new THREE.Vector3(
      Math.cos(state.rotY), 0, -Math.sin(state.rotY)
    );

    // ── Keyboard pan ──
    const kSpeed = CAM_PAN_SPEED * dt * (state.zoom / 50);
    if (keys['KeyW'] || keys['ArrowUp'])    { target.x += forward.x * kSpeed; target.z += forward.z * kSpeed; }
    if (keys['KeyS'] || keys['ArrowDown'])  { target.x -= forward.x * kSpeed; target.z -= forward.z * kSpeed; }
    if (keys['KeyA'] || keys['ArrowLeft'])  { target.x -= right.x * kSpeed;   target.z -= right.z * kSpeed; }
    if (keys['KeyD'] || keys['ArrowRight']) { target.x += right.x * kSpeed;   target.z += right.z * kSpeed; }

    // ── Middle-mouse / LMB drag pan ──
    if (inp.middleDrag) {
      const dragSpeed = state.zoom * 0.0018;
      target.x += (-inp.dragDeltaX * right.x + inp.dragDeltaY * forward.x) * dragSpeed;
      target.z += (-inp.dragDeltaX * right.z + inp.dragDeltaY * forward.z) * dragSpeed;
      inp.dragDeltaX = 0;
      inp.dragDeltaY = 0;
    }

    // ── Zoom from wheel ──
    if (inp.wheelDelta !== 0) {
      state.zoom = THREE.MathUtils.clamp(
        state.zoom + inp.wheelDelta * CAM_ZOOM_STEP,
        CAM_ZOOM_MIN, CAM_ZOOM_MAX
      );
      inp.wheelDelta = 0;
    }

    // ── Smooth lerp camera ──
    const lerpK = 1 - Math.pow(0.002, dt);
    smoothTarget.current.lerp(new THREE.Vector3(target.x, 0, target.z), lerpK);
    smoothZoom.current  += (state.zoom  - smoothZoom.current)  * lerpK;
    smoothRotY.current  += (state.rotY  - smoothRotY.current)  * lerpK;

    // ── Position camera isometrically above target ──
    const tiltRad = THREE.MathUtils.degToRad(CAM_TILT);
    const dist    = smoothZoom.current / Math.tan(tiltRad);
    const height  = smoothZoom.current;

    camera.position.set(
      smoothTarget.current.x + Math.sin(smoothRotY.current) * dist,
      height,
      smoothTarget.current.z + Math.cos(smoothRotY.current) * dist
    );
    camera.lookAt(smoothTarget.current);
  });

  return null;
}

// ─── Lighting ────────────────────────────────────────────────────────────────

function Lighting() {
  const sunRef = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.015;
    if (sunRef.current) {
      sunRef.current.position.set(
        Math.cos(t) * 300,
        Math.sin(t) * 300,
        Math.sin(t * 0.5) * 150
      );
      sunRef.current.target.position.set(0, 0, 0);
      sunRef.current.target.updateMatrixWorld();
    }
  });
  return (
    <>
      <ambientLight intensity={0.45} color="#c8d8ff" />
      <directionalLight
        ref={sunRef}
        castShadow
        intensity={1.8}
        color="#fff8e0"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={600}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
      />
      <hemisphereLight args={['#a0c8ff', '#3a5a3a', 0.4]} />
    </>
  );
}

// ─── Model error boundary ────────────────────────────────────────────────────

class ModelErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// ─── Shared placement mouse tracker (raycast to ground) ──────────────────────

function usePlacementTracker(placementPosRef, inputRef, placementRotYRef) {
  const { camera, gl, raycaster } = useThree();
  const groupRef    = useRef();
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hitPoint    = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const inp = inputRef.current;
    if (inp.mouseX === null || !groupRef.current) return;
    const ndc = new THREE.Vector2(
      (inp.mouseX / gl.domElement.clientWidth)  *  2 - 1,
     -(inp.mouseY / gl.domElement.clientHeight) *  2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
      groupRef.current.position.set(hitPoint.x, 0, hitPoint.z);
      groupRef.current.rotation.y = placementRotYRef.current;
      placementPosRef.current = { x: hitPoint.x, y: 0, z: hitPoint.z };
    }
  });
  return groupRef;
}

// ─── Box glowing placeholder (used when GLB is missing) ─────────────────────

function GlowBoxPreview({ placementPosRef, inputRef, placementRotYRef }) {
  const groupRef = usePlacementTracker(placementPosRef, inputRef, placementRotYRef);
  const matRef   = useRef();
  useFrame(({ clock }) => {
    if (matRef.current)
      matRef.current.emissiveIntensity = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
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

function GlowBoxPlaced({ position, rotation }) {
  return (
    <mesh castShadow position={[position[0], position[1] + 0.5, position[2]]} rotation={[0, rotation || 0, 0]}>
      <boxGeometry args={[2, 1, 3]} />
      <meshStandardMaterial color="#0a6ebd" emissive={new THREE.Color(0x003366)} emissiveIntensity={0.3} />
    </mesh>
  );
}

// ─── Solar Panel — GLB inner components (may throw if file missing) ──────────

function SolarPanelGLTFPreview({ placementPosRef, inputRef, placementRotYRef }) {
  const { scene } = useGLTF('/models/Solar%20Panel.glb');
  const groupRef  = usePlacementTracker(placementPosRef, inputRef, placementRotYRef);

  const glowScene = useMemo(() => {
    const c = scene.clone(true);
    c.traverse(child => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.emissive          = new THREE.Color(0x00aaff);
        child.material.emissiveIntensity = 0.8;
        child.material.transparent       = true;
        child.material.opacity           = 0.8;
      }
    });
    return c;
  }, [scene]);

  useFrame(({ clock }) => {
    const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    glowScene.traverse(child => {
      if (child.isMesh) child.material.emissiveIntensity = pulse;
    });
  });

  return <primitive ref={groupRef} object={glowScene} />;
}

function SolarPanelGLTFPlaced({ position, rotation }) {
  const { scene } = useGLTF('/models/Solar%20Panel.glb');
  const cloned    = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} position={position} rotation={[0, rotation || 0, 0]} />;
}

// ─── Solar Panel — public components with error boundary + Suspense ──────────

function SolarPanelPreview({ placementPosRef, inputRef, placementRotYRef }) {
  return (
    <ModelErrorBoundary fallback={<GlowBoxPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />}>
      <Suspense fallback={<GlowBoxPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />}>
        <SolarPanelGLTFPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

function SolarPanelPlaced({ position, rotation }) {
  return (
    <ModelErrorBoundary fallback={<GlowBoxPlaced position={position} rotation={rotation} />}>
      <Suspense fallback={<GlowBoxPlaced position={position} rotation={rotation} />}>
        <SolarPanelGLTFPlaced position={position} rotation={rotation} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

// ─── Money Factory — GLB inner components ───────────────────────────────────

function MoneyFactoryGLTFPreview({ placementPosRef, inputRef, placementRotYRef }) {
  const { scene } = useGLTF('/models/MoneyFactory.glb');
  const groupRef  = usePlacementTracker(placementPosRef, inputRef, placementRotYRef);

  const glowScene = useMemo(() => {
    const c = scene.clone(true);
    c.traverse(child => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.emissive          = new THREE.Color(0x00ff88);
        child.material.emissiveIntensity = 0.8;
        child.material.transparent       = true;
        child.material.opacity           = 0.82;
      }
    });
    return c;
  }, [scene]);

  useFrame(({ clock }) => {
    const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    glowScene.traverse(child => {
      if (child.isMesh) child.material.emissiveIntensity = pulse;
    });
  });

  return <primitive ref={groupRef} object={glowScene} />;
}

function MoneyFactoryGLTFPlaced({ position, rotation }) {
  const { scene } = useGLTF('/models/MoneyFactory.glb');
  const cloned    = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} position={position} rotation={[0, rotation || 0, 0]} />;
}

function MoneyFactoryPreview({ placementPosRef, inputRef, placementRotYRef }) {
  const fb = <GlowBoxPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />;
  return (
    <ModelErrorBoundary fallback={fb}>
      <Suspense fallback={fb}>
        <MoneyFactoryGLTFPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

function MoneyFactoryPlaced({ position, rotation }) {
  const fb = <GlowBoxPlaced position={position} rotation={rotation} />;
  return (
    <ModelErrorBoundary fallback={fb}>
      <Suspense fallback={fb}>
        <MoneyFactoryGLTFPlaced position={position} rotation={rotation} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

// ─── Shop Modal ─────────────────────────────────────────────────────────────

const SHOP_TABS = [
  { id: 'energy',     label: '⚡ Энергия' },
  { id: 'production', label: '🏗️ Производство' },
];

function ShopModal({ onClose, onBuy }) {
  const [activeTab, setActiveTab] = useState('energy');

  return (
    <div className={styles.shopOverlay} onClick={onClose}>
      <div className={styles.shopModal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.shopHeader}>
          <span className={styles.shopTitle}>🏪 Магазин построек</span>
          <button className={styles.shopClose} onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className={styles.shopTabs}>
          {SHOP_TABS.map(t => (
            <button
              key={t.id}
              className={`${styles.shopTab} ${activeTab === t.id ? styles.shopTabActive : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className={styles.shopContent}>
          {activeTab === 'energy' && (
            <div className={styles.shopGrid}>
              <div className={styles.shopItem} onClick={() => { onBuy('solar-panel'); onClose(); }}>
                <div className={styles.shopItemIcon}>☀️</div>
                <div className={styles.shopItemInfo}>
                  <span className={styles.shopItemName}>Солнечная панель</span>
                  <span className={styles.shopItemDesc}>Генерирует энергию днём</span>
                </div>
                <button className={styles.shopItemBtn}>Разместить</button>
              </div>
            </div>
          )}
          {activeTab === 'production' && (
            <div className={styles.shopGrid}>
              <div className={styles.shopItem} onClick={() => { onBuy('money-factory'); onClose(); }}>
                <div className={styles.shopItemThumb}>
                  <img src="/models/MoneyFactory.png" alt="Денежная фабрика" />
                </div>
                <div className={styles.shopItemInfo}>
                  <span className={styles.shopItemName}>Денежная фабрика</span>
                  <span className={styles.shopItemDesc}>Генерирует доход для города</span>
                </div>
                <button className={styles.shopItemBtn}>Разместить</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── HUD ─────────────────────────────────────────────────────────────────────

function HUD({ pos, zoom, selectedCount, onClearSelection, onShop, onBack, placingItem }) {
  return (
    <>
      <div className={styles.coords}>
        X: {pos.x.toFixed(0)} &nbsp;|&nbsp; Z: {pos.z.toFixed(0)}
        &nbsp;|&nbsp; Зум: {zoom.toFixed(0)}
      </div>
      {placingItem && (
        <div className={styles.placingHint}>
          🔧 Перемещайте объект &nbsp;·&nbsp; <kbd>Колесо</kbd> поворот &nbsp;·&nbsp; <kbd>ЛКМ</kbd> поставить &nbsp;·&nbsp; <kbd>Esc</kbd> отмена
        </div>
      )}
      {!placingItem && selectedCount > 0 && (
        <div className={styles.selectionInfo}>
          <span>Выбрано: <strong>{selectedCount}</strong></span>
          <button className={styles.clearBtn} onClick={onClearSelection} title="Сбросить выделение">✕</button>
        </div>
      )}
      <div className={styles.miniControls}>
        <span><kbd>W A S D</kbd> панорама</span>
        <span><kbd>Q / E</kbd> поворот</span>
        <span><kbd>↕ Колесо</kbd> зум</span>
        <span><kbd>ЛКМ/ПКМ</kbd> перетащить</span>
        <span><kbd>ЛКМ</kbd> выделить объект</span>
        <span><kbd>Esc</kbd> сбросить выбор</span>
      </div>
      {!placingItem && <button className={styles.shopBtn} onClick={onShop} title="Магазин построек">🏪</button>}
      <button className={styles.backBtn} onClick={onBack}>← Назад</button>
    </>
  );
}

// ─── Scene ───────────────────────────────────────────────────────────────────

function Scene({ camTargetRef, camStateRef, keysRef, inputRef, placingItem, placedItems, placementPosRef, placementRotYRef }) {
  return (
    <>
      <Sky distance={450000} sunPosition={[100, 80, 80]} turbidity={6} rayleigh={0.4} />
      <Stars radius={400} depth={60} count={2000} factor={3} fade speed={0.3} />
      <fog attach="fog" args={['#8ab4cc', 80, 350]} />
      <Lighting />
      <World camTargetRef={camTargetRef} />
      <RTSCamera
        camTargetRef={camTargetRef}
        camStateRef={camStateRef}
        keysRef={keysRef}
        inputRef={inputRef}
      />
      {placingItem === 'solar-panel' && (
        <SolarPanelPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />
      )}
      {placingItem === 'money-factory' && (
        <MoneyFactoryPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />
      )}
      {placedItems.map(item =>
        item.type === 'solar-panel'
          ? <SolarPanelPlaced key={item.id} position={item.position} rotation={item.rotation} />
          : item.type === 'money-factory'
          ? <MoneyFactoryPlaced key={item.id} position={item.position} rotation={item.rotation} />
          : null
      )}
    </>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function OpenCity({ onBack }) {
  const keysRef      = useRef({});
  const camTargetRef = useRef({ x: 0, z: 0 });
  const camStateRef  = useRef({ zoom: 50, rotY: 0 });
  const inputRef     = useRef({
    mouseX: null, mouseY: null,
    middleDrag: false, dragDeltaX: 0, dragDeltaY: 0,
    lastMX: 0, lastMY: 0,
    wheelDelta: 0,
  });
  const [displayPos,  setDisplayPos]  = useState({ x: 0, z: 0 });
  const [displayZoom, setDisplayZoom] = useState(50);
  const [shopOpen,    setShopOpen]    = useState(false);

  // Placement state
  const [placingItem,  setPlacingItem]  = useState(null);  // 'solar-panel' | null
  const [placedItems,  setPlacedItems]  = useState([]);
  const placementPosRef  = useRef(null);
  const placementRotYRef = useRef(0);
  const placingItemRef   = useRef(null);  // mirror for sync access in event handlers
  useEffect(() => { placingItemRef.current = placingItem; }, [placingItem]);

  const startPlacing = useCallback((type) => {
    placementRotYRef.current = 0;
    setPlacingItem(type);
  }, []);

  // Selection state
  const lmbHeldRef   = useRef(false);
  const selectedRef  = useRef(new Set());
  const meshMapRef   = useRef(new Map());
  const [selectedCount, setSelectedCount] = useState(0);

  const clearSelection = useCallback(() => {
    for (const id of selectedRef.current) {
      const mRef = meshMapRef.current.get(id);
      if (mRef?.current) {
        mRef.current.material.emissive.setHex(0x000000);
        mRef.current.material.emissiveIntensity = 0;
      }
    }
    selectedRef.current.clear();
    setSelectedCount(0);
  }, []);

  const cityCtx = useMemo(
    () => ({ lmbHeldRef, selectedRef, meshMapRef, placingItemRef }),
    []
  );

  // Keyboard
  useEffect(() => {
    const down = (e) => {
      keysRef.current[e.code] = true;
      if (e.code === 'Escape') {
        if (placingItemRef.current) { setPlacingItem(null); e.preventDefault(); return; }
        clearSelection();
      }
      e.preventDefault?.();
    };
    const up = (e) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', down, { passive: false });
    window.addEventListener('keyup',   up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup',   up);
    };
  }, [clearSelection]);

  // Mouse events
  const canvasWrapRef = useRef(null);
  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;

    const onMove = (e) => {
      const inp = inputRef.current;
      inp.mouseX = e.clientX;
      inp.mouseY = e.clientY;
      if (inp.middleDrag) {
        inp.dragDeltaX += e.clientX - inp.lastMX;
        inp.dragDeltaY += e.clientY - inp.lastMY;
      }
      inp.lastMX = e.clientX;
      inp.lastMY = e.clientY;
    };
    const onDown = (e) => {
      if (e.button === 0) {
        if (placingItemRef.current) {
          // LMB click during placement → place the object
          if (placementPosRef.current) {
            const pos = placementPosRef.current;
            setPlacedItems(prev => [...prev, {
              id: Date.now(),
              type: placingItemRef.current,
              position: [pos.x, pos.y, pos.z],
              rotation: placementRotYRef.current,
            }]);
            setPlacingItem(null);
          }
          return;
        }
        lmbHeldRef.current = true;
        inputRef.current.middleDrag = true;
        inputRef.current.lastMX = e.clientX;
        inputRef.current.lastMY = e.clientY;
      }
      if (e.button === 1 || e.button === 2) {
        inputRef.current.middleDrag = true;
        inputRef.current.lastMX = e.clientX;
        inputRef.current.lastMY = e.clientY;
        e.preventDefault();
      }
    };
    const onUp = (e) => {
      if (e.button === 0) {
        lmbHeldRef.current = false;
        inputRef.current.middleDrag = false;
      }
      if (e.button === 1 || e.button === 2)
        inputRef.current.middleDrag = false;
    };
    const onLeave = () => {
      inputRef.current.mouseX = null;
      inputRef.current.mouseY = null;
      inputRef.current.middleDrag = false;
    };
    const onWheel = (e) => {
      if (placingItemRef.current) {
        // Scroll rotates the object being placed
        placementRotYRef.current += e.deltaY > 0 ? 0.2 : -0.2;
      } else {
        inputRef.current.wheelDelta += e.deltaY > 0 ? 1 : -1;
      }
      e.preventDefault();
    };
    const onContext = (e) => e.preventDefault();

    el.addEventListener('mousemove',    onMove);
    el.addEventListener('mousedown',    onDown);
    el.addEventListener('mouseup',      onUp);
    el.addEventListener('mouseleave',   onLeave);
    el.addEventListener('wheel',        onWheel, { passive: false });
    el.addEventListener('contextmenu',  onContext);
    return () => {
      el.removeEventListener('mousemove',   onMove);
      el.removeEventListener('mousedown',   onDown);
      el.removeEventListener('mouseup',     onUp);
      el.removeEventListener('mouseleave',  onLeave);
      el.removeEventListener('wheel',       onWheel);
      el.removeEventListener('contextmenu', onContext);
    };
  }, []);

  // HUD update ~10fps
  useEffect(() => {
    const id = setInterval(() => {
      setDisplayPos({ x: camTargetRef.current.x, z: camTargetRef.current.z });
      setDisplayZoom(camStateRef.current.zoom);
      setSelectedCount(selectedRef.current.size);
    }, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <CityContext.Provider value={cityCtx}>
      <div className={styles.wrapper} ref={canvasWrapRef}>
        <Canvas
          shadows
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          style={{ width: '100%', height: '100%', position: 'relative', zIndex: 0 }}
        >
          <Scene
            camTargetRef={camTargetRef}
            camStateRef={camStateRef}
            keysRef={keysRef}
            inputRef={inputRef}
            placingItem={placingItem}
            placedItems={placedItems}
            placementPosRef={placementPosRef}
            placementRotYRef={placementRotYRef}
          />
        </Canvas>

        <HUD
          pos={displayPos}
          zoom={displayZoom}
          selectedCount={selectedCount}
          onClearSelection={clearSelection}
          onShop={() => setShopOpen(true)}
          onBack={onBack || (() => {})}
          placingItem={placingItem}
        />
        {shopOpen && <ShopModal onClose={() => setShopOpen(false)} onBuy={startPlacing} />}
      </div>
    </CityContext.Provider>
  );
}
