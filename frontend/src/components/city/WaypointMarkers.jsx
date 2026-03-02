// ─── WaypointMarkers.jsx ──────────────────────────────────────────────────────
// Renders floating HTML labels for each waypoint in the 3D world.
// Placed inside the R3F <Canvas>. Uses <Html> from @react-three/drei.

import { Html } from '@react-three/drei';

const POLE_HEIGHT = 18; // world-units above ground

export function WaypointMarkers({ waypoints = [] }) {
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
