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

const AUTO_SAVE_INTERVAL_MS = 5_000;  // 5 real seconds
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
 *   conveyorsRef?:  React.MutableRefObject<Array>,
 *   setConveyors?:  (conveyors: Array) => void,
 * }} opts
 */
export function useCitySync({ gameTimeRef, placedItemsRef, setPlacedItems, conveyorsRef, setConveyors, energyCablesRef, setEnergyCables, storedAmountsRef, setStoredAmounts, pointsAmountsRef, setPointsAmounts, buildingLevelsRef, setBuildingLevels, droneRouteLevelsRef, setDroneRouteLevels, ingotsRef, setIngots, placedWallsRef, setPlacedWalls, placedTowersRef, setPlacedTowers, placedFightersRef, setPlacedFighters, objectHpRef, setObjectHp, enemyBuildingHpRef, setEnemyBuildingHp }) {
  const [loading,      setLoading]      = useState(true);
  const [offlineHours, setOfflineHours] = useState(0);
  const [suggestedSpawn, setSuggestedSpawn] = useState(null);
  const initialLoadDone = useRef(false);

  // ── Save helper (fire-and-forget, logs errors) ───────────────────────────
  const save = () => {
    const body = JSON.stringify({
      gameTimeHours: gameTimeRef.current,
      placedItems:   placedItemsRef.current,
      conveyors:     conveyorsRef?.current ?? [],
      energyCables:  energyCablesRef?.current ?? [],
      storedAmounts: storedAmountsRef?.current ?? {},
      pointsAmounts: pointsAmountsRef?.current ?? {},
      buildingLevels: buildingLevelsRef?.current ?? {},
      droneRouteLevels: droneRouteLevelsRef?.current ?? {},
      ingots:           ingotsRef?.current ?? {},
      placedWalls:    placedWallsRef?.current   ?? [],
      placedTowers:   placedTowersRef?.current  ?? [],
      placedFighters: placedFightersRef?.current ?? [],
      buildingHp:        objectHpRef?.current        ?? {},
      enemyBuildingHp:   enemyBuildingHpRef?.current ?? {},
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
        // Restore conveyors
        if (Array.isArray(data.conveyors) && setConveyors) {
          setConveyors(data.conveyors);
        }
        // Restore energy cables
        if (Array.isArray(data.energyCables) && setEnergyCables) {
          setEnergyCables(data.energyCables);
        }
        // Restore stored amounts
        if (data.storedAmounts && typeof data.storedAmounts === 'object' && setStoredAmounts) {
          if (storedAmountsRef) storedAmountsRef.current = data.storedAmounts;
          setStoredAmounts(data.storedAmounts);
        }
        // Restore points amounts
        if (data.pointsAmounts && typeof data.pointsAmounts === 'object' && setPointsAmounts) {
          if (pointsAmountsRef) pointsAmountsRef.current = data.pointsAmounts;
          setPointsAmounts(data.pointsAmounts);
        }
        // Restore building levels
        if (data.buildingLevels && typeof data.buildingLevels === 'object' && setBuildingLevels) {
          if (buildingLevelsRef) buildingLevelsRef.current = data.buildingLevels;
          setBuildingLevels(data.buildingLevels);
        }
        // Restore drone route levels
        if (data.droneRouteLevels && typeof data.droneRouteLevels === 'object' && setDroneRouteLevels) {
          if (droneRouteLevelsRef) droneRouteLevelsRef.current = data.droneRouteLevels;
          setDroneRouteLevels(data.droneRouteLevels);
        }
        // Restore ingots
        if (data.ingots && typeof data.ingots === 'object' && setIngots) {
          if (ingotsRef) ingotsRef.current = data.ingots;
          setIngots(data.ingots);
        }
        // Restore placed walls
        if (Array.isArray(data.placedWalls) && setPlacedWalls) {
          if (placedWallsRef) placedWallsRef.current = data.placedWalls;
          setPlacedWalls(data.placedWalls);
        }
        // Restore placed towers
        if (Array.isArray(data.placedTowers) && setPlacedTowers) {
          if (placedTowersRef) placedTowersRef.current = data.placedTowers;
          setPlacedTowers(data.placedTowers);
        }
        // Restore placed fighters (always reset to idle so mid-flight state isn't stuck)
        if (Array.isArray(data.placedFighters) && setPlacedFighters) {
          const safe = data.placedFighters.map(f => ({ ...f, state: 'idle', target: null, attackTarget: null }));
          if (placedFightersRef) placedFightersRef.current = safe;
          setPlacedFighters(safe);
        }
        // Restore object HP (buildings + fighters)
        if (data.buildingHp && typeof data.buildingHp === 'object' && setObjectHp) {
          if (objectHpRef) objectHpRef.current = data.buildingHp;
          setObjectHp(data.buildingHp);
        }
        // Restore enemy building HP (persisted destruction state)
        if (data.enemyBuildingHp && typeof data.enemyBuildingHp === 'object' && setEnemyBuildingHp) {
          if (enemyBuildingHpRef) enemyBuildingHpRef.current = data.enemyBuildingHp;
          setEnemyBuildingHp(data.enemyBuildingHp);
        }
        setOfflineHours(data.offlineHours ?? 0);
        if (data.suggestedSpawn) setSuggestedSpawn(data.suggestedSpawn);
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

  return { loading, offlineHours, suggestedSpawn };
}
