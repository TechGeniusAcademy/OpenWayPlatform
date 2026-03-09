// ─── WaypointMarkers.jsx ──────────────────────────────────────────────────────
// Renders floating HTML labels + 3D poles for each waypoint in the scene.
// Also projects waypoint world positions to screen coords each frame, writing
// results into screenPosRef so WaypointEdgeArrows can show off-screen indicators.

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const POLE_HEIGHT = 18;
const _v3 = new THREE.Vector3();

export function WaypointMarkers({ waypoints = [], screenPosRef }) {
  const { camera, gl } = useThree();

  useFrame(() => {
    if (!screenPosRef) return;
    const W = gl.domElement.clientWidth;
    const H = gl.domElement.clientHeight;
    const result = {};
    for (const wp of waypoints) {
      _v3.set(wp.x, 0, wp.z);
      _v3.project(camera);
      // Behind camera: z > 1 → flip direction so arrow points correctly
      const behind = _v3.z > 1;
      let sx = ((_v3.x + 1) / 2) * W;
      let sy = ((-_v3.y + 1) / 2) * H;
      if (behind) { sx = W - sx; sy = H - sy; }
      const onScreen = !behind && _v3.x > -1 && _v3.x < 1 && _v3.y > -1 && _v3.y < 1;
      result[wp.id] = { id: wp.id, sx, sy, onScreen, name: wp.name, wx: wp.x, wz: wp.z };
    }
    screenPosRef.current = result;
  });

  return (
    <>
      {waypoints.map((wp) => (
        <group key={wp.id} position={[wp.x, 0, wp.z]}>
          {/* Thin vertical pole */}
          <mesh position={[0, POLE_HEIGHT / 2, 0]}>
            <cylinderGeometry args={[0.15, 0.15, POLE_HEIGHT, 6]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
          {/* Diamond cap */}
          <mesh position={[0, POLE_HEIGHT + 1.5, 0]}>
            <octahedronGeometry args={[1.2]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
          {/* Floating label */}
          <Html
            position={[0, POLE_HEIGHT + 5, 0]}
            center
            distanceFactor={60}
            style={{ pointerEvents: 'none' }}
          >
            <div style={{
              background: 'rgba(10,15,25,0.88)',
              border: '1px solid #f59e0b',
              borderRadius: 5,
              padding: '3px 8px',
              color: '#fbbf24',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'sans-serif',
              whiteSpace: 'nowrap',
              boxShadow: '0 0 8px rgba(245,158,11,0.5)',
              userSelect: 'none',
            }}>
              ◆ {wp.name}
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}
