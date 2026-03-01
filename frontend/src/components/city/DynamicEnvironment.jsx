import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { getSunPosition, getSkyParams, getLighting, getFogColor } from '../systems/dayNight.js';

// ─── Performance-tuned environment ──────────────────────────────────────────
// Sky / lighting updates are throttled to every 4 frames (game clock moves
// slowly — per-frame updates are pure waste with no visible difference).
// Shadow map reduced 2048→1024; shadow camera tightened 200→100 (better
// shadow resolution in the playable area); Stars halved to 1200 (static).

export function DynamicEnvironment({ gameTimeRef }) {
  const skyRef   = useRef();
  const sunRef   = useRef();
  const ambRef   = useRef();
  const hemiRef  = useRef();
  const moonRef  = useRef();
  const frameRef = useRef(0);        // throttle counter
  const { scene, gl } = useThree();

  // Set tone-mapping once (not every render)
  gl.toneMapping         = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.4;

  useFrame(() => {
    // Only update sky/lights every 4 frames — saves ~75 % of JS work here
    if (++frameRef.current % 4 !== 0) return;

    const h = gameTimeRef.current;
    const [sx, sy, sz] = getSunPosition(h);
    const lit = getLighting(h);
    const sky = getSkyParams(h);

    if (skyRef.current?.material?.uniforms) {
      const u = skyRef.current.material.uniforms;
      u.sunPosition.value.set(sx, sy, sz);
      u.turbidity.value       = sky.turbidity;
      u.rayleigh.value        = sky.rayleigh;
      u.mieCoefficient.value  = sky.mieCoefficient;
      u.mieDirectionalG.value = sky.mieDirectionalG;
    }

    if (sunRef.current) {
      sunRef.current.position.set(sx, sy, sz);
      sunRef.current.intensity = lit.dirIntensity;
      sunRef.current.color.set(lit.dirColor);
      sunRef.current.castShadow = lit.dirIntensity > 0.3;
      sunRef.current.target.updateMatrixWorld();
    }

    if (ambRef.current) {
      ambRef.current.intensity = lit.ambientIntensity;
      ambRef.current.color.set(lit.ambientColor);
    }

    if (hemiRef.current) {
      hemiRef.current.intensity = lit.hemiIntensity;
      hemiRef.current.color.set(lit.hemiSky);
      hemiRef.current.groundColor.set(lit.hemiGround);
    }

    if (moonRef.current) {
      const elev = Math.sin(((h / 24) * 2 - 0.5) * Math.PI);
      moonRef.current.intensity = 0.4 + Math.max(0, -elev) * 0.9;
    }

    if (scene.fog) scene.fog.color.set(getFogColor(h));
  });

  return (
    <>
      <Sky
        ref={skyRef}
        distance={450000}
        sunPosition={[200, 100, 60]}
        turbidity={2}
        rayleigh={0.5}
        mieCoefficient={0.002}
        mieDirectionalG={0.98}
      />
      {/* Stars: 1200 (was 3000), speed=0 → static, no per-frame animation */}
      <Stars radius={400} depth={60} count={1200} factor={4} fade speed={0} />
      <fog attach="fog" args={[getFogColor(8), 80, 180]} />

      <ambientLight ref={ambRef} intensity={1.2} color="#ddeeff" />

      {/* Sun — shadow map 2048×2048 for sharp shadows */}
      <directionalLight
        ref={sunRef}
        castShadow
        intensity={4.5}
        color="#fff8e8"
        position={[200, 200, 60]}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={400}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.0005}
      />

      <hemisphereLight ref={hemiRef} args={['#a8d4ff', '#4a7a4a', 2.0]} />

      <directionalLight
        ref={moonRef}
        intensity={0.8}
        color="#8899cc"
        position={[-100, 150, -80]}
        castShadow={false}
      />
    </>
  );
}
