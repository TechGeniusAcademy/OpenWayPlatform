import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  PointerLockControls,
  Sky,
  Stars,
} from '@react-three/drei';
import * as THREE from 'three';
import styles from './OpenCity.module.css';

// ─── Constants ──────────────────────────────────────────────────────────────

const CHUNK_SIZE     = 40;   // world units per chunk side
const RENDER_DIST    = 4;    // chunks in each direction (9×9 grid)
const MOVE_SPEED     = 12;   // units per second
const SPRINT_MULT    = 2.8;
const FLY_SPEED      = 8;

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
        <mesh
          key={i}
          castShadow
          receiveShadow
          position={[d.bx, d.bh / 2, d.bz]}
        >
          <boxGeometry args={[d.bw, d.bh, d.bd]} />
          <meshStandardMaterial
            color={`hsl(${Math.floor(d.hue * 360)}, 20%, 30%)`}
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── World (infinite chunk manager) ─────────────────────────────────────────

function World({ playerPosRef }) {
  const [chunks, setChunks] = useState(() => initialChunks());

  function initialChunks() {
    const set = new Set();
    for (let dx = -RENDER_DIST; dx <= RENDER_DIST; dx++)
      for (let dz = -RENDER_DIST; dz <= RENDER_DIST; dz++)
        set.add(`${dx},${dz}`);
    return set;
  }

  useFrame(() => {
    const pos   = playerPosRef.current;
    const cx    = Math.round(pos.x / CHUNK_SIZE);
    const cz    = Math.round(pos.z / CHUNK_SIZE);
    const next  = new Set();
    for (let dx = -RENDER_DIST; dx <= RENDER_DIST; dx++)
      for (let dz = -RENDER_DIST; dz <= RENDER_DIST; dz++)
        next.add(`${cx + dx},${cz + dz}`);

    // Only update state when the visible set changes
    if (next.size !== chunks.size || [...next].some(k => !chunks.has(k))) {
      setChunks(next);
    }
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

// ─── Player controller (WASD + PointerLock) ──────────────────────────────────

function PlayerController({ keysRef, playerPosRef, onLockChange }) {
  const { camera } = useThree();
  const controlsRef  = useRef();
  const velRef       = useRef(new THREE.Vector3());
  const frontVec     = useRef(new THREE.Vector3());
  const sideVec      = useRef(new THREE.Vector3());

  useEffect(() => {
    camera.position.set(0, 2.5, 0);
  }, []);

  useEffect(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    const onLock   = () => onLockChange(true);
    const onUnlock = () => onLockChange(false);
    ctrl.addEventListener('lock',   onLock);
    ctrl.addEventListener('unlock', onUnlock);
    return () => {
      ctrl.removeEventListener('lock',   onLock);
      ctrl.removeEventListener('unlock', onUnlock);
    };
  }, [onLockChange]);

  useFrame((_, delta) => {
    const keys    = keysRef.current;
    const sprint  = keys['ShiftLeft'] || keys['ShiftRight'];
    const speed   = (MOVE_SPEED * (sprint ? SPRINT_MULT : 1)) * Math.min(delta, 0.05);
    const flySpd  = FLY_SPEED * Math.min(delta, 0.05);

    // Horizontal movement in camera direction
    camera.getWorldDirection(frontVec.current);
    frontVec.current.y = 0;
    frontVec.current.normalize();
    sideVec.current.crossVectors(frontVec.current, camera.up).normalize();

    const vel = velRef.current.set(0, 0, 0);
    if (keys['KeyW'] || keys['ArrowUp'])    vel.addScaledVector(frontVec.current,  speed);
    if (keys['KeyS'] || keys['ArrowDown'])  vel.addScaledVector(frontVec.current, -speed);
    if (keys['KeyA'] || keys['ArrowLeft'])  vel.addScaledVector(sideVec.current,  -speed);
    if (keys['KeyD'] || keys['ArrowRight']) vel.addScaledVector(sideVec.current,   speed);
    if (keys['Space'])                      vel.y +=  flySpd;
    if (keys['KeyC'] || keys['ControlLeft']) vel.y -= flySpd;

    camera.position.add(vel);
    // Keep minimum height (ground level)
    if (camera.position.y < 1.5) camera.position.y = 1.5;

    playerPosRef.current.copy(camera.position);
  });

  return (
    <PointerLockControls
      ref={controlsRef}
      makeDefault
    />
  );
}

// ─── Lighting ────────────────────────────────────────────────────────────────

function Lighting() {
  const sunRef = useRef();

  useFrame(({ clock }) => {
    // Slow day/night cycle — sun orbits
    const t = clock.getElapsedTime() * 0.02;
    if (sunRef.current) {
      sunRef.current.position.set(
        Math.cos(t) * 200,
        Math.sin(t) * 200,
        Math.sin(t * 0.5) * 100
      );
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} color="#c8d8ff" />
      <directionalLight
        ref={sunRef}
        castShadow
        intensity={1.8}
        color="#fff8e0"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={500}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={150}
        shadow-camera-bottom={-150}
      />
      <hemisphereLight args={['#a0c8ff', '#3a5a3a', 0.5]} />
    </>
  );
}

// ─── HUD ─────────────────────────────────────────────────────────────────────

function HUD({ locked, pos, onBack }) {
  return (
    <>
      {/* Crosshair */}
      {locked && <div className={styles.crosshair} />}

      {/* Click-to-start overlay */}
      {!locked && (
        <div className={styles.clickOverlay}>
          <div className={styles.clickCard}>
            <div className={styles.cityLogo}>🏙️</div>
            <h2>OpenCity</h2>
            <p>Кликни чтобы войти в мир</p>
            <div className={styles.controlsHint}>
              <div><kbd>W A S D</kbd> — движение</div>
              <div><kbd>Мышь</kbd> — обзор</div>
              <div><kbd>Space</kbd> — вверх &nbsp; <kbd>C</kbd> — вниз</div>
              <div><kbd>Shift</kbd> — спринт &nbsp; <kbd>Esc</kbd> — выход</div>
            </div>
          </div>
        </div>
      )}

      {/* Coordinates */}
      {locked && (
        <div className={styles.coords}>
          X: {pos.x.toFixed(1)} &nbsp; Y: {pos.y.toFixed(1)} &nbsp; Z: {pos.z.toFixed(1)}
        </div>
      )}

      {/* Back button */}
      <button className={styles.backBtn} onClick={onBack}>← Назад</button>
    </>
  );
}

// ─── Scene ───────────────────────────────────────────────────────────────────

function Scene({ keysRef, playerPosRef, onLockChange }) {
  const { camera } = useThree();

  return (
    <>
      <Sky
        distance={450000}
        sunPosition={[100, 50, 100]}
        inclination={0.49}
        azimuth={0.25}
        turbidity={8}
        rayleigh={0.5}
      />
      <Stars radius={300} depth={60} count={3000} factor={4} fade speed={0.5} />
      <fog attach="fog" args={['#8ab4cc', 60, 260]} />

      <Lighting />

      <World playerPosRef={playerPosRef} />

      <PlayerController
        keysRef={keysRef}
        playerPosRef={playerPosRef}
        onLockChange={onLockChange}
      />
    </>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function OpenCity({ onBack }) {
  const keysRef      = useRef({});
  const playerPosRef = useRef(new THREE.Vector3(0, 2.5, 0));
  const [locked, setLocked]   = useState(false);
  const [pos, setPos]         = useState({ x: 0, y: 2.5, z: 0 });

  // Keyboard state
  useEffect(() => {
    const down = (e) => { keysRef.current[e.code] = true; };
    const up   = (e) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup',   up);
    };
  }, []);

  // Update HUD coords ~10fps
  useEffect(() => {
    const id = setInterval(() => {
      const p = playerPosRef.current;
      setPos({ x: p.x, y: p.y, z: p.z });
    }, 100);
    return () => clearInterval(id);
  }, []);

  const handleLockChange = useCallback((v) => setLocked(v), []);

  return (
    <div className={styles.wrapper}>
      <Canvas
        shadows
        camera={{ fov: 75, near: 0.1, far: 600 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene
          keysRef={keysRef}
          playerPosRef={playerPosRef}
          onLockChange={handleLockChange}
        />
      </Canvas>

      <HUD locked={locked} pos={pos} onBack={onBack || (() => {})} />
    </div>
  );
}
