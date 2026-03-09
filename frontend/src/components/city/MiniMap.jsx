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

import { useEffect, useRef, useCallback, useState, useMemo, memo } from 'react';

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
  'defense-tower':  '#38bdf8',
};
const TYPE_NAME = {
  'town-hall':      'Ратуша',
  'money-factory':  'Денежная фабрика',
  'energy-storage': 'Хранилище энергии',
  'solar-panel':    'Солнечная панель',
  'hangar':         'Ангар',
  'extractor':      'Экстрактор',
  'builder-house':  'Дом строителей',
  'coal-generator': 'Угольный генератор',
  'street-lamp':    'Фонарь',
  'defense-tower':  'Оборонительная башня',
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
const PING_COLOR    = '#f43f5e';
const PING_DURATION = 3000;

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
          camX, camZ, camZoom, waypoints,
          layers = {}, pings = [] } = data;
  const s = view.scale;
  ctx.clearRect(0, 0, cw, ch);

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, cw, ch);

  // Grid
  if (layers.grid !== false) {
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
    // Coordinate labels when zoomed in enough
    if (s > 0.25) {
      ctx.fillStyle = 'rgba(148,163,184,0.28)';
      ctx.font = '8px monospace';
      for (let gx = Math.ceil(LW / step) * step; gx <= RW; gx += step) {
        const { px } = w2c(gx, 0, view, cw, ch);
        if (px > 4 && px < cw - 4) ctx.fillText(gx, px + 2, 10);
      }
      for (let gz = Math.ceil(TW / step) * step; gz <= BW; gz += step) {
        const { py } = w2c(0, gz, view, cw, ch);
        if (py > 12 && py < ch - 4) ctx.fillText(gz, 2, py - 2);
      }
    }
  }

  // Origin axes
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
  if (layers.ownBuildings   !== false) blob(ownItems, OWN_TERR);
  if (layers.enemyBuildings !== false) for (const p of otherPlayers) blob(p.placedItems ?? [], ENM_TERR);

  // Own buildings
  if (layers.ownBuildings !== false) {
    for (const item of ownItems) {
      if (!item.position) continue;
      const { px, py } = w2c(item.position[0], item.position[2], view, cw, ch);
      if (px < -8 || px > cw + 8 || py < -8 || py > ch + 8) continue;
      const r = item.type === 'town-hall' ? 5 : 3;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = TYPE_COLOR[item.type] ?? DEFAULT_DOT; ctx.fill();
      if (item.type === 'town-hall') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
    }
  }

  // Enemy buildings
  if (layers.enemyBuildings !== false) {
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
    }
  }

  // Fighters
  if (layers.fighters !== false) {
    for (const pl of otherPlayers) {
      for (const f of (pl.placedFighters ?? [])) {
        if (!f.position) continue;
        const { px, py } = w2c(f.position[0], f.position[2], view, cw, ch);
        if (px < -8 || px > cw + 8 || py < -8 || py > ch + 8) continue;
        ctx.save(); ctx.translate(px, py);
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(3, 4); ctx.lineTo(-3, 4);
        ctx.closePath(); ctx.fillStyle = '#fca5a5'; ctx.fill(); ctx.restore();
      }
    }
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
  if (layers.waypoints !== false) {
    ctx.font = '10px sans-serif';
    for (const wp of (waypoints ?? [])) {
      const { px, py } = w2c(wp.x, wp.z, view, cw, ch);
      if (px < -20 || px > cw + 20 || py < -20 || py > ch + 20) continue;
      ctx.beginPath();
      ctx.moveTo(px, py - 8); ctx.lineTo(px + 6, py);
      ctx.lineTo(px, py + 4); ctx.lineTo(px - 6, py);
      ctx.closePath();
      ctx.fillStyle = WP_COLOR;
      ctx.shadowColor = WP_COLOR; ctx.shadowBlur = 6; ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8; ctx.stroke();
      const tw = ctx.measureText(wp.name).width;
      ctx.fillStyle = LABEL_BG; ctx.fillRect(px - tw/2 - 3, py - 22, tw + 6, 13);
      ctx.fillStyle = WP_COLOR; ctx.fillText(wp.name, px - tw/2, py - 12);
    }
  }

  // Ping markers — expanding animated rings on double-click
  const now = Date.now();
  for (const ping of pings) {
    const age = now - ping.t0;
    if (age > PING_DURATION) continue;
    const { px, py } = w2c(ping.wx, ping.wz, view, cw, ch);
    if (px < -80 || px > cw + 80 || py < -80 || py > ch + 80) continue;
    const progress = age / PING_DURATION;
    const alpha    = 1 - progress;
    ctx.beginPath(); ctx.arc(px, py, 6 + progress * 18, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(244,63,94,${alpha * 0.9})`; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, 6 + progress * 32, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(244,63,94,${alpha * 0.35})`; ctx.lineWidth = 1; ctx.stroke();
    const ca = Math.min(1, alpha * 2);
    ctx.strokeStyle = `rgba(244,63,94,${ca})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px - 6, py); ctx.lineTo(px + 6, py); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px, py - 6); ctx.lineTo(px, py + 6); ctx.stroke();
  }

  // Scale bar (bottom-left corner)
  {
    const targets = [10, 25, 50, 100, 200, 500, 1000];
    const idealPx = cw * 0.14;
    const idealW  = idealPx / Math.max(s, 0.001);
    const nice    = targets.reduce((a, b) =>
      Math.abs(b - idealW) < Math.abs(a - idealW) ? b : a);
    const barPx = nice * s;
    if (barPx > 4 && barPx < cw * 0.45) {
      const bx = 8, by = ch - 6;
      ctx.fillStyle = 'rgba(148,163,184,0.75)';
      ctx.fillRect(bx, by - 3, barPx, 2);
      ctx.fillRect(bx,                by - 7, 1.5, 8);
      ctx.fillRect(bx + barPx - 1.5,  by - 7, 1.5, 8);
      ctx.font = '8px sans-serif';
      ctx.fillText(`${nice}u`, bx + barPx + 3, by);
    }
  }
}

// ─── hitTest: find element under canvas pixel ─────────────────────────────────
function hitTest(px, py, view, cw, ch, data) {
  const { ownItems, ownFighters, otherPlayers, enemyBuildingHp, waypoints } = data;
  const R = 9;
  for (const wp of (waypoints ?? [])) {
    const { px: dx, py: dy } = w2c(wp.x, wp.z, view, cw, ch);
    if (Math.hypot(px - dx, py - dy) < R)
      return { kind: 'waypoint', name: wp.name, wx: wp.x, wz: wp.z };
  }
  for (const item of ownItems) {
    if (!item.position) continue;
    const { px: dx, py: dy } = w2c(item.position[0], item.position[2], view, cw, ch);
    if (Math.hypot(px - dx, py - dy) < R)
      return { kind: 'own-building', type: item.type,
               name: TYPE_NAME[item.type] ?? item.type,
               wx: item.position[0], wz: item.position[2] };
  }
  for (const pl of otherPlayers) {
    for (const item of (pl.placedItems ?? [])) {
      if (!item.position) continue;
      const { px: dx, py: dy } = w2c(item.position[0], item.position[2], view, cw, ch);
      if (Math.hypot(px - dx, py - dy) < R) {
        const hp   = enemyBuildingHp[`${pl.userId}_${item.id}`];
        const dead = hp && hp.current <= 0;
        return { kind: 'enemy-building', type: item.type,
                 name: TYPE_NAME[item.type] ?? item.type,
                 owner: pl.username ?? `#${pl.userId}`, dead,
                 wx: item.position[0], wz: item.position[2] };
      }
    }
    for (const f of (pl.placedFighters ?? [])) {
      if (!f.position) continue;
      const { px: dx, py: dy } = w2c(f.position[0], f.position[2], view, cw, ch);
      if (Math.hypot(px - dx, py - dy) < R)
        return { kind: 'enemy-fighter', owner: pl.username ?? `#${pl.userId}`,
                 wx: f.position[0], wz: f.position[2] };
    }
  }
  for (const f of ownFighters) {
    if (!f.position) continue;
    const { px: dx, py: dy } = w2c(f.position[0], f.position[2], view, cw, ch);
    if (Math.hypot(px - dx, py - dy) < R)
      return { kind: 'own-fighter', wx: f.position[0], wz: f.position[2] };
  }
  return null;
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
const MapCanvas = memo(function MapCanvas({
  size, placedItems, otherPlayers, placedFighters, enemyBuildingHp,
  camTargetRef, camStateRef, onJump, initView, followCam,
  waypoints, onAddWaypoint, controlRef,
  layers, pings, onPing, onHover,
}) {
  const canvasRef = useRef(null);
  const viewRef   = useRef(initView);
  const dragRef      = useRef(null);
  const hoverRafRef  = useRef(null);
  const sizeRef      = useRef(size);

  // All mutable data in refs — loop never needs to be recreated
  const drawDataRef       = useRef(null);
  const followCamRef      = useRef(followCam);
  const layersRef         = useRef(layers);
  const pingsRef          = useRef(pings);
  const onHoverRef        = useRef(onHover);
  const onPingRef         = useRef(onPing);
  const onJumpRef         = useRef(onJump);
  const onAddWaypointRef  = useRef(onAddWaypoint);

  sizeRef.current          = size;
  followCamRef.current     = followCam;
  layersRef.current        = layers;
  pingsRef.current         = pings;
  onHoverRef.current       = onHover;
  onPingRef.current        = onPing;
  onJumpRef.current        = onJump;
  onAddWaypointRef.current = onAddWaypoint;
  drawDataRef.current = {
    ownItems: placedItems, ownFighters: placedFighters,
    otherPlayers, enemyBuildingHp, waypoints,
  };

  // Expose focusOn / fitAll on controlRef
  useEffect(() => {
    if (!controlRef) return;
    controlRef.current = {
      focusOn: (x, z, sc) => {
        viewRef.current = { cx: x, cz: z, scale: sc ?? viewRef.current.scale };
      },
      fitAll: () => {
        const d = drawDataRef.current; if (!d) return;
        viewRef.current = fitView(d.ownItems, d.otherPlayers, d.ownFighters, sizeRef.current);
      },
    };
  }, [controlRef]);

  // Draw loop — requestAnimationFrame, created once; all data read from refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    let rafId;
    const loop = () => {
      const camX = camTargetRef?.current?.x ?? 0;
      const camZ = camTargetRef?.current?.z ?? 0;
      if (followCamRef.current)
        viewRef.current = { ...viewRef.current, cx: camX, cz: camZ };
      drawAll(ctx, cv.width, cv.height, viewRef.current, {
        ...drawDataRef.current,
        camX, camZ,
        camZoom: camStateRef?.current?.zoom ?? 1,
        layers: layersRef.current,
        pings:  pingsRef.current,
      });
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Re-fit fullscreen view when data changes
  useEffect(() => {
    if (followCam) return;
    viewRef.current = fitView(placedItems, otherPlayers, placedFighters, size);
  }, [placedItems, otherPlayers, placedFighters, size, followCam]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const cv = canvasRef.current; if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (cv.width / rect.width);
    const my = (e.clientY - rect.top)  * (cv.height / rect.height);
    const v  = viewRef.current;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const ns = Math.max(0.03, Math.min(5, v.scale * factor));
    if (followCamRef.current) {
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
  }, []);

  const onPointerDown = useCallback((e) => {
    if (followCamRef.current || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    // Clear tooltip immediately when drag starts
    if (hoverRafRef.current) { cancelAnimationFrame(hoverRafRef.current); hoverRafRef.current = null; }
    onHoverRef.current?.(null);
    dragRef.current = {
      startPx: e.clientX, startPy: e.clientY,
      startCx: viewRef.current.cx, startCz: viewRef.current.cz,
      moved: false,
    };
  }, []);

  // Handles both drag-pan (fullscreen) and hover tooltip (both)
  const onPointerMove = useCallback((e) => {
    // Drag-pan: update view directly, skip tooltip entirely
    if (!followCamRef.current && dragRef.current) {
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
      return; // no tooltip during pan
    }
    // Hover tooltip — throttled to one update per animation frame
    if (hoverRafRef.current) return;
    const ex = e.clientX, ey = e.clientY;
    hoverRafRef.current = requestAnimationFrame(() => {
      hoverRafRef.current = null;
      const cb = onHoverRef.current; if (!cb) return;
      const cv = canvasRef.current; if (!cv) return;
      const rect = cv.getBoundingClientRect();
      const cpx = (ex - rect.left) * (cv.width / rect.width);
      const cpy = (ey - rect.top)  * (cv.height / rect.height);
      const { wx, wz } = c2w(cpx, cpy, viewRef.current, cv.width, cv.height);
      const hit = drawDataRef.current
        ? hitTest(cpx, cpy, viewRef.current, cv.width, cv.height, drawDataRef.current)
        : null;
      cb({ wx, wz, hit, cx: ex, cy: ey });
    });
  }, []);

  const onPointerLeave = useCallback(() => {
    if (hoverRafRef.current) { cancelAnimationFrame(hoverRafRef.current); hoverRafRef.current = null; }
    onHoverRef.current?.(null);
  }, []);

  const onPointerUp = useCallback((e) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.moved) return;
    const cb = onJumpRef.current; if (!cb) return;
    const cv = canvasRef.current; if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (cv.width / rect.width);
    const py = (e.clientY - rect.top)  * (cv.height / rect.height);
    const { wx, wz } = c2w(px, py, viewRef.current, cv.width, cv.height);
    cb(wx, wz);
  }, []);

  const onMiniClick = useCallback((e) => {
    if (!followCamRef.current) return;
    const cb = onJumpRef.current; if (!cb) return;
    const cv = canvasRef.current; if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (cv.width / rect.width);
    const py = (e.clientY - rect.top)  * (cv.height / rect.height);
    const { wx, wz } = c2w(px, py, viewRef.current, cv.width, cv.height);
    cb(wx, wz);
  }, []);

  const onContextMenu = useCallback((e) => {
    const cb = onAddWaypointRef.current; if (!cb) return;
    e.preventDefault();
    const cv = canvasRef.current; if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (cv.width / rect.width);
    const py = (e.clientY - rect.top)  * (cv.height / rect.height);
    const { wx, wz } = c2w(px, py, viewRef.current, cv.width, cv.height);
    const name = window.prompt('Название точки (waypoint):', 'Waypoint');
    if (name !== null) cb(wx, wz, name.trim() || 'Waypoint');
  }, []);

  // Double-click: place a temporary ping marker
  const onDblClick = useCallback((e) => {
    const cb = onPingRef.current; if (!cb) return;
    const cv = canvasRef.current; if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (cv.width / rect.width);
    const py = (e.clientY - rect.top)  * (cv.height / rect.height);
    const { wx, wz } = c2w(px, py, viewRef.current, cv.width, cv.height);
    cb(wx, wz);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      onWheel={onWheel}
      onPointerDown={followCam ? undefined : onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerUp={followCam ? undefined : onPointerUp}
      onClick={followCam ? onMiniClick : undefined}
      onContextMenu={onContextMenu}
      onDoubleClick={onDblClick}
      style={{ display: 'block', width: size, height: size, cursor: 'crosshair', touchAction: 'none' }}
    />
  );
});

// ─── Tab / Layer buttons (defined outside MiniMap to keep stable references) ──
function TabBtn({ id, label, activeTab, setActiveTab }) {
  return (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        flex: 1, padding: '4px 0', fontSize: 10, fontWeight: 700,
        letterSpacing: '0.05em', cursor: 'pointer',
        background: activeTab === id ? 'rgba(148,163,184,0.1)' : 'none',
        border: 'none',
        borderBottom: activeTab === id ? '2px solid #94a3b8' : '2px solid transparent',
        color: activeTab === id ? '#e2e8f0' : '#475569',
        transition: 'all 0.15s',
      }}
    >{label}</button>
  );
}

function LayerBtn({ id, label, accent, layers, toggleLayer }) {
  const on = layers[id] !== false;
  return (
    <button
      onClick={() => toggleLayer(id)}
      title={`${on ? 'Скрыть' : 'Показать'}: ${label}`}
      style={{
        padding: '2px 8px', fontSize: 10, cursor: 'pointer', borderRadius: 4,
        background: on ? (accent ?? 'rgba(148,163,184,0.14)') : 'rgba(0,0,0,0.2)',
        border: `1px solid ${on ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.1)'}`,
        color: on ? '#e2e8f0' : '#475569',
        opacity: on ? 1 : 0.5,
        transition: 'all 0.15s',
      }}
    >{label}</button>
  );
}

// ─── MiniMap ──────────────────────────────────────────────────────────────────
export function MiniMap({
  placedItems      = [],
  otherPlayers     = [],
  placedFighters   = [],
  enemyBuildingHp  = {},
  camTargetRef,
  camStateRef,
  onJump,
  waypoints        = [],
  onAddWaypoint,
  onRemoveWaypoint,
  fullscreen       = false,
  onToggleFullscreen,
  ownUsername      = 'Вы',
}) {
  const MINI_SIZE = 240;
  const FULL_SIZE = Math.min(window.innerWidth, window.innerHeight) * 0.80 | 0;
  const fullMapControlRef = useRef(null);

  // ── State ─────────────────────────────────────────────────────────────────
  const [layers, setLayers] = useState({
    grid: true, ownBuildings: true, enemyBuildings: true, fighters: true, waypoints: true,
  });
  const [pings,         setPings]         = useState([]);
  const [activeTab,     setActiveTab]     = useState('players');
  const [miniCollapsed, setMiniCollapsed] = useState(false);
  const [miniOpacity,   setMiniOpacity]   = useState(0.75);
  const [hoverInfo,     setHoverInfo]     = useState(null);

  // Ping auto-cleanup
  useEffect(() => {
    if (!pings.length) return;
    const earliest = Math.min(...pings.map(p => p.t0));
    const delay    = earliest + PING_DURATION + 120 - Date.now();
    const id = setTimeout(() => {
      setPings(prev => prev.filter(p => Date.now() - p.t0 < PING_DURATION));
    }, Math.max(0, delay));
    return () => clearTimeout(id);
  }, [pings]);

  const addPing = useCallback((wx, wz) => {
    setPings(prev => [...prev, { id: Date.now() + Math.random(), wx, wz, t0: Date.now() }]);
  }, []);

  const toggleLayer = useCallback((key) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Building stats for Stats tab
  const stats = useMemo(() => {
    const own = {};
    for (const item of placedItems) {
      if (!item.position) continue;
      own[item.type] = (own[item.type] ?? 0) + 1;
    }
    const enemy = {};
    let destroyedEnemy = 0;
    for (const p of otherPlayers) {
      for (const item of (p.placedItems ?? [])) {
        if (!item.position) continue;
        const hp   = enemyBuildingHp[`${p.userId}_${item.id}`];
        const dead = hp && hp.current <= 0;
        if (dead) { destroyedEnemy++; continue; }
        enemy[item.type] = (enemy[item.type] ?? 0) + 1;
      }
    }
    return { own, enemy, destroyedEnemy };
  }, [placedItems, otherPlayers, enemyBuildingHp]);

  const sharedBase = {
    placedItems, otherPlayers, placedFighters, enemyBuildingHp,
    camTargetRef, camStateRef, onJump, waypoints,
    layers, pings, onPing: addPing, onHover: setHoverInfo,
  };

  // ── Style helpers ──────────────────────────────────────────────────────────
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

  const focusPlayer = (player) => {
    const items = (player.placedItems ?? []).filter(i => i.position);
    if (!items.length) return;
    const th = items.find(i => i.type === 'town-hall') ?? items[0];
    fullMapControlRef.current?.focusOn(th.position[0], th.position[2]);
  };

  // ── Hover tooltip ──────────────────────────────────────────────────────────
  const Tooltip = hoverInfo && (
    <div style={{
      position: 'fixed', left: hoverInfo.cx + 14, top: hoverInfo.cy - 10,
      zIndex: 9999, pointerEvents: 'none',
      background: 'rgba(10,20,35,0.96)', border: '1px solid rgba(148,163,184,0.3)',
      borderRadius: 6, padding: '5px 10px', fontSize: 11, color: '#e2e8f0',
      boxShadow: '0 2px 14px rgba(0,0,0,0.7)', maxWidth: 220, lineHeight: 1.5,
    }}>
      {hoverInfo.hit ? (() => {
        const h = hoverInfo.hit;
        return (
          <>
            {h.kind === 'own-building'   && <><div style={{ color: TYPE_COLOR[h.type] ?? '#94a3b8', fontWeight: 700 }}>{h.name}</div><div style={{ color: '#64748b', fontSize: 10 }}>Ваше здание</div></>}
            {h.kind === 'enemy-building' && <><div style={{ color: h.dead ? '#475569' : '#ef4444', fontWeight: 700 }}>{h.name}{h.dead ? ' (уничтожено)' : ''}</div><div style={{ color: '#fca5a5', fontSize: 10 }}>{h.owner}</div></>}
            {h.kind === 'waypoint'       && <div style={{ color: WP_COLOR, fontWeight: 700 }}>◆ {h.name}</div>}
            {h.kind === 'own-fighter'    && <div style={{ color: OWN_FIGHTER, fontWeight: 700 }}>▲ Свой истребитель</div>}
            {h.kind === 'enemy-fighter'  && <><div style={{ color: '#fca5a5', fontWeight: 700 }}>▲ Вражеский истребитель</div><div style={{ color: '#fca5a5', fontSize: 10 }}>{h.owner}</div></>}
            <div style={{ color: '#475569', fontSize: 10, marginTop: 2 }}>X:{Math.round(h.wx)} Z:{Math.round(h.wz)}</div>
          </>
        );
      })() : (
        <div style={{ color: '#64748b', fontSize: 10 }}>
          X:{Math.round(hoverInfo.wx)} Z:{Math.round(hoverInfo.wz)}
        </div>
      )}
    </div>
  );

  return (
    <>
      {Tooltip}

      {/* ── Mini panel ── */}
      {!fullscreen && (
        <div
          data-no-world-input="true"
          style={{
            position: 'absolute', top: 14, right: 14, zIndex: 50,
            background: BG, border: '1.5px solid rgba(148,163,184,0.22)',
            borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.7)', overflow: 'hidden',
            opacity: miniOpacity, transition: 'opacity 0.25s',
          }}
          onMouseEnter={() => setMiniOpacity(1.0)}
          onMouseLeave={() => setMiniOpacity(0.75)}
        >
          <div style={hdrStyle(false)}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>MAP</span>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: '#475569' }}>scroll · клик · 2×=пинг</span>
              <button style={btnS} onClick={() => setMiniCollapsed(v => !v)} title="Свернуть">
                {miniCollapsed ? '▼' : '▲'}
              </button>
              <button style={btnS} onClick={onToggleFullscreen} title="Полная карта [M]">⛶</button>
            </div>
          </div>
          {!miniCollapsed && (
            <MapCanvas
              key="mini"
              size={MINI_SIZE}
              {...sharedBase}
              followCam={true}
              initView={{ cx: camTargetRef?.current?.x ?? 0, cz: camTargetRef?.current?.z ?? 0, scale: MINI_SIZE / 400 }}
              onAddWaypoint={null}
            />
          )}
        </div>
      )}

      {/* ── Fullscreen overlay ── */}
      {fullscreen && (
        <div
          data-no-world-input="true"
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
            {/* Left: canvas column */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>

              {/* Header: title + action buttons */}
              <div style={hdrStyle(true)}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>
                  КАРТА МИРА
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    style={{ ...btnS, fontSize: 11, color: '#22d3ee', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 4, padding: '2px 8px' }}
                    onClick={() => { const c = camTargetRef?.current; if (c) fullMapControlRef.current?.focusOn(c.x, c.z); }}
                    title="Центрировать на моей позиции"
                  >⌖ Моя позиция</button>
                  <button
                    style={{ ...btnS, fontSize: 11, color: '#94a3b8', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 4, padding: '2px 8px' }}
                    onClick={() => fullMapControlRef.current?.fitAll?.()}
                    title="Уместить все объекты"
                  >⤢ Все объекты</button>
                  <span style={{ fontSize: 10, color: '#475569' }}>
                    drag=пан · scroll=зум · ПКМ=waypoint · 2×=пинг · M=закрыть
                  </span>
                  <button style={{ ...btnS, fontSize: 16 }} onClick={onToggleFullscreen}>✕</button>
                </div>
              </div>

              {/* Layer toggles row */}
              <div style={{
                display: 'flex', gap: 5, padding: '5px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(0,0,0,0.12)', alignItems: 'center', flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 9, color: '#475569', fontWeight: 700, letterSpacing: '0.05em', marginRight: 2 }}>СЛОИ:</span>
                <LayerBtn id="grid"           label="Сетка"     layers={layers} toggleLayer={toggleLayer} />
                <LayerBtn id="ownBuildings"   label="Свои"      accent="rgba(34,211,238,0.14)"  layers={layers} toggleLayer={toggleLayer} />
                <LayerBtn id="enemyBuildings" label="Враги"     accent="rgba(239,68,68,0.14)"   layers={layers} toggleLayer={toggleLayer} />
                <LayerBtn id="fighters"       label="Самолёты"  accent="rgba(168,139,250,0.14)" layers={layers} toggleLayer={toggleLayer} />
                <LayerBtn id="waypoints"      label="Waypoints" accent="rgba(245,158,11,0.14)"  layers={layers} toggleLayer={toggleLayer} />
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
                padding: '6px 14px', borderTop: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.02)', alignItems: 'center',
              }}>
                {[
                  ['#fbbf24','Ратуша'], ['#4ade80','Фабрика'], ['#60a5fa','Хранилище'],
                  ['#a78bfa','Ангар'],  ['#fb923c','Экстрактор'], ['#38bdf8','Баш. обороны'],
                  ['#22d3ee','▲ Свой'], ['#ef4444','● Враг'], ['#475569','● Уничтожено'],
                  ['rgba(255,255,255,0.35)','□ Камера'],
                  [WP_COLOR,'◆ Waypoint'], [PING_COLOR,'✦ Пинг (2×)'],
                ].map(([c, l]) => (
                  <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#94a3b8' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />{l}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: side panel */}
            <div style={{
              width: 215, display: 'flex', flexDirection: 'column',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(0,0,0,0.15)',
            }}>
              {/* Tab bar */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <TabBtn id="players"   label="ИГРОКИ"  activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabBtn id="stats"     label="СТАТЫ"   activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabBtn id="waypoints" label="WPNTS"   activeTab={activeTab} setActiveTab={setActiveTab} />
              </div>

              {/* ── Players tab ── */}
              {activeTab === 'players' && (
                <div style={{ padding: '8px 10px', flex: 1, overflowY: 'auto' }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 3px', cursor: 'pointer', borderRadius: 4 }}
                    onClick={() => { const c = camTargetRef?.current; if (c) fullMapControlRef.current?.focusOn(c.x, c.z); }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22d3ee', flexShrink: 0 }} />
                    <span style={{ color: '#22d3ee', fontSize: 12, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ownUsername} (вы)
                    </span>
                    <span style={{ fontSize: 10, color: '#475569', flexShrink: 0 }}>
                      {placedItems.filter(i => i.position).length} зд.
                    </span>
                  </div>
                  {otherPlayers.map(p => (
                    <div
                      key={p.userId}
                      onClick={() => focusPlayer(p)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 3px', cursor: 'pointer', borderRadius: 4 }}
                      onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                      <span style={{ color: '#fca5a5', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.username ?? `#${p.userId}`}
                      </span>
                      <span style={{ fontSize: 10, color: '#475569', flexShrink: 0 }}>
                        {(p.placedItems ?? []).filter(i => i.position).length} зд.
                      </span>
                    </div>
                  ))}
                  {!otherPlayers.length && (
                    <div style={{ fontSize: 11, color: '#475569', fontStyle: 'italic', marginTop: 8 }}>
                      Других игроков нет
                    </div>
                  )}
                </div>
              )}

              {/* ── Stats tab ── */}
              {activeTab === 'stats' && (
                <div style={{ padding: '8px 10px', flex: 1, overflowY: 'auto' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#22d3ee', letterSpacing: '0.05em', marginBottom: 5 }}>
                    МОИ ЗДАНИЯ ({Object.values(stats.own).reduce((a,b)=>a+b, 0)})
                  </div>
                  {Object.entries(stats.own).map(([type, cnt]) => (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: TYPE_COLOR[type] ?? DEFAULT_DOT, flexShrink: 0 }} />
                      <span style={{ color: '#94a3b8', fontSize: 11, flex: 1 }}>{TYPE_NAME[type] ?? type}</span>
                      <span style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 700 }}>{cnt}</span>
                    </div>
                  ))}
                  {!Object.keys(stats.own).length && (
                    <div style={{ fontSize: 11, color: '#475569', fontStyle: 'italic' }}>Нет зданий</div>
                  )}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '9px 0' }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', letterSpacing: '0.05em', marginBottom: 5 }}>
                    ВРАЖЕСКИЕ ({Object.values(stats.enemy).reduce((a,b)=>a+b, 0)} живых
                    {stats.destroyedEnemy > 0 ? ` · ${stats.destroyedEnemy} уничт.` : ''})
                  </div>
                  {Object.entries(stats.enemy).map(([type, cnt]) => (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: ENEMY_DOT, flexShrink: 0 }} />
                      <span style={{ color: '#fca5a5', fontSize: 11, flex: 1 }}>{TYPE_NAME[type] ?? type}</span>
                      <span style={{ color: '#fca5a5', fontSize: 11, fontWeight: 700 }}>{cnt}</span>
                    </div>
                  ))}
                  {!Object.keys(stats.enemy).length && (
                    <div style={{ fontSize: 11, color: '#475569', fontStyle: 'italic' }}>Нет врагов</div>
                  )}
                </div>
              )}

              {/* ── Waypoints tab ── */}
              {activeTab === 'waypoints' && (
                <div style={{ padding: '8px 10px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: 5 }}>
                    WAYPOINTS ({waypoints.length})
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {!waypoints.length && (
                      <div style={{ fontSize: 11, color: '#475569', fontStyle: 'italic' }}>
                        ПКМ на карте — добавить
                      </div>
                    )}
                    {waypoints.map(wp => (
                      <div
                        key={wp.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 2px', borderRadius: 4 }}
                        onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}
                      >
                        <span
                          style={{ color: WP_COLOR, fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                          onClick={() => { fullMapControlRef.current?.focusOn(wp.x, wp.z); onJump?.(wp.x, wp.z); }}
                        >◆ {wp.name}</span>
                        <span style={{ fontSize: 10, color: '#475569', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {Math.round(wp.x)},{Math.round(wp.z)}
                        </span>
                        <button
                          onClick={() => onRemoveWaypoint?.(wp.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 12, padding: '0 2px', flexShrink: 0 }}
                          title="Удалить"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
