// ─── useOtherPlayers.js ───────────────────────────────────────────────────────
// Polls /api/city/all-worlds every POLL_MS milliseconds and returns the array
// of other players' worlds for rendering in the shared 3-D scene.
//
// Each element: { userId, username, placedItems, placedWalls, placedTowers, buildingLevels }

import { useEffect, useRef, useState } from 'react';

const POLL_MS = 5_000; // poll every 5 s for near-real-time updates

function apiFetch(path) {
  const token = localStorage.getItem('token');
  return fetch(`/api/city${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

/**
 * @returns {{ players: Array<{userId, username, placedItems, placedWalls, placedTowers, buildingLevels}> }}
 */
export function useOtherPlayers() {
  const [players, setPlayers] = useState([]);
  const timerRef = useRef(null);

  const fetchAll = () => {
    apiFetch('/all-worlds')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        if (Array.isArray(data?.players)) setPlayers(data.players);
      })
      .catch(err => console.warn('[useOtherPlayers] fetch failed:', err));
  };

  useEffect(() => {
    fetchAll(); // immediate first fetch
    timerRef.current = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, []);

  return { players };
}
