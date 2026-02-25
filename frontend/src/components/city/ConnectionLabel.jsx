import { Html } from '@react-three/drei';

// ─── ConnectionLabel ──────────────────────────────────────────────────────────
//
// Shows a floating label at the midpoint of a conveyor or energy cable with
// the current transfer rate and direction icon.
//
// Props:
//   midPos   {[x, y, z]}  world position for the HTML anchor
//   icon     string        emoji icon
//   rate     number        effective rate per game-hour
//   unit     string        unit string (e.g. "монет/ч", "кВт/ч")
//   color    string        hex/css colour for the glow border

export function ConnectionLabel({ midPos, icon, rate, unit, color }) {
  if (!rate || rate <= 0) return null;

  const display = rate % 1 === 0 ? `${rate}` : rate.toFixed(1);

  return (
    <Html
      position={midPos}
      center
      distanceFactor={28}
      zIndexRange={[1, 10]}
      style={{ pointerEvents: 'none' }}
    >
      <div
        style={{
          background: 'rgba(10, 15, 30, 0.88)',
          border: `1px solid ${color}66`,
          borderRadius: '6px',
          padding: '2px 8px',
          color: color,
          fontSize: '11px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          lineHeight: '1.6',
          backdropFilter: 'blur(4px)',
          boxShadow: `0 0 6px ${color}44`,
          userSelect: 'none',
        }}
      >
        {icon} {display} {unit}
      </div>
    </Html>
  );
}
