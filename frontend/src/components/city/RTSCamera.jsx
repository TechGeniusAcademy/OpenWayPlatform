import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CAM_PAN_SPEED,
  CAM_ZOOM_MIN,
  CAM_ZOOM_MAX,
  CAM_ZOOM_STEP,
  CAM_TILT,
  CAM_ROT_SPEED,
} from './CityContext.js';

// camTargetRef  – {x, z} point on the ground the camera looks at
// camStateRef   – { zoom, rotY } mutable camera state

export function RTSCamera({ camTargetRef, camStateRef, keysRef, inputRef }) {
  const { camera } = useThree();
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

    // ── Pan direction vectors ──
    const forward = new THREE.Vector3(-Math.sin(state.rotY), 0, -Math.cos(state.rotY));
    const right   = new THREE.Vector3( Math.cos(state.rotY), 0, -Math.sin(state.rotY));

    // ── Keyboard pan ──
    const kSpeed = CAM_PAN_SPEED * dt * (state.zoom / 50);
    if (keys['KeyW'] || keys['ArrowUp'])    { target.x += forward.x * kSpeed; target.z += forward.z * kSpeed; }
    if (keys['KeyS'] || keys['ArrowDown'])  { target.x -= forward.x * kSpeed; target.z -= forward.z * kSpeed; }
    if (keys['KeyA'] || keys['ArrowLeft'])  { target.x -= right.x * kSpeed;   target.z -= right.z * kSpeed; }
    if (keys['KeyD'] || keys['ArrowRight']) { target.x += right.x * kSpeed;   target.z += right.z * kSpeed; }

    // ── Middle-mouse / drag pan ──
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

    // ── Smooth lerp ──
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
