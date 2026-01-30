import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Sky, Environment, useGLTF, Box, Sphere, Plane, Text } from '@react-three/drei';
import { io } from 'socket.io-client';
import * as THREE from 'three';
import styles from './CodeIt.module.css';
import { FaArrowLeft, FaComments, FaPaperPlane, FaUsers, FaCrosshairs, FaHeart, FaSkull } from 'react-icons/fa';

// ==================== CONSTANTS ====================
const PLAYER_SPEED = 15;
const PLAYER_HEIGHT = 1.7;
const CROUCH_HEIGHT = 1.0;
const DAMAGE = 25;
const MAX_HEALTH = 100;
const ARENA_SIZE = 100;

const PLAYER_COLORS = [
  '#667eea', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

// Character model paths - KayKit Adventurers (CC0 License)
const CHARACTER_MODELS = [
  '/models/player.glb',    // Rogue
  '/models/knight.glb',    // Knight
  '/models/barbarian.glb', // Barbarian
  '/models/mage.glb'       // Mage
];

// Preload all character models
CHARACTER_MODELS.forEach(path => useGLTF.preload(path));

// ==================== LOADING PLACEHOLDER ====================
function LoadingPlaceholder({ color }) {
  return (
    <mesh>
      <capsuleGeometry args={[0.3, 1.2, 8, 16]} />
      <meshStandardMaterial color={color} transparent opacity={0.5} />
    </mesh>
  );
}

// ==================== PLAYER MODEL COMPONENT ====================
function PlayerModel({ modelPath, color }) {
  const { scene } = useGLTF(modelPath);
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    // Apply color tint to all meshes and hide weapons
    clone.traverse((child) => {
      if (child.isMesh) {
        // Hide weapon accessories (crossbow, dagger, sword, etc.)
        const nameLower = child.name.toLowerCase();
        if (nameLower.includes('crossbow') || 
            nameLower.includes('dagger') || 
            nameLower.includes('sword') ||
            nameLower.includes('weapon') ||
            nameLower.includes('arrow') ||
            nameLower.includes('bow') ||
            nameLower.includes('shield') ||
            nameLower.includes('staff') ||
            nameLower.includes('wand')) {
          child.visible = false;
          return;
        }
        
        child.material = child.material.clone();
        // Keep original texture but add slight color tint
        if (child.material.map) {
          // Don't override the texture color too much
          child.material.color.set('#ffffff');
        } else {
          child.material.color.set(color);
        }
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene, color]);
  
  return <primitive object={clonedScene} />;
}

// ==================== PLAYER COMPONENT ====================
function Player({ position, rotation, color, name, isCrouching, isShooting, playerIndex = 0 }) {
  const groupRef = useRef();
  const muzzleRef = useRef();
  
  // Select model based on player index
  const modelPath = CHARACTER_MODELS[playerIndex % CHARACTER_MODELS.length];
  
  useFrame(() => {
    if (muzzleRef.current) {
      muzzleRef.current.visible = isShooting;
    }
  });
  
  const height = isCrouching ? CROUCH_HEIGHT : PLAYER_HEIGHT;
  // KayKit models need to be scaled up significantly (they're tiny by default)
  const baseScale = 1.8;
  const scale = isCrouching ? baseScale * 0.7 : baseScale;
  
  return (
    <group position={position} rotation={[0, rotation?.[1] || 0, 0]} ref={groupRef}>
      {/* Character Model - scaled up and positioned at ground level */}
      <group scale={[scale, scale, scale]} position={[0, 0, 0]} rotation={[0, Math.PI, 0]}>
        <PlayerModel modelPath={modelPath} color={color} />
      </group>
      
      {/* Gun attached to character */}
      <group position={[0.3, height * 0.6, -0.4]} rotation={[rotation?.[0] || 0, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.08, 0.08, 0.4]} />
          <meshStandardMaterial color="#1a1a2e" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0, 0, -0.15]}>
          <boxGeometry args={[0.04, 0.12, 0.15]} />
          <meshStandardMaterial color="#2a2a3e" metalness={0.8} roughness={0.2} />
        </mesh>
        
        {/* Muzzle flash */}
        <mesh ref={muzzleRef} position={[0, 0, -0.3]} visible={false}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.9} />
        </mesh>
      </group>
      
      {/* Name tag */}
      <Text
        position={[0, height + 0.5, 0]}
        fontSize={0.25}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="black"
      >
        {name}
      </Text>
      
      {/* Health indicator above name */}
      <mesh position={[0, height + 0.75, 0]}>
        <planeGeometry args={[0.8, 0.08]} />
        <meshBasicMaterial color="#333" transparent opacity={0.7} />
      </mesh>
      <mesh position={[-0.4 + 0.4, height + 0.75, 0.01]}>
        <planeGeometry args={[0.78, 0.06]} />
        <meshBasicMaterial color="#10b981" />
      </mesh>
    </group>
  );
}

// ==================== FIRST PERSON CONTROLLER ====================
function FirstPersonController({ 
  onMove, 
  onShoot, 
  playerId, 
  health,
  isDead,
  players,
  playerElements 
}) {
  const { camera, gl } = useThree();
  const controlsRef = useRef();
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const keys = useRef({});
  const isCrouching = useRef(false);
  const canShoot = useRef(true);
  const raycaster = useRef(new THREE.Raycaster());
  
  // Movement
  useEffect(() => {
    const onKeyDown = (e) => {
      keys.current[e.code] = true;
      if (e.code === 'ShiftLeft') isCrouching.current = true;
    };
    const onKeyUp = (e) => {
      keys.current[e.code] = false;
      if (e.code === 'ShiftLeft') isCrouching.current = false;
    };
    
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);
  
  // Shooting - auto fire when holding mouse button
  const isMouseDown = useRef(false);
  const shootIntervalRef = useRef(null);
  const FIRE_RATE = 150; // ms between shots
  
  // Store onShoot in ref to avoid stale closure
  const onShootRef = useRef(onShoot);
  onShootRef.current = onShoot;
  
  const performShoot = () => {
    if (!controlsRef.current?.isLocked || !canShoot.current || isDead) return;
    
    canShoot.current = false;
    setTimeout(() => canShoot.current = true, FIRE_RATE);
    
    // Play shoot sound
    const audio = new Audio('/sounds/shoot.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});
    
    // Raycast to find hit
    raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    const playerMeshes = Object.values(playerElements.current).filter(Boolean);
    
    const hits = raycaster.current.intersectObjects(playerMeshes, true);
    
    let hitPlayerId = null;
    let hitPoint = null;
    
    if (hits.length > 0) {
      hitPoint = hits[0].point;
      
      // Find which player group was hit by traversing up the hierarchy
      let hitObject = hits[0].object;
      while (hitObject) {
        for (const [pid, group] of Object.entries(playerElements.current)) {
          if (group && (hitObject === group || group.children.includes(hitObject))) {
            hitPlayerId = pid;
            break;
          }
          // Check if hitObject is a descendant of group
          if (group) {
            let found = false;
            group.traverse((child) => {
              if (child === hitObject) found = true;
            });
            if (found) {
              hitPlayerId = pid;
              break;
            }
          }
        }
        if (hitPlayerId) break;
        hitObject = hitObject.parent;
      }
      
      console.log('[FPS] Raycast hit:', hitPlayerId, 'at', hitPoint);
    }
    
    // Calculate tracer
    const cameraPos = camera.position.clone();
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    
    const muzzleOffset = new THREE.Vector3(0.25, -0.15, -0.5);
    muzzleOffset.applyQuaternion(camera.quaternion);
    const tracerStart = cameraPos.clone().add(muzzleOffset);
    
    const maxDistance = 100;
    const tracerEnd = hitPoint 
      ? hitPoint.clone() 
      : tracerStart.clone().add(forward.multiplyScalar(maxDistance));
    
    const tracerData = {
      start: [tracerStart.x, tracerStart.y, tracerStart.z],
      end: [tracerEnd.x, tracerEnd.y, tracerEnd.z]
    };
    
    if (onShootRef.current) {
      onShootRef.current(hitPlayerId, tracerData);
    }
  };
  
  useEffect(() => {
    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      if (!controlsRef.current?.isLocked) return;
      
      isMouseDown.current = true;
      performShoot();
      
      // Clear any existing interval
      if (shootIntervalRef.current) {
        clearInterval(shootIntervalRef.current);
      }
      
      // Start auto-fire
      shootIntervalRef.current = setInterval(() => {
        if (isMouseDown.current && controlsRef.current?.isLocked) {
          performShoot();
        }
      }, FIRE_RATE);
    };
    
    const onMouseUp = (e) => {
      if (e.button !== 0) return;
      isMouseDown.current = false;
      
      if (shootIntervalRef.current) {
        clearInterval(shootIntervalRef.current);
        shootIntervalRef.current = null;
      }
    };
    
    // Also stop firing if pointer lock is lost
    const onPointerLockChange = () => {
      if (!document.pointerLockElement) {
        isMouseDown.current = false;
        if (shootIntervalRef.current) {
          clearInterval(shootIntervalRef.current);
          shootIntervalRef.current = null;
        }
      }
    };
    
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      if (shootIntervalRef.current) {
        clearInterval(shootIntervalRef.current);
      }
    };
  }, [camera, isDead]);
  
  useFrame((state, delta) => {
    if (!controlsRef.current?.isLocked || isDead) return;
    
    // Speed is slower when crouching (Shift held)
    const crouchSpeedMultiplier = isCrouching.current ? 0.5 : 1.0;
    const speed = PLAYER_SPEED * delta * crouchSpeedMultiplier;
    direction.current.set(0, 0, 0);
    
    // Get camera direction vectors
    const cameraObject = controlsRef.current.getObject();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    
    // Get forward direction (where camera is looking)
    cameraObject.getWorldDirection(forward);
    forward.y = 0; // Keep movement horizontal
    forward.normalize();
    
    // Get right direction
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    
    // Calculate movement direction
    if (keys.current['KeyW']) direction.current.add(forward);
    if (keys.current['KeyS']) direction.current.sub(forward);
    if (keys.current['KeyD']) direction.current.add(right);
    if (keys.current['KeyA']) direction.current.sub(right);
    
    direction.current.normalize();
    
    if (direction.current.length() > 0) {
      camera.position.x += direction.current.x * speed;
      camera.position.z += direction.current.z * speed;
      
      // Clamp to arena
      camera.position.x = Math.max(-ARENA_SIZE/2 + 1, Math.min(ARENA_SIZE/2 - 1, camera.position.x));
      camera.position.z = Math.max(-ARENA_SIZE/2 + 1, Math.min(ARENA_SIZE/2 - 1, camera.position.z));
    }
    
    // Set camera height
    const targetHeight = isCrouching.current ? CROUCH_HEIGHT : PLAYER_HEIGHT;
    camera.position.y += (targetHeight - camera.position.y) * 0.2;
    
    // Report position
    const rotation = controlsRef.current.getObject().rotation;
    onMove({
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      rx: camera.rotation.x,
      ry: rotation.y,
      crouch: isCrouching.current
    });
  });
  
  // Handle manual pointer lock with error handling
  useEffect(() => {
    let lockTimeout = null;
    let canLock = true;
    
    const requestLock = async () => {
      if (!canLock || document.pointerLockElement) return;
      
      try {
        await gl.domElement.requestPointerLock();
      } catch (error) {
        // Silently ignore pointer lock errors - they're not critical
        console.log('[FPS] Pointer lock request ignored:', error.message);
      }
    };
    
    const handleClick = () => {
      if (!document.pointerLockElement && canLock) {
        requestLock();
      }
    };
    
    const handlePointerLockChange = () => {
      if (!document.pointerLockElement) {
        // Add delay before allowing new lock request (browser security requirement)
        canLock = false;
        lockTimeout = setTimeout(() => {
          canLock = true;
        }, 1500);
      }
    };
    
    const handlePointerLockError = (e) => {
      // Silently ignore - not critical
      console.log('[FPS] Pointer lock error (ignored)');
    };
    
    gl.domElement.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('pointerlockerror', handlePointerLockError);
    
    return () => {
      gl.domElement.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('pointerlockerror', handlePointerLockError);
      if (lockTimeout) clearTimeout(lockTimeout);
    };
  }, [gl]);
  
  return <PointerLockControls ref={controlsRef} makeDefault={false} />;
}

// ==================== GUN (FIRST PERSON VIEW) ====================
function FirstPersonGun({ isShooting }) {
  const { camera } = useThree();
  const gunGroupRef = useRef();
  const recoilRef = useRef(0);
  
  useFrame(() => {
    if (!gunGroupRef.current) return;
    
    // Copy camera position and rotation
    gunGroupRef.current.position.copy(camera.position);
    gunGroupRef.current.rotation.copy(camera.rotation);
    
    // Apply recoil decay
    recoilRef.current *= 0.85;
    
    // Offset gun to lower right of view
    const offset = new THREE.Vector3(0.25, -0.2, -0.4);
    offset.applyQuaternion(camera.quaternion);
    gunGroupRef.current.position.add(offset);
    
    // Add recoil to rotation
    gunGroupRef.current.rotation.x -= recoilRef.current;
  });
  
  // Trigger recoil on shoot
  useEffect(() => {
    if (isShooting) {
      recoilRef.current = 0.15;
    }
  }, [isShooting]);
  
  return (
    <group ref={gunGroupRef}>
      {/* Gun body - rifle style */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.06, 0.1, 0.45]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Stock */}
      <mesh position={[0, 0.02, 0.28]}>
        <boxGeometry args={[0.05, 0.08, 0.2]} />
        <meshStandardMaterial color="#4a3728" metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Barrel */}
      <mesh position={[0, 0.02, -0.32]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.022, 0.25, 8]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Grip */}
      <mesh position={[0, -0.1, 0.1]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.04, 0.12, 0.05]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.5} />
      </mesh>
      
      {/* Magazine */}
      <mesh position={[0, -0.08, -0.05]}>
        <boxGeometry args={[0.035, 0.12, 0.06]} />
        <meshStandardMaterial color="#222" metalness={0.7} roughness={0.3} />
      </mesh>
      
      {/* Sight rail */}
      <mesh position={[0, 0.07, 0]}>
        <boxGeometry args={[0.025, 0.02, 0.3]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Front sight */}
      <mesh position={[0, 0.1, -0.18]}>
        <boxGeometry args={[0.015, 0.04, 0.015]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Rear sight */}
      <mesh position={[0, 0.1, 0.05]}>
        <boxGeometry args={[0.03, 0.035, 0.02]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Muzzle flash */}
      {isShooting && (
        <>
          <pointLight 
            position={[0, 0.02, -0.5]} 
            color="#ffaa00" 
            intensity={10} 
            distance={5}
          />
          <mesh position={[0, 0.02, -0.5]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial color="#ffcc00" transparent opacity={0.95} />
          </mesh>
          <mesh position={[0, 0.02, -0.55]} rotation={[Math.PI/2, 0, 0]}>
            <coneGeometry args={[0.06, 0.15, 8]} />
            <meshBasicMaterial color="#ff8800" transparent opacity={0.7} />
          </mesh>
        </>
      )}
    </group>
  );
}

// ==================== ARENA MAP ====================
function ArenaMap() {
  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ARENA_SIZE, ARENA_SIZE]} />
        <meshStandardMaterial color="#3d5c3d" />
      </mesh>
      
      {/* Walls */}
      {[
        { pos: [0, 2.5, -ARENA_SIZE/2], rot: [0, 0, 0], size: [ARENA_SIZE, 5, 0.5] },
        { pos: [0, 2.5, ARENA_SIZE/2], rot: [0, 0, 0], size: [ARENA_SIZE, 5, 0.5] },
        { pos: [-ARENA_SIZE/2, 2.5, 0], rot: [0, Math.PI/2, 0], size: [ARENA_SIZE, 5, 0.5] },
        { pos: [ARENA_SIZE/2, 2.5, 0], rot: [0, Math.PI/2, 0], size: [ARENA_SIZE, 5, 0.5] },
      ].map((wall, i) => (
        <mesh key={i} position={wall.pos} rotation={wall.rot} castShadow receiveShadow>
          <boxGeometry args={wall.size} />
          <meshStandardMaterial color="#666" />
        </mesh>
      ))}
      
      {/* Obstacles / Cover */}
      {[
        { pos: [10, 1, 10], size: [3, 2, 3] },
        { pos: [-10, 1, -10], size: [3, 2, 3] },
        { pos: [15, 1, -15], size: [4, 2, 2] },
        { pos: [-15, 1, 15], size: [2, 2, 4] },
        { pos: [0, 1.5, 0], size: [5, 3, 5] },
        { pos: [25, 1, 0], size: [3, 2, 6] },
        { pos: [-25, 1, 0], size: [3, 2, 6] },
        { pos: [0, 1, 25], size: [6, 2, 3] },
        { pos: [0, 1, -25], size: [6, 2, 3] },
      ].map((box, i) => (
        <mesh key={`box-${i}`} position={box.pos} castShadow receiveShadow>
          <boxGeometry args={box.size} />
          <meshStandardMaterial color="#8b7355" />
        </mesh>
      ))}
      
      {/* Trees / Decoration */}
      {[
        [-20, 0, -20], [20, 0, 20], [-20, 0, 20], [20, 0, -20],
        [-30, 0, 0], [30, 0, 0], [0, 0, 30], [0, 0, -30],
      ].map((pos, i) => (
        <group key={`tree-${i}`} position={pos}>
          {/* Trunk */}
          <mesh position={[0, 2, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.4, 4, 8]} />
            <meshStandardMaterial color="#5c4033" />
          </mesh>
          {/* Leaves */}
          <mesh position={[0, 5, 0]} castShadow>
            <coneGeometry args={[2, 4, 8]} />
            <meshStandardMaterial color="#228b22" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ==================== BULLET TRACER SYSTEM ====================
function BulletTracer({ start, end, onComplete }) {
  const lineRef = useRef();
  const [opacity, setOpacity] = useState(1);
  const [progress, setProgress] = useState(0);
  const startTime = useRef(Date.now());
  
  const startVec = useMemo(() => new THREE.Vector3(...start), [start]);
  const endVec = useMemo(() => new THREE.Vector3(...end), [end]);
  const direction = useMemo(() => endVec.clone().sub(startVec).normalize(), [startVec, endVec]);
  const distance = useMemo(() => startVec.distanceTo(endVec), [startVec, endVec]);
  
  useFrame(() => {
    const elapsed = (Date.now() - startTime.current) / 1000;
    const bulletSpeed = 200; // units per second
    const newProgress = Math.min(elapsed * bulletSpeed / distance, 1);
    setProgress(newProgress);
    
    // Fade out after reaching target
    if (newProgress >= 1) {
      const fadeTime = elapsed - (distance / bulletSpeed);
      setOpacity(Math.max(0, 1 - fadeTime * 5));
      if (opacity <= 0) {
        onComplete?.();
      }
    }
  });
  
  // Calculate current tracer position (trailing effect)
  const trailLength = Math.min(distance * 0.3, 10); // Max 10 units trail
  const currentEnd = startVec.clone().lerp(endVec, progress);
  const currentStart = progress > 0.1 
    ? startVec.clone().lerp(endVec, Math.max(0, progress - trailLength / distance))
    : startVec.clone();
  
  const positions = useMemo(() => {
    return new Float32Array([
      currentStart.x, currentStart.y, currentStart.z,
      currentEnd.x, currentEnd.y, currentEnd.z
    ]);
  }, [currentStart, currentEnd]);
  
  return (
    <group>
      {/* Main tracer line */}
      <line ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={positions}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial 
          color="#ffff00" 
          transparent 
          opacity={opacity * 0.9}
          linewidth={2}
        />
      </line>
      
      {/* Glowing core */}
      <mesh position={currentEnd.toArray()}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="#ffaa00" transparent opacity={opacity} />
      </mesh>
      
      {/* Impact spark at end */}
      {progress >= 1 && opacity > 0.5 && (
        <group position={endVec.toArray()}>
          <pointLight color="#ffaa00" intensity={opacity * 3} distance={2} />
          <mesh>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color="#ff6600" transparent opacity={opacity * 0.8} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// Tracer manager component
function TracerManager({ tracers, onTracerComplete }) {
  return (
    <>
      {tracers.map((tracer) => (
        <BulletTracer
          key={tracer.id}
          start={tracer.start}
          end={tracer.end}
          onComplete={() => onTracerComplete(tracer.id)}
        />
      ))}
    </>
  );
}

// ==================== 3D SCENE ====================
function GameScene({ 
  playerId, 
  players, 
  onMove, 
  onShoot,
  health,
  isDead,
  tracers,
  onTracerComplete
}) {
  const playerElements = useRef({});
  const [isShooting, setIsShooting] = useState(false);
  const { camera } = useThree();
  
  const handleShoot = (hitPlayerId, tracerData) => {
    setIsShooting(true);
    setTimeout(() => setIsShooting(false), 100);
    onShoot(hitPlayerId, tracerData);
  };
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[50, 50, 25]} 
        intensity={1} 
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={200}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      
      {/* Sky */}
      <Sky sunPosition={[100, 50, 100]} />
      
      {/* Bullet Tracers */}
      <TracerManager tracers={tracers} onTracerComplete={onTracerComplete} />
      
      {/* Map */}
      <ArenaMap />
      
      {/* Other Players */}
      <Suspense fallback={null}>
        {Object.entries(players).map(([pid, player], index) => {
          if (pid === playerId) return null;
          return (
            <group 
              key={pid} 
              ref={el => { if (el) playerElements.current[pid] = el; }}
            >
              <Player
                position={[player.x, 0, player.z]}
                rotation={[player.rx, player.ry, 0]}
                color={player.color}
                name={player.name}
                isCrouching={player.crouch}
                isShooting={player.shooting}
                playerIndex={index}
              />
            </group>
          );
        })}
      </Suspense>
      
      {/* First person gun - follows camera */}
      <FirstPersonGun isShooting={isShooting} />
      
      {/* Controls */}
      {!isDead && (
        <FirstPersonController
          onMove={onMove}
          onShoot={handleShoot}
          playerId={playerId}
          health={health}
          isDead={isDead}
          players={players}
          playerElements={playerElements}
        />
      )}
    </>
  );
}

// ==================== MAIN COMPONENT ====================
function CodeIt() {
  const [gameState, setGameState] = useState('menu'); // menu, playing
  const [players, setPlayers] = useState({});
  const [myId, setMyId] = useState(null);
  const [health, setHealth] = useState(MAX_HEALTH);
  const [isDead, setIsDead] = useState(false);
  const [kills, setKills] = useState(0);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [connected, setConnected] = useState(false);
  const [isShooting, setIsShooting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tracers, setTracers] = useState([]);
  const [damageIndicator, setDamageIndicator] = useState(null); // {direction: 'left'|'right'|'top'|'bottom', damage: number}
  const [hitMarker, setHitMarker] = useState(false); // Shows when you hit someone
  const tracerIdRef = useRef(0);
  
  const socketRef = useRef(null);
  const gameContainerRef = useRef(null);
  
  // Fullscreen toggle with F11
  useEffect(() => {
    const handleFullscreen = (e) => {
      if (e.key === 'F11') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          gameContainerRef.current?.requestFullscreen?.();
          setIsFullscreen(true);
        } else {
          document.exitFullscreen?.();
          setIsFullscreen(false);
        }
      }
    };
    
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    window.addEventListener('keydown', handleFullscreen);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      window.removeEventListener('keydown', handleFullscreen);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  // Connect to server
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    // Track pointer lock state
    const onPointerLockChange = () => {
      setIsLocked(!!document.pointerLockElement);
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);
    
    const token = localStorage.getItem('token');
    // Get socket URL without /api path - just host:port
    const socketUrl = import.meta.env.VITE_WS_URL 
      || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : null)
      || `${window.location.protocol}//${window.location.hostname}:5000`;
    
    console.log('[FPS] Attempting to connect to:', `${socketUrl}/codeit-fps`);
    
    // Connect to FPS namespace - URL format: http://host:port/namespace
    const socket = io(`${socketUrl}/codeit-fps`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000
    });
    
    console.log('[FPS] Socket created, namespace:', socket.nsp);
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('[FPS] Socket connected:', socket.id);
      setConnected(true);
      socket.emit('fps:join', { name: playerName });
    });
    
    socket.on('connect_error', (err) => {
      console.error('[FPS] Connection error:', err);
    });
    
    socket.on('disconnect', () => {
      console.log('[FPS] Socket disconnected');
      setConnected(false);
    });
    
    socket.on('fps:init', (data) => {
      console.log('[FPS] Init received:', data);
      setMyId(data.id);
      setPlayers(data.players || {});
      setHealth(MAX_HEALTH);
      setIsDead(false);
    });
    
    socket.on('fps:player-joined', (player) => {
      setPlayers(prev => ({ ...prev, [player.id]: player }));
      setMessages(prev => [...prev, { type: 'system', text: `${player.name} присоединился!` }]);
    });
    
    socket.on('fps:player-left', (playerId) => {
      setPlayers(prev => {
        const p = prev[playerId];
        if (p) setMessages(prev => [...prev, { type: 'system', text: `${p.name} вышел` }]);
        const newPlayers = { ...prev };
        delete newPlayers[playerId];
        return newPlayers;
      });
    });
    
    socket.on('fps:player-moved', (data) => {
      setPlayers(prev => ({
        ...prev,
        [data.id]: { ...prev[data.id], ...data }
      }));
    });
    
    socket.on('fps:player-shot', (data) => {
      setPlayers(prev => ({
        ...prev,
        [data.id]: { ...prev[data.id], shooting: true }
      }));
      setTimeout(() => {
        setPlayers(prev => ({
          ...prev,
          [data.id]: { ...prev[data.id], shooting: false }
        }));
      }, 100);
    });
    
    socket.on('fps:hit', (data) => {
      if (data.targetId === myId) {
        // Show damage indicator
        setDamageIndicator({ damage: DAMAGE });
        setTimeout(() => setDamageIndicator(null), 500);
        
        setHealth(prev => {
          const newHealth = prev - DAMAGE;
          if (newHealth <= 0) {
            setIsDead(true);
            setMessages(prev => [...prev, { 
              type: 'system', 
              text: `Тебя убил ${data.shooterName}!` 
            }]);
          }
          return Math.max(0, newHealth);
        });
      }
      
      // Show hit marker when you hit someone
      if (data.shooterId === myId) {
        setHitMarker(true);
        setTimeout(() => setHitMarker(false), 150);
      }
      
      setMessages(prev => [...prev, { 
        type: 'system', 
        text: `${data.shooterName} попал в ${data.targetName}! (-${DAMAGE} HP)` 
      }]);
    });
    
    socket.on('fps:kill', (data) => {
      if (data.killerId === myId) {
        setKills(prev => prev + 1);
      }
      setMessages(prev => [...prev, { 
        type: 'kill', 
        text: `💀 ${data.killerName} убил ${data.victimName}` 
      }]);
    });
    
    socket.on('fps:respawn', (data) => {
      if (data.id === myId) {
        setHealth(MAX_HEALTH);
        setIsDead(false);
      }
    });
    
    socket.on('fps:chat', (message) => {
      setMessages(prev => [...prev.slice(-50), message]);
    });
    
    return () => {
      socket.disconnect();
      document.removeEventListener('pointerlockchange', onPointerLockChange);
    };
  }, [gameState, playerName]);
  
  // Handle player movement
  const handleMove = useCallback((pos) => {
    if (socketRef.current && !isDead) {
      socketRef.current.emit('fps:move', pos);
    }
  }, [isDead]);
  
  // Handle shooting
  const handleShoot = useCallback((hitPlayerId, tracerData) => {
    if (socketRef.current && !isDead) {
      setIsShooting(true);
      setTimeout(() => setIsShooting(false), 100);
      socketRef.current.emit('fps:shoot', { hitPlayerId });
      
      // Add tracer
      if (tracerData) {
        const newTracer = {
          id: tracerIdRef.current++,
          start: tracerData.start,
          end: tracerData.end
        };
        setTracers(prev => [...prev, newTracer]);
      }
    }
  }, [isDead]);
  
  // Remove completed tracer
  const handleTracerComplete = useCallback((tracerId) => {
    setTracers(prev => prev.filter(t => t.id !== tracerId));
  }, []);
  
  // Handle respawn
  const handleRespawn = () => {
    if (socketRef.current) {
      socketRef.current.emit('fps:respawn');
    }
  };
  
  // Send chat message
  const sendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;
    socketRef.current.emit('fps:chat', { text: chatInput });
    setChatInput('');
  };
  
  // Start game
  const startGame = () => {
    if (!playerName.trim()) return;
    setGameState('playing');
  };
  
  // ==================== MENU SCREEN ====================
  if (gameState === 'menu') {
    return (
      <div className={styles.container}>
        <div className={styles.menuScreen}>
          <div className={styles.menuHeader}>
            <div className={styles.logo3d}>
              <span className={styles.gunIcon}></span>
            </div>
            <h1>CodeIt FPS</h1>
            <p>БЛЯДЬ</p>
          </div>
          
          <div className={styles.menuContent}>
            <div className={styles.features}>
              <div className={styles.feature}>
                <FaUsers />
                <span>Мультиплеер</span>
              </div>
              <div className={styles.feature}>
                <FaCrosshairs />
                <span>От первого лица</span>
              </div>
              <div className={styles.feature}>
                <FaSkull />
                <span>PvP бои</span>
              </div>
            </div>
            
            <div className={styles.joinForm}>
              <input
                type="text"
                placeholder="Введи своё имя..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                onKeyPress={(e) => e.key === 'Enter' && startGame()}
              />
              <button onClick={startGame} disabled={!playerName.trim()}>
                В бой! 🎮
              </button>
            </div>
            
            <div className={styles.controls}>
              <h3>Управление:</h3>
              <div className={styles.controlsList}>
                <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> — движение</p>
                <p><kbd>Мышь</kbd> — прицеливание</p>
                <p><kbd>ЛКМ</kbd> — стрельба</p>
                <p><kbd>Shift</kbd> — присесть</p>
                <p><kbd>Enter</kbd> — чат</p>
                <p><kbd>F11</kbd> — полный экран</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // ==================== GAME SCREEN ====================
  return (
    <div className={styles.container} ref={gameContainerRef}>
      <div className={styles.gameScreen}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => setGameState('menu')}>
            <FaArrowLeft /> Выход
          </button>
          <div className={styles.status}>
            <span className={`${styles.connectionDot} ${connected ? styles.online : ''}`}></span>
            {connected ? 'Онлайн' : 'Подключение...'}
          </div>
          <div className={styles.stats}>
            <span className={styles.kills}><FaSkull /> {kills}</span>
            <span className={styles.playersCount}>
              <FaUsers /> {Object.keys(players).length}
            </span>
          </div>
          {/* Fullscreen hint */}
          <div className={styles.fullscreenHint}>
            <kbd>F11</kbd> — полный экран
          </div>
        </div>
        
        {/* 3D Canvas */}
        <div className={styles.canvasWrapper}>
          <Canvas
            shadows
            camera={{ fov: 75, near: 0.1, far: 1000, position: [0, PLAYER_HEIGHT, 0] }}
            onCreated={({ gl }) => {
              gl.shadowMap.enabled = true;
              gl.shadowMap.type = THREE.PCFSoftShadowMap;
            }}
          >
            <GameScene
              playerId={myId}
              players={players}
              onMove={handleMove}
              onShoot={handleShoot}
              health={health}
              isDead={isDead}
              tracers={tracers}
              onTracerComplete={handleTracerComplete}
            />
          </Canvas>
          
          {/* Crosshair */}
          {!isDead && (
            <div className={`${styles.crosshair} ${hitMarker ? styles.hitMarker : ''}`}>
              <div className={styles.crosshairH}></div>
              <div className={styles.crosshairV}></div>
              {hitMarker && (
                <>
                  <div className={styles.hitX1}></div>
                  <div className={styles.hitX2}></div>
                </>
              )}
            </div>
          )}
          
          {/* Damage indicator overlay */}
          {damageIndicator && (
            <div className={styles.damageOverlay}>
              <div className={styles.damageVignette}></div>
              <div className={styles.damageNumber}>-{damageIndicator.damage}</div>
            </div>
          )}
          
          {/* Health bar */}
          <div className={styles.healthBar}>
            <FaHeart className={styles.heartIcon} />
            <div className={styles.healthTrack}>
              <div 
                className={styles.healthValue} 
                style={{ width: `${health}%`, background: health > 50 ? '#10b981' : health > 25 ? '#f59e0b' : '#ef4444' }}
              ></div>
            </div>
            <span className={styles.healthText}>{health}</span>
          </div>
          
          {/* Death screen */}
          {isDead && (
            <div className={styles.deathScreen}>
              <FaSkull className={styles.deathIcon} />
              <h1>ТЫ УБИТ!</h1>
              <button onClick={handleRespawn}>Возродиться</button>
            </div>
          )}
          
          {/* Click to play overlay */}
          {!isDead && !isLocked && (
            <div className={styles.clickOverlay} id="click-overlay">
              <p>Кликни чтобы играть</p>
            </div>
          )}
        </div>
        
        {/* Chat */}
        <div className={`${styles.chatPanel} ${showChat ? styles.open : ''}`}>
          <div className={styles.chatHeader} onClick={() => setShowChat(!showChat)}>
            <FaComments /> Чат
          </div>
          
          {showChat && (
            <>
              <div className={styles.chatMessages}>
                {messages.length === 0 ? (
                  <div className={styles.chatEmpty}>Чат пуст</div>
                ) : (
                  messages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`${styles.chatMessage} ${msg.type === 'system' ? styles.system : ''} ${msg.type === 'kill' ? styles.kill : ''}`}
                    >
                      {msg.type === 'system' || msg.type === 'kill' ? (
                        <span className={styles.systemText}>{msg.text}</span>
                      ) : (
                        <>
                          <span className={styles.chatAuthor} style={{ color: msg.color }}>
                            {msg.name}:
                          </span>
                          <span className={styles.chatText}>{msg.text}</span>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              <form className={styles.chatInput} onSubmit={sendMessage}>
                <input
                  type="text"
                  placeholder="Сообщение..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  maxLength={200}
                />
                <button type="submit"><FaPaperPlane /></button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CodeIt;
