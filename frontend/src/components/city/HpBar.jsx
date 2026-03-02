import { Html } from '@react-three/drei';

// ─── HpBar ────────────────────────────────────────────────────────────────────
// Renders a small billboard HP bar above a building or fighter when damaged.
// Only shown when current < max (hidden when full or destroyed).
//
// Props:
//   position  [x, y, z]  – world position (use building position)
//   yOffset   number     – extra Y offset above the object (default 3)
//   current   number     – current HP
//   max       number     – maximum HP
//   label     string     – optional label (building name / "Fighter")

const BAR_W  = 96; // px
const BAR_H  = 11; // px

function hpColor(pct) {
  if (pct > 0.6) return '#22dd44';
  if (pct > 0.3) return '#f5c400';
  return '#e03030';
}

export function HpBar({ position = [0, 0, 0], yOffset = 3.5, current, max, label }) {
  if (!max || max <= 0) return null;
  const pct  = Math.max(0, Math.min(1, current / max));
  // Only render when damaged and not fully destroyed (destroyed → show rubble instead)
  if (pct >= 1 || pct <= 0) return null;

  const fill = `${Math.round(pct * 100)}%`;
  const color = hpColor(pct);

  return (
    <group position={[position[0], position[1] + yOffset, position[2]]}>
      <Html
        center
        distanceFactor={18}
        zIndexRange={[100, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          gap:           '2px',
          userSelect:    'none',
        }}>
          {/* Label */}
          {label && (
            <div style={{
              fontSize:       '11px',
              color:          '#e8e8e8',
              textShadow:     '0 0 3px #000, 0 0 6px #000',
              whiteSpace:     'nowrap',
              fontWeight:     600,
              letterSpacing:  '0.04em',
            }}>
              {label}
            </div>
          )}

          {/* Bar track */}
          <div style={{
            width:           `${BAR_W}px`,
            height:          `${BAR_H}px`,
            background:      'rgba(0,0,0,0.65)',
            border:          '1px solid rgba(255,255,255,0.18)',
            borderRadius:    '3px',
            overflow:        'hidden',
            position:        'relative',
          }}>
            {/* Fill */}
            <div style={{
              width:           fill,
              height:          '100%',
              background:      color,
              borderRadius:    '2px',
              transition:      'width 0.15s ease, background 0.3s ease',
              boxShadow:       `0 0 4px ${color}88`,
            }} />
          </div>

          {/* Numeric label */}
          <div style={{
            fontSize:   '8px',
            color:      '#ccc',
            textShadow: '0 0 4px #000',
          }}>
            {Math.round(current)}/{max}
          </div>
        </div>
      </Html>
    </group>
  );
}
