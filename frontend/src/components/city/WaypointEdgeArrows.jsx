// ─── WaypointEdgeArrows.jsx ───────────────────────────────────────────────────
// DOM overlay (outside Canvas) that shows amber arrow indicators on the screen
// edges when a waypoint is off-screen. Reads projected screen positions from
// screenPosRef (written each frame by WaypointMarkers inside Canvas).
// Clicking an arrow teleports the camera to that waypoint via onJump(x, z).

import { useEffect, useState } from 'react';

const MARGIN   = 60;   // px from each edge
const WP_COLOR = '#f59e0b';

function ArrowIndicator({ indicator, onJump }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        position:      'absolute',
        left:          indicator.ex,
        top:           indicator.ey,
        transform:     'translate(-50%, -50%)',
        zIndex:        30,
        pointerEvents: 'auto',
        cursor:        'pointer',
      }}
      onClick={() => onJump(indicator.wx, indicator.wz)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        display:    'flex',
        alignItems: 'center',
        gap:         5,
        background:  hovered ? 'rgba(245,158,11,0.18)' : 'rgba(10,15,25,0.88)',
        border:      `1.5px solid ${hovered ? WP_COLOR : '#f59e0b99'}`,
        borderRadius: 8,
        padding:     '4px 10px 4px 7px',
        color:       '#fbbf24',
        fontSize:     11,
        fontWeight:   700,
        fontFamily:  'sans-serif',
        whiteSpace:  'nowrap',
        boxShadow:    hovered
          ? '0 0 16px rgba(245,158,11,0.6)'
          : '0 0 8px rgba(245,158,11,0.28)',
        transition:  'all 0.15s ease',
        userSelect:  'none',
      }}>
        {/* Triangle arrow — base is left edge, points right → rotated to angle */}
        <div style={{
          width:        0,
          height:       0,
          borderTop:   '5px solid transparent',
          borderBottom:'5px solid transparent',
          borderLeft:  `9px solid ${WP_COLOR}`,
          transform:   `rotate(${indicator.angle}rad)`,
          flexShrink:   0,
        }} />
        ◆ {indicator.name}
      </div>
    </div>
  );
}

export function WaypointEdgeArrows({ screenPosRef, wrapRef, onJump }) {
  const [arrows, setArrows] = useState([]);

  useEffect(() => {
    const timerId = setInterval(() => {
      const pos = screenPosRef?.current;
      if (!pos) return;

      const el = wrapRef?.current;
      const W  = el?.clientWidth  ?? window.innerWidth;
      const H  = el?.clientHeight ?? window.innerHeight;
      const cx = W / 2;
      const cy = H / 2;

      const next = [];
      for (const [, info] of Object.entries(pos)) {
        if (info.onScreen) continue;

        const dx   = info.sx - cx;
        const dy   = info.sy - cy;
        if (Math.hypot(dx, dy) < 1) continue;

        const angle = Math.atan2(dy, dx);
        const maxX  = cx - MARGIN;
        const maxY  = cy - MARGIN;
        const scale = Math.min(
          Math.abs(dx) > 0.01 ? maxX / Math.abs(dx) : Infinity,
          Math.abs(dy) > 0.01 ? maxY / Math.abs(dy) : Infinity,
        );

        next.push({
          id:    String(info.id),
          ex:    Math.round(cx + dx * scale),
          ey:    Math.round(cy + dy * scale),
          angle,
          name:  info.name,
          wx:    info.wx,
          wz:    info.wz,
        });
      }
      setArrows(next);
    }, 100);

    return () => clearInterval(timerId);
  }, [screenPosRef, wrapRef]);

  return (
    <>
      {arrows.map(a => (
        <ArrowIndicator key={a.id} indicator={a} onJump={onJump} />
      ))}
    </>
  );
}
