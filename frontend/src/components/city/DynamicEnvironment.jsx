import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { getSunPosition, getSkyParams, getLighting, getFogColor } from '../systems/dayNight.js';

export function DynamicEnvironment({ gameTimeRef }) {
  const skyRef   = useRef();
  const sunRef   = useRef();
  const ambRef   = useRef();
  const hemiRef  = useRef();
  const moonRef  = useRef();   // soft fill at night
  const { scene, gl } = useThree();

  // Enable ACESFilmic tone mapping for realistic brightness balance
  gl.toneMapping          = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure  = 1.4;

  useFrame(() => {
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

    // Moon / fill light: strongest at night, fades during day
    if (moonRef.current) {
      const elev = Math.sin(((h / 24) * 2 - 0.5) * Math.PI);
      const nightFactor = Math.max(0, -elev);
      moonRef.current.intensity = 0.4 + nightFactor * 0.9;
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
      <Stars radius={400} depth={60} count={3000} factor={4} fade speed={0.3} />
      <fog attach="fog" args={[getFogColor(8), 120, 450]} />

      {/* Main ambient — reasonably bright to avoid pitch black */}
      <ambientLight ref={ambRef} intensity={1.2} color="#ddeeff" />

      {/* Sun */}
      <directionalLight
        ref={sunRef}
        castShadow
        intensity={4.5}
        color="#fff8e8"
        position={[200, 200, 60]}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={600}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
        shadow-bias={-0.0005}
      />

      {/* Sky/ground gradient light */}
      <hemisphereLight ref={hemiRef} args={['#a8d4ff', '#4a7a4a', 2.0]} />

      {/* Night fill — moonlight from above, always visible */}
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

