// ─── MiniMap.jsx ──────────────────────────────────────────────────────────────
// Real-time 2D overhead minimap.
//
// Mini (240×240): always centred on camera. Scroll to zoom, click to teleport.
// Full (large): independent pan/zoom. Right-click to add waypoint. Player list.
//
// Props:
//   placedItems, otherPlayers, placedFighters, enemyBuildingHp
//   camTargetRef, camStateRef
//   onJump(x,z)
//   waypoints  = [{ id, name, x, z }]
//   onAddWaypoint(x,z,name), onRemoveWaypoint(id)
//   fullscreen, onToggleFullscreen
//   ownUsername

import { useEffect, useRef, useCallback, useState } from 'react';

// ── Colours ───────────────────────────────────────────────────────────────────
const TYPE_COLOR = {
  'town-hall':      '#fbbf24',
  'money-factory':  '#4ade80',
  'energy-storage': '#60a5fa',
  'solar-panel':    '#fde68a',
  'hangar':         '#a78bfa',
  'extractor':      '#fb923c',
  'builder-house':  '#2dd4bf',
  'coal-generator': '#f97316',
  'street-lamp':    '#fef08a',
};
const DEFAULT_DOT   = '#94a3b8';
const OWN_FIGHTER   = '#22d3ee';
const ENEMY_DOT     = '#ef4444';
const DESTROYED_DOT = '#475569';
const BG            = '#0d1b2a';
const GRID_LINE     = '#1a2d40';
const OWN_TERR      = 'rgba(34,211,238,0.08)';
const ENM_TERR      = 'rgba(239,68,68,0.08)';
const VP_FILL       = 'rgba(255,255,255,0.12)';
const VP_STROKE     = 'rgba(255,255,255,0.7)';
const LABEL_BG      = 'rgba(10,20,35,0.85)';
const WP_COLOR      = '#f59e0b';

const CAM_HALF_W = 90;
const CAM_HALF_H = 65;

// ─── Coordinate helpers ───────────────────────────────────────────────────────
function w2c(wx, wz, view, cw, ch) {
  return {
    px: cw / 2 + (wx - view.cx) * view.scale,
    py: ch / 2 + (wz - view.cz) * view.scale,
  };
}

function c2w(px, py, view, cw, ch) {
  return {
    wx: view.cx + (px - cw / 2) / view.scale,
    wz: view.cz + (py - ch / 2) / view.scale,
  };
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
function drawAll(ctx, cw, ch, view, data) {
  const { ownItems, ownFighters, otherPlayers, enemyBuildingHp,
          camX, camZ, camZoom, waypoints } = data;
  const s = view.scale;
  ctx.clearRect(0, 0, cw, ch);

  // BG
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, cw, ch);

  // Grid
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 0.5;
  const step = 100;
  const LW = view.cx - cw / 2 / s, RW = view.cx + cw / 2 / s;
  const TW = view.cz - ch / 2 / s, BW = view.cz + ch / 2 / s;
  for (let gx = Math.ceil(LW / step) * step; gx <= RW; gx += step) {
    const { px } = w2c(gx, 0, view, cw, ch);
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, ch); ctx.stroke();
  }
  for (let gz = Math.ceil(TW / step) * step; gz <= BW; gz += step) {
    const { py } = w2c(0, gz, view, cw, ch);
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(cw, py); ctx.stroke();
  }

  // Origin
  {
    const { px, py } = w2c(0, 0, view, cw, ch);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, ch); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(cw, py); ctx.stroke();
  }

  // Territory blobs
  const blob = (items, color) => {
    const v = items.filter(i => i.position);
    if (!v.length) return;
    const bx = v.reduce((a, i) => a + i.position[0], 0) / v.length;
    const bz = v.reduce((a, i) => a + i.position[2], 0) / v.length;
    const r  = Math.max(50, v.reduce((m, i) => Math.max(m,
      Math.hypot(i.position[0] - bx, i.position[2] - bz)), 0) + 25);
    const { px, py } = w2c(bx, bz, view, cw, ch);
    ctx.beginPath(); ctx.ellipse(px, py, r * s, r * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
  };
  blob(ownItems, OWN_TERR);
  for (const p of otherPlayers) blob(p.placedItems ?? [], ENM_TERR);

  // Own buildings
  for (const item of ownItems) {
    if (!item.position) continue;
    const { px, py } = w2c(item.position[0], item.position[2], view, cw, ch);
    if (px < -8 || px > cw + 8 || py < -8 || py > ch + 8) continue;
    const r = item.type === 'town-hall' ? 5 : 3;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = TYPE_COLOR[item.type] ?? DEFAULT_DOT; ctx.fill();
    if (item.type === 'town-hall') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  // Enemy buildings + fighters
  for (const pl of otherPlayers) {
    for (const item of (pl.placedItems ?? [])) {
      if (!item.position) continue;
      const { px, py } = w2c(item.position[0], item.position[2], view, cw, ch);
      if (px < -8 || px > cw + 8 || py < -8 || py > ch + 8) continue;
      const hp   = enemyBuildingHp[`${pl.userId}_${item.id}`];
      const dead = hp && hp.current <= 0;
      const r    = item.type === 'town-hall' ? 5 : 3;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = dead ? DESTROYED_DOT : ENEMY_DOT; ctx.fill();
      if (item.type === 'town-hall') {
        ctx.strokeStyle = dead ? '#475569' : '#fca5a5'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
    for (const f of (pl.placedFighters ?? [])) {
      if (!f.position) continue;
      const { px, py } = w2c(f.position[0], f.position[2], view, cw, ch);
      if (px < -8 || px > cw + 8 || py < -8 || py > ch + 8) continue;
      ctx.save(); ctx.translate(px, py);
      ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(3, 4); ctx.lineTo(-3, 4);
      ctx.closePath(); ctx.fillStyle = '#fca5a5'; ctx.fill(); ctx.restore();
    }
  }

  // Own fighters
  for (const f of ownFighters) {
    if (!f.position) continue;
    const { px, py } = w2c(f.position[0], f.position[2], view, cw, ch);
    if (px < -8 || px > cw + 8 || py < -8 || py > ch + 8) continue;
    ctx.save(); ctx.translate(px, py);
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4, 5); ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fillStyle = OWN_FIGHTER; ctx.shadowColor = OWN_FIGHTER; ctx.shadowBlur = 6;
    ctx.fill(); ctx.shadowBlur = 0; ctx.restore();
  }

  // Camera viewport
  const zoom3d = Math.max(0.05, camZoom ?? 1);
  const { px: vcx, py: vcy } = w2c(camX, camZ, view, cw, ch);
  const vw = (CAM_HALF_W / zoom3d) * s * 2;
  const vh = (CAM_HALF_H / zoom3d) * s * 2;
  ctx.fillStyle = VP_FILL; ctx.fillRect(vcx - vw/2, vcy - vh/2, vw, vh);
  ctx.strokeStyle = VP_STROKE; ctx.lineWidth = 1.5;
  ctx.strokeRect(vcx - vw/2, vcy - vh/2, vw, vh);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(vcx-5, vcy); ctx.lineTo(vcx+5, vcy);
  ctx.moveTo(vcx, vcy-5); ctx.lineTo(vcx, vcy+5);
  ctx.stroke();

  // Player labels (near town-halls)
  ctx.font = `${Math.max(9, Math.min(13, s * 5))}px sans-serif`;
  for (const pl of otherPlayers) {
    const items = (pl.placedItems ?? []).filter(i => i.position);
    if (!items.length) continue;
    const th = items.find(i => i.type === 'town-hall') ?? items[0];
    const { px, py } = w2c(th.position[0], th.position[2], view, cw, ch);
    if (px < -60 || px > cw + 60 || py < -20 || py > ch + 20) continue;
    const lbl = pl.username ?? `#${pl.userId}`;
    const tw  = ctx.measureText(lbl).width;
    ctx.fillStyle = LABEL_BG; ctx.fillRect(px - tw/2 - 3, py - 22, tw + 6, 14);
    ctx.fillStyle = '#fca5a5'; ctx.fillText(lbl, px - tw/2, py - 11);
  }

  // Waypoints
  ctx.font = '10px sans-serif';
  for (const wp of (waypoints ?? [])) {
    const { px, py } = w2c(wp.x, wp.z, view, cw, ch);
    if (px < -20 || px > cw + 20 || py < -20 || py > ch + 20) continue;
    // Diamond
    ctx.beginPath();
    ctx.moveTo(px,     py - 8);
    ctx.lineTo(px + 6, py);
    ctx.lineTo(px,     py + 4);
    ctx.lineTo(px - 6, py);
    ctx.closePath();
    ctx.fillStyle = WP_COLOR;
    ctx.shadowColor = WP_COLOR; ctx.shadowBlur = 6; ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8; ctx.stroke();
    // Label
    const tw = ctx.measureText(wp.name).width;
    ctx.fillStyle = LABEL_BG; ctx.fillRect(px - tw/2 - 3, py - 22, tw + 6, 13);
    ctx.fillStyle = WP_COLOR; ctx.fillText(wp.name, px - tw/2, py - 12);
  }
}

// ─── fitView ─────────────────────────────────────────────────────────────────
function fitView(placedItems, otherPlayers, placedFighters, canvasSize) {
  const pos = [];
  for (const i of placedItems)    if (i.position) pos.push([i.position[0], i.position[2]]);
  for (const p of otherPlayers)   for (const i of (p.placedItems ?? [])) if (i.position) pos.push([i.position[0], i.position[2]]);
  for (const f of placedFighters) if (f.position) pos.push([f.position[0], f.position[2]]);
  if (!pos.length) return { cx: 0, cz: 0, scale: canvasSize / 600 };
  let mnX = Infinity, mxX = -Infinity, mnZ = Infinity, mxZ = -Infinity;
  for (const [x, z] of pos) {
    if (x < mnX) mnX = x; if (x > mxX) mxX = x;
    if (z < mnZ) mnZ = z; if (z > mxZ) mxZ = z;
  }
  const pad = 120;
  mnX -= pad; mxX += pad; mnZ -= pad; mxZ += pad;
  const scale = Math.min(canvasSize / (mxX - mnX), canvasSize / (mxZ - mnZ)) * 0.9;
  return { cx: (mnX + mxX) / 2, cz: (mnZ + mxZ) / 2, scale };
}

// ─── MapCanvas ────────────────────────────────────────────────────────────────
function MapCanvas({
  size, placedItems, otherPlayers, placedFighters, enemyBuildingHp,
  camTargetRef, camStateRef, onJump, initView, followCam,
  waypoints, onAddWaypoint, controlRef,
}) {
  const canvasRef = useRef(null);
  const viewRef   = useRef(initView);
  const dragRef   = useRef(null);

  // Expose focusOn so parent can center on a player
  useEffect(() => {
    if (controlRef) {
      controlRef.current = {
        focusOn: (x, z, sc) => {
          viewRef.current = { cx: x, cz: z, scale: sc ?? viewRef.current.scale };
        },
      };
    }
  }, [controlRef]);

  // Draw loop
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const loop = () => {
      const camX = camTargetRef?.current?.x ?? 0;
      const camZ = camTargetRef?.current?.z ?? 0;
      if (followCam) {
        viewRef.current = { ...viewRef.current, cx: camX, cz: camZ };
      }
      drawAll(ctx, cv.width, cv.height, viewRef.current, {
        ownItems:    placedItems,
        ownFighters: placedFighters,
        otherPlayers,
        enemyBuildingHp,
        camX, camZ,
        camZoom: camStateRef?.current?.zoom ?? 1,
        waypoints,
      });
    };
    const id = setInterval(loop, 80);
    loop();
    return () => clearInterval(id);
  }, [placedItems, placedFighters, otherPlayers, enemyBuildingHp,
      camTargetRef, camStateRef, waypoints, followCam]);

  // Re-fit on data change only for fullscreen (mini follows cam)
  useEffect(() => {
    if (followCam) return;
    viewRef.current = fitView(placedItems, otherPlayers, placedFighters, size);
  }, [placedItems, otherPlayers, placedFighters, size, followCam]);

  // Scroll: zoom (works for both mini and fullscreen)
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const cv = canvasRef.current; if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (cv.width / rect.width);
    const my = (e.clientY - rect.top)  * (cv.height / rect.height);
    const v = viewRef.current;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const ns = Math.max(0.03, Math.min(5, v.scale * factor));
    if (followCam) {
      // Only change scale; cx/cz will be overridden by camera anyway
      viewRef.current = { ...v, scale: ns };
    } else {
      const wx = v.cx + (mx - cv.width  / 2) / v.scale;
      const wz = v.cz + (my - cv.height / 2) / v.scale;
      viewRef.current = {
        cx: wx - (mx - cv.width  / 2) / ns,
        cz: wz - (my - cv.height / 2) / ns,
        scale: ns,
      };
    }
  }, [followCam]);

  // Drag to pan (fullscreen only — mini follows cam so dragging is useless)
  const onPointerDown = useCallback((e) => {
    if (followCam || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startPx: e.clientX, startPy: e.clientY,
      startCx: viewRef.current.cx, startCz: viewRef.current.cz,
      moved: false,
    };
  }, [followCam]);

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startPx;
    const dy = e.clientY - dragRef.current.startPy;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragRef.current.moved = true;
    const cv = canvasRef.current; if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const s = viewRef.current.scale * (rect.width / cv.width);
    viewRef.current = {
      ...viewRef.current,
      cx: dragRef.current.startCx - dx / s,
      cz: dragRef.current.startCz - dy / s,
    };
  }, []);

  const onPointerUp = useCallback((e) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.moved) return;
    // click → teleport camera
    if (!onJump) return;
    const cv = canvasRef.current; if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (cv.width / rect.width);
    const py = (e.clientY - rect.top)  * (cv.height / rect.height);
    const { wx, wz } = c2w(px, py, viewRef.current, cv.width, cv.height);
    onJump(wx, wz);
  }, [onJump]);

  // Mini click to teleport (followCam mode — no drag, just click)
  const onMiniClick = useCallback((e) => {
    if (!followCam || !onJump) return;
    const cv = canvasRef.current; if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (cv.width / rect.width);
    const py = (e.clientY - rect.top)  * (cv.height / rect.height);
    const { wx, wz } = c2w(px, py, viewRef.current, cv.width, cv.height);
    onJump(wx, wz);
  }, [followCam, onJump]);

  // Right-click: add waypoint (fullscreen only)
  const onContextMenu = useCallback((e) => {
    if (!onAddWaypoint) return;
    e.preventDefault();
    const cv = canvasRef.current; if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (cv.width / rect.width);
    const py = (e.clientY - rect.top)  * (cv.height / rect.height);
    const { wx, wz } = c2w(px, py, viewRef.current, cv.width, cv.height);
    const name = window.prompt('Название точки (waypoint):', 'Waypoint');
    if (name !== null) onAddWaypoint(wx, wz, name.trim() || 'Waypoint');
  }, [onAddWaypoint]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      onWheel={onWheel}
      onPointerDown={followCam ? undefined : onPointerDown}
      onPointerMove={followCam ? undefined : onPointerMove}
      onPointerUp={followCam ? undefined : onPointerUp}
      onClick={followCam ? onMiniClick : undefined}
      onContextMenu={onContextMenu}
      style={{ display: 'block', width: size, height: size, cursor: 'crosshair', touchAction: 'none' }}
    />
  );
}

// ─── MiniMap ──────────────────────────────────────────────────────────────────
export function MiniMap({
  placedItems = [],
  otherPlayers = [],
  placedFighters = [],
  enemyBuildingHp = {},
  camTargetRef,
  camStateRef,
  onJump,
  waypoints = [],
  onAddWaypoint,
  onRemoveWaypoint,
  fullscreen = false,
  onToggleFullscreen,
  ownUsername = 'Вы',
}) {
  const MINI_SIZE = 240;
  const FULL_SIZE = Math.min(window.innerWidth, window.innerHeight) * 0.80 | 0;
  const fullMapControlRef = useRef(null);

  const sharedBase = {
    placedItems, otherPlayers, placedFighters, enemyBuildingHp,
    camTargetRef, camStateRef, onJump, waypoints,
  };

  const hdrStyle = (fs) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: fs ? '8px 14px' : '4px 8px',
    background: 'rgba(255,255,255,0.04)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    userSelect: 'none',
  });

  const btnS = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#64748b', fontSize: 13, lineHeight: 1, padding: '0 2px',
  };

  // Focus full map on a player
  const focusPlayer = (player) => {
    const items = (player.placedItems ?? []).filter(i => i.position);
    if (!items.length) return;
    const th = items.find(i => i.type === 'town-hall') ?? items[0];
    fullMapControlRef.current?.focusOn(th.position[0], th.position[2]);
  };

  return (
    <>
      {/* ── Mini panel ── */}
      {!fullscreen && (
        <div style={{
          position: 'absolute', top: 14, right: 14, zIndex: 50,
          background: BG, border: '1.5px solid rgba(148,163,184,0.22)',
          borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.7)', overflow: 'hidden',
        }}>
          <div style={hdrStyle(false)}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>MAP</span>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: '#475569' }}>scroll=зум · клик=телепорт</span>
              <button style={btnS} onClick={onToggleFullscreen} title="Полная карта [M]">⛶</button>
            </div>
          </div>
          <MapCanvas
            key="mini"
            size={MINI_SIZE}
            {...sharedBase}
            followCam={true}
            initView={{ cx: camTargetRef?.current?.x ?? 0, cz: camTargetRef?.current?.z ?? 0, scale: MINI_SIZE / 400 }}
            onAddWaypoint={null}
          />
        </div>
      )}

      {/* ── Fullscreen overlay ── */}
      {fullscreen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) onToggleFullscreen?.(); }}
        >
          <div style={{
            display: 'flex', background: BG,
            border: '1.5px solid rgba(148,163,184,0.28)',
            borderRadius: 12, boxShadow: '0 0 80px rgba(0,0,0,0.9)', overflow: 'hidden',
          }}>
            {/* Map canvas + header */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={hdrStyle(true)}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>
                  КАРТА МИРА
                </span>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#475569' }}>
                    scroll=зум · drag=пан · ПКМ=waypoint · клик=телепорт · M=закрыть
                  </span>
                  <button style={{ ...btnS, fontSize: 16 }} onClick={onToggleFullscreen}>✕</button>
                </div>
              </div>

              <MapCanvas
                key="full"
                size={FULL_SIZE}
                {...sharedBase}
                followCam={false}
                controlRef={fullMapControlRef}
                initView={fitView(placedItems, otherPlayers, placedFighters, FULL_SIZE)}
                onAddWaypoint={onAddWaypoint}
              />

              {/* Legend */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '4px 14px',
                padding: '7px 14px', borderTop: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.02)',
              }}>
                {[
                  ['#fbbf24','Ратуша'], ['#4ade80','Фабрика'], ['#60a5fa','Хранилище'],
                  ['#a78bfa','Ангар'], ['#fb923c','Экстрактор'], ['#22d3ee','▲ Свой истребитель'],
                  ['#ef4444','● Враг'], ['#475569','● Уничтожено'], ['rgba(255,255,255,0.4)','□ Камера'],
                  [WP_COLOR,'◆ Waypoint'],
                ].map(([c, l]) => (
                  <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#94a3b8' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />{l}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Side panel: Players + Waypoints ── */}
            <div style={{
              width: 200, display: 'flex', flexDirection: 'column',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(0,0,0,0.15)',
            }}>
              {/* Players */}
              <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', marginBottom: 6 }}>
                  ИГРОКИ ({otherPlayers.length + 1})
                </div>
                {/* Own entry */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', cursor: 'pointer' }}
                     onClick={() => {
                       const cam = camTargetRef?.current;
                       if (cam) fullMapControlRef.current?.focusOn(cam.x, cam.z);
                     }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22d3ee', flexShrink: 0 }} />
                  <span style={{ color: '#22d3ee', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ownUsername} (вы)
                  </span>
                </div>
                {otherPlayers.map(p => (
                  <div key={p.userId}
                       onClick={() => focusPlayer(p)}
                       style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', cursor: 'pointer', borderRadius: 4, transition: 'background 0.15s' }}
                       onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                       onMouseLeave={e => e.currentTarget.style.background='transparent'}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                    <span style={{ color: '#fca5a5', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.username ?? `#${p.userId}`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Waypoints */}
              <div style={{ padding: '8px 10px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', marginBottom: 6 }}>
                  WAYPOINTS ({waypoints.length})
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {waypoints.length === 0 && (
                    <div style={{ fontSize: 11, color: '#475569', fontStyle: 'italic' }}>
                      ПКМ на карте — добавить
                    </div>
                  )}
                  {waypoints.map(wp => (
                    <div key={wp.id}
                         style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 0',
                                  cursor: 'pointer', borderRadius: 4 }}
                         onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                         onMouseLeave={e => e.currentTarget.style.background='transparent'}
                    >
                      <span style={{ color: WP_COLOR, fontSize: 11, flex: 1, overflow: 'hidden',
                                     textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            onClick={() => fullMapControlRef.current?.focusOn(wp.x, wp.z)}>
                        ◆ {wp.name}
                      </span>
                      <button
                        onClick={() => onRemoveWaypoint?.(wp.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer',
                                 color: '#475569', fontSize: 12, padding: '0 2px', flexShrink: 0 }}
                        title="Удалить"
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
