// ─── citySync.js — persistent city world (load / auto-save) ─────────────────
//
// Usage:
//   const { loading, offlineHours } = useCitySync({
//     gameTimeRef,
//     placedItemsRef,
//     setPlacedItems,
//   });
//
// • On mount:  loads world from backend, sets placedItems + gameTimeRef.
// • Every 30 s: auto-saves (fire-and-forget).
// • On unmount: final save.
// • REAL_MS_PER_GAME_HOUR must match systems/dayNight.js

import { useEffect, useRef, useState } from 'react';

const AUTO_SAVE_INTERVAL_MS = 30_000;  // 30 real seconds
const API_BASE               = '/api/city';

// ─── Tiny fetch helper with Bearer token ────────────────────────────────────

function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   gameTimeRef:    React.MutableRefObject<number>,
 *   placedItemsRef: React.MutableRefObject<Array>,
 *   setPlacedItems: (items: Array) => void,
 * }} opts
 */
export function useCitySync({ gameTimeRef, placedItemsRef, setPlacedItems }) {
  const [loading,      setLoading]      = useState(true);
  const [offlineHours, setOfflineHours] = useState(0);
  const initialLoadDone = useRef(false);

  // ── Save helper (fire-and-forget, logs errors) ───────────────────────────
  const save = () => {
    const body = JSON.stringify({
      gameTimeHours: gameTimeRef.current,
      placedItems:   placedItemsRef.current,
    });
    apiFetch('/world', { method: 'PUT', body }).catch(err =>
      console.warn('[citySync] auto-save failed:', err),
    );
  };

  // ── Load on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    apiFetch('/world')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        if (cancelled) return;
        // Restore game clock
        gameTimeRef.current = data.gameTimeHours ?? 8;
        // Restore placed items
        if (Array.isArray(data.placedItems)) {
          setPlacedItems(data.placedItems);
        }
        setOfflineHours(data.offlineHours ?? 0);
        initialLoadDone.current = true;
      })
      .catch(err => {
        console.warn('[citySync] load failed (playing offline):', err);
        initialLoadDone.current = true;
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-save every 30 s ──────────────────────────────────────────────────
  useEffect(() => {
    // Only start auto-save after initial load so we don't overwrite the saved state
    if (loading) return;
    const id = setInterval(save, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // ── Save on page close / tab hide ────────────────────────────────────────
  useEffect(() => {
    const handler = () => { if (initialLoadDone.current) save(); };
    window.addEventListener('beforeunload', handler);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && initialLoadDone.current) save();
    });
    return () => {
      window.removeEventListener('beforeunload', handler);
      if (initialLoadDone.current) save();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { loading, offlineHours };
}
