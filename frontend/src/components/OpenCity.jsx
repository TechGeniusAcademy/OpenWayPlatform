import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import styles from './OpenCity.module.css';
import { isColliding } from './items/collision.js';
import './items/conveyorRules.js';   // side-effect: registers all transfer rules
import './items/solarPanel.js';      // side-effect: registers solar-panel energy zone
import './items/townHall.js';         // side-effect: registers town-hall storage
import './items/extractor.js';        // side-effect: registers extractor storage
import { findNearestOreDeposit, canMineOre } from './systems/oreRegistry.js';
import { countFreeBuilders, countTotalBuilders, countPlacedType, findIdleBuilderHousePos } from './systems/builderSystem.js';
import { ITEM_POINT_COST, ITEM_PLACE_LIMIT, CONSTRUCTION_DURATION_MS, BUILDER_HOUSE_EXTRA_COST_COINS } from './items/shopPrices.js';
import { snapWallPoint, WALL_SEGMENT_COIN_COST, TOWER_COIN_COST, WALL_LEVELS, TOWER_LEVELS, WALL_GRID_SNAP } from './items/wallSystem.js';
import { canConnect, canBeSource, getTransferRule, getConveyorOutLimit, getConveyorInLimit } from './systems/conveyor.js';
import { calcConveyorRates } from './systems/connectionRates.js';
import { getLevelConfig, getNextLevelConfig } from './systems/upgrades.js';
import { useCitySync }             from './systems/citySync.js';
import { REAL_MS_PER_GAME_HOUR, formatGameTime } from './systems/dayNight.js';
import { calcEnergyTotals, calcStorageTotals, calcPoweredItems, getStorages, getEnergyZone, getProductions } from './systems/energy.js';
import { CityContext }             from './city/CityContext.js';
import { Scene }                   from './city/CityScene.jsx';
import { useOtherPlayers }         from './systems/useOtherPlayers.js';
import { HUD }                     from './city/HUD.jsx';
import { ShopModal }               from './city/ShopModal.jsx';
import { ContextMenu }             from './city/ContextMenu.jsx';

// ─── Main export ─────────────────────────────────────────────────────────────

export default function OpenCity({ onBack }) {
  const keysRef      = useRef({});
  const camTargetRef = useRef({ x: 0, z: 0 });
  const camStateRef  = useRef({ zoom: 50, rotY: 0 });
  const inputRef     = useRef({
    mouseX: null, mouseY: null,
    middleDrag: false, dragDeltaX: 0, dragDeltaY: 0,
    lastMX: 0, lastMY: 0,
    wheelDelta: 0,
  });
  const [displayPos,  setDisplayPos]  = useState({ x: 0, z: 0 });
  const [displayZoom, setDisplayZoom] = useState(50);
  const [shopOpen,    setShopOpen]    = useState(false);
  const [debugOpen,   setDebugOpen]   = useState(false);
  const [fps,         setFps]         = useState(0);
  const [rendererStats, setRendererStats] = useState({});
  const fpsRef          = useRef(0);
  const rendererStatsRef = useRef({});

  // ─── Day / night time tracking ────────────────────────────────────────────
  // Derived from wall-clock so all players share the same game time.
  // DEV: set to a number (0–24) to freeze the clock; null = live cycle.
  const DEV_FREEZE_TIME = 12; // ← заморозка на 12:00; поставь null чтобы снять
  const GAME_DAY_MS = 24 * REAL_MS_PER_GAME_HOUR;
  const getSharedGameTime = () =>
    DEV_FREEZE_TIME !== null
      ? DEV_FREEZE_TIME
      : (Date.now() % GAME_DAY_MS) / REAL_MS_PER_GAME_HOUR;
  const gameTimeRef  = useRef(getSharedGameTime());
  const [timeString, setTimeString] = useState(() => formatGameTime(gameTimeRef.current));

  useEffect(() => {
    let raf;
    const tick = () => {
      gameTimeRef.current = getSharedGameTime();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTimeString(formatGameTime(gameTimeRef.current)), 5000);
    return () => clearInterval(id);
  }, []);

  // ─── Placement state ──────────────────────────────────────────────────────
  const [placingItem,  setPlacingItem]  = useState(null);
  const [placedItems,  setPlacedItems]  = useState([]);
  const placedItemsRef = useRef([]);
  useEffect(() => { placedItemsRef.current = placedItems; }, [placedItems]);

  // ─── Drone (route) state — declared BEFORE useCitySync ─────────────────────
  const [drones,      setDrones]      = useState([]);
  const conveyorsRef  = useRef([]);  // kept as 'conveyorsRef' for backend-sync compat
  useEffect(() => { conveyorsRef.current = drones; }, [drones]);
  const [droneMode,   setDroneMode]   = useState(false);
  const droneModeRef  = useRef(false);
  const [droneFromId, setDroneFromId] = useState(null);
  const droneFromIdRef = useRef(null);
  useEffect(() => { droneModeRef.current   = droneMode;   }, [droneMode]);
  useEffect(() => { droneFromIdRef.current = droneFromId; }, [droneFromId]);
  // ─── Energy cable state — declared BEFORE useCitySync ─────────────────────────
  const [energyCables,      setEnergyCables]      = useState([]);
  const energyCablesRef     = useRef([]);
  useEffect(() => { energyCablesRef.current = energyCables; }, [energyCables]);
  const [cableMode,         setCableMode]         = useState(false);
  const cableModeRef        = useRef(false);
  const [cableFromId,       setCableFromId]       = useState(null);
  const cableFromIdRef      = useRef(null);
  useEffect(() => { cableModeRef.current   = cableMode;   }, [cableMode]);
  useEffect(() => { cableFromIdRef.current = cableFromId; }, [cableFromId]);

  // ─── Wall / Tower state ───────────────────────────────────────────────────
  const [placedWalls,   setPlacedWalls]   = useState([]);
  const placedWallsRef  = useRef([]);
  useEffect(() => { placedWallsRef.current  = placedWalls;  }, [placedWalls]);
  const [placedTowers,  setPlacedTowers]  = useState([]);
  const placedTowersRef = useRef([]);
  useEffect(() => { placedTowersRef.current = placedTowers; }, [placedTowers]);
  const [wallMode,      setWallMode]      = useState(false);
  const wallModeRef     = useRef(false);
  const [towerMode,     setTowerMode]     = useState(false);
  const towerModeRef    = useRef(false);
  const [wallFromPoint, setWallFromPoint] = useState(null); // { x, z }
  useEffect(() => { wallModeRef.current  = wallMode;  }, [wallMode]);
  useEffect(() => { towerModeRef.current = towerMode; }, [towerMode]);
  // Live cursor pos updated by CityScene ground plane via ref — no React re-render per frame
  const wallCursorRef = useRef(null);

  // ─── Stored amounts + points — declared BEFORE useCitySync so they can be persisted ─
  const storedAmountsRef = useRef({});
  const [storedAmounts, setStoredAmounts] = useState({});
  const pointsAmountsRef = useRef({});
  const [pointsAmounts, setPointsAmounts] = useState({});
  // Throttle React state updates: game logic runs every 1 s but we only
  // push to React every 3 ticks to avoid 1 Hz full-scene re-renders.
  const accumTickRef = useRef(0);
  // ─── Building levels — persisted via citySync ─────────────────────────────
  const buildingLevelsRef = useRef({});  // { [itemId]: level }
  const [buildingLevels, setBuildingLevels] = useState({});  // ─── Upgrade timers { [itemId]: { startReal, durationMs, targetLevel } } ──────────
  const upgradingBuildingsRef = useRef({});
  const [upgradingBuildings, setUpgradingBuildings] = useState({});
  useEffect(() => { upgradingBuildingsRef.current = upgradingBuildings; }, [upgradingBuildings]);
  // ─── Construction timers { [itemId]: { startReal, durationMs } } ─────────
  const constructingBuildingsRef = useRef({});
  const [constructingBuildings, setConstructingBuildings] = useState({});
  useEffect(() => { constructingBuildingsRef.current = constructingBuildings; }, [constructingBuildings]);
  // ─── Moving builder runners [{ id, fromPos, toPos, startReal }] ──────────
  const [movingBuilders, setMovingBuilders] = useState([]);
  // ─── Platform XP & Points — fetched once from /api/auth/me ─────────────────
  const [userId, setUserId] = useState(null);
  const [userXp, setUserXp] = useState(0);
  const [userPoints, setUserPoints] = useState(0);
  const userPointsRef = useRef(0);
  useEffect(() => { userPointsRef.current = userPoints; }, [userPoints]);
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/auth/me', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const u = data?.user ?? data;
        if (typeof u?.id === 'number') setUserId(u.id);
        if (typeof u?.experience === 'number') setUserXp(u.experience);
        if (typeof u?.points === 'number') { setUserPoints(u.points); userPointsRef.current = u.points; }
      })
      .catch(() => {});
  }, []);

  // ─── Backend sync (load on mount, auto-save every 30 s, save on close) ────
  const { loading: worldLoading, offlineHours, suggestedSpawn } = useCitySync({
    gameTimeRef,
    placedItemsRef,
    setPlacedItems,
    conveyorsRef,
    setConveyors: setDrones,
    energyCablesRef,
    setEnergyCables,
    storedAmountsRef,
    setStoredAmounts,
    pointsAmountsRef,
    setPointsAmounts,
    buildingLevelsRef,
    setBuildingLevels,
    placedWallsRef,
    setPlacedWalls,
    placedTowersRef,
    setPlacedTowers,
  });
  const [offlineToast, setOfflineToast] = useState(false);
  useEffect(() => {
    if (offlineHours >= 0.1) {
      setOfflineToast(true);
      const t = setTimeout(() => setOfflineToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, [offlineHours]);

  // ─── Other players (multiplayer) ─────────────────────────────────────────
  const { players: otherPlayers } = useOtherPlayers();

  // ─── Center camera on town-hall (or suggestedSpawn, or 0,0) once after load
  const hasCenteredRef = useRef(false);
  useEffect(() => {
    if (worldLoading || hasCenteredRef.current) return;
    hasCenteredRef.current = true;
    const th = placedItems.find(i => i.type === 'town-hall');
    if (th) {
      camTargetRef.current = { x: th.position[0], z: th.position[2] };
    } else if (suggestedSpawn) {
      camTargetRef.current = { x: suggestedSpawn.x, z: suggestedSpawn.z };
    } else {
      camTargetRef.current = { x: 0, z: 0 };
    }
  }, [worldLoading, placedItems, suggestedSpawn]);

  // ─── Energy totals ────────────────────────────────────────────────────────
  const [energyTotals, setEnergyTotals] = useState({});
  useEffect(() => {
    setEnergyTotals(calcEnergyTotals(placedItems, gameTimeRef.current));
  }, [placedItems]);
  useEffect(() => {
    const id = setInterval(
      () => setEnergyTotals(calcEnergyTotals(placedItemsRef.current, gameTimeRef.current)),
      5000,
    );
    return () => clearInterval(id);
  }, []);

  // ─── Storage totals ───────────────────────────────────────────────────────
  const [storageTotals, setStorageTotals] = useState({});
  useEffect(() => {
    setStorageTotals(calcStorageTotals(placedItems));
  }, [placedItems]);

  // ─── Powered items — zone-based only (no cables needed) ─────────────────────
  // Buildings are powered if they stand within any active generator's work zone.
  const [poweredIds, setPoweredIds] = useState(() => new Set());
  useEffect(() => {
    setPoweredIds(calcPoweredItems(placedItems, gameTimeRef.current));
  }, [placedItems]);
  useEffect(() => {
    const id = setInterval(() => {
      setPoweredIds(calcPoweredItems(placedItemsRef.current, gameTimeRef.current));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // ─── Per-building stored amounts (real-time accumulation) ─────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const deltaGameHours = 1000 / REAL_MS_PER_GAME_HOUR;
      const validIds = new Set(placedItemsRef.current.map(i => String(i.id)));
      // Clone each inner object so mutations below don't alias the previous
      // React state — otherwise buildingPropsEqual sees no change and memo
      // blocks the re-render (the "frozen badge" bug).
      const next = Object.fromEntries(
        Object.entries(storedAmountsRef.current)
          .filter(([k]) => validIds.has(k))
          .map(([k, v]) => [k, { ...v }])
      );

      // Compute effective per-connection rates (handles multi-source / multi-target)
      const convRates = calcConveyorRates(placedItemsRef.current, conveyorsRef.current, buildingLevelsRef.current);

      // ─── Extractor mining: fill internal ore buffer ─────────────────────────────
      for (const item of placedItemsRef.current) {
        if (item.type !== 'extractor') continue;
        const key      = String(item.id);
        const lvl      = buildingLevelsRef.current[key] ?? 1;
        const conf     = getLevelConfig('extractor', lvl);        // Only mine if: extractor level supports the ore type under it
        if (item.oreType && !canMineOre(lvl, item.oreType)) continue;        const mining   = 3 * (conf?.rateMultiplier ?? 1.0); // ед./ч
        const bufCap   = 30 * (conf?.capacityMultiplier ?? 1.0);
        if (!next[key]) next[key] = {};
        next[key].ore = Math.min((next[key].ore ?? 0) + mining * deltaGameHours, bufCap);
      }

      for (const conv of conveyorsRef.current) {
        const effectiveRate = convRates.get(conv.id) ?? 0;
        if (effectiveRate <= 0) continue;
        const to = placedItemsRef.current.find(i => i.id === conv.toId);
        const from = placedItemsRef.current.find(i => i.id === conv.fromId);
        if (!from || !to) continue;
        const rule = getTransferRule(from.type, to.type);
        if (!rule) continue;
        const stors = getStorages(to.type);
        if (!stors.length) continue;
        // Level multiplier already applied inside calcConveyorRates
        const adjustedRate = effectiveRate;
        // If the source has an internal buffer (e.g. extractor), drain from it first.
        // This ensures the buffer is consumed before transferring to the destination.
        let actualRate = adjustedRate;
        const fromStors = getStorages(from.type);
        if (fromStors.length) {
          const fromKey    = String(from.id);
          const rule2      = getTransferRule(from.type, to.type);
          const available  = next[fromKey]?.[rule2?.resource ?? rule.resource] ?? 0;
          const drainAmt   = Math.min(adjustedRate * deltaGameHours, available);
          actualRate       = drainAmt / deltaGameHours;
          if (!next[fromKey]) next[fromKey] = {};
          next[fromKey][rule2?.resource ?? rule.resource] = available - drainAmt;
        }
        // Apply destination building's capacity multiplier
        const toLevel   = buildingLevelsRef.current[String(to.id)] ?? 1;
        const toLvlConf = getLevelConfig(to.type, toLevel);
        const key = String(to.id);
        if (!next[key]) next[key] = {};
        const stor = stors.find(s => s.type === rule.resource) ?? stors[0];
        const cap  = (stor?.capacity ?? 1000) * (toLvlConf.capacityMultiplier ?? 1.0);
        next[key][rule.resource] = Math.min(
          (next[key][rule.resource] ?? 0) + actualRate * deltaGameHours,
          cap,
        );
      }
      // ─ Zone-based energy transfer ────────────────────────────────────────────────
      // Generators автоматически заряжают хранилища и здания внутри своей рабочей зоны.
      // Кабели больше не нужны — близость к рабочей зоне панели достаточна.
      for (const producer of placedItemsRef.current) {
        const prods = getProductions(producer.type);
        if (!prods.length) continue;
        const zone = getEnergyZone(producer.type);
        if (!zone) continue;
        for (const prod of prods) {
          const active = !prod.activeWhen || prod.activeWhen(gameTimeRef.current);
          if (!active) continue;
          for (const target of placedItemsRef.current) {
            if (target.id === producer.id) continue;
            const stors = getStorages(target.type);
            const stor  = stors.find(s => s.type === prod.type);
            if (!stor) continue;
            // Rectangular zone check centred on producer
            const dx = Math.abs(target.position[0] - producer.position[0]);
            const dz = Math.abs(target.position[2] - producer.position[2]);
            if (dx > zone.width / 2 || dz > zone.depth / 2) continue;
            const key = String(target.id);
            if (!next[key]) next[key] = {};
            const toLevel   = buildingLevelsRef.current[key] ?? 1;
            const toLvlConf = getLevelConfig(target.type, toLevel);
            const cap = (stor.capacity ?? 1000) * (toLvlConf.capacityMultiplier ?? 1.0);
            next[key][prod.type] = Math.min(
              (next[key][prod.type] ?? 0) + prod.ratePerHour * deltaGameHours,
              cap,
            );
          }
        }
      }
      storedAmountsRef.current = next;
      accumTickRef.current++;

      // ─ Coins → Points conversion for every town-hall ────────────────────
      const nextPoints = { ...pointsAmountsRef.current };
      let pointsChanged = false;
      for (const item of placedItemsRef.current) {
        if (item.type !== 'town-hall') continue;
        const key = String(item.id);
        const coins = next[key]?.coins ?? 0;
        // Use town-hall's level config to determine conversion rate
        const thLevel = buildingLevelsRef.current[key] ?? 1;
        const thConf  = getLevelConfig('town-hall', thLevel);
        const COINS_PER_POINT = thConf.coinsPerPoint ?? 1000;
        if (coins >= COINS_PER_POINT) {
          const earned = Math.floor(coins / COINS_PER_POINT);
          if (!next[key]) next[key] = {};
          next[key].coins = coins - earned * COINS_PER_POINT;
          nextPoints[key] = (nextPoints[key] ?? 0) + earned;
          pointsChanged = true;
        }
      }
      if (pointsChanged) {
        storedAmountsRef.current = next;  // update again after coin deduction
        pointsAmountsRef.current = nextPoints;
        setPointsAmounts({ ...nextPoints });
      }
      // Всегда пушим обновлённые суммы в React — inner-объекты теперь клонируются
      // выше, поэтому buildingPropsEqual корректно обнаруживает изменения.
      setStoredAmounts({ ...next });
    }, 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  // ─── Context menu (RMB on building) ──────────────────────────────────────
  const rightClickHitRef = useRef(false);
  const rightClickRef    = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);

  // ─── Drone route handler ──────────────────────────────────────────────────
  const handleDroneRouteBuildingClick = useCallback((itemId) => {
    if (!droneModeRef.current) return;
    const fromId = droneFromIdRef.current;

    if (fromId === null) {
      // Select source
      const item = placedItemsRef.current.find(i => i.id === itemId);
      if (!item) return;
      if (!canBeSource(item.type)) return;
      const outCount = conveyorsRef.current.filter(c => c.fromId === itemId).length;
      if (outCount >= getConveyorOutLimit(item.type)) return;
      setDroneFromId(itemId);

    } else if (fromId === itemId) {
      setDroneFromId(null);

    } else {
      const from = placedItemsRef.current.find(i => i.id === fromId);
      const to   = placedItemsRef.current.find(i => i.id === itemId);
      if (from && to && canConnect(from.type, to.type)) {
        const dup     = conveyorsRef.current.find(c => c.fromId === fromId && c.toId === itemId);
        const inCount = conveyorsRef.current.filter(c => c.toId === itemId).length;
        if (!dup && inCount < getConveyorInLimit(to.type)) {
          setDrones(prev => [...prev, { id: Date.now(), fromId, toId: itemId }]);
        }
      }
      setDroneFromId(null);
    }
  }, []);

  const startDroneMode = useCallback(() => {
    setDroneMode(true);
    setDroneFromId(null);
  }, []);

  // ─── Energy cable handler ────────────────────────────────────────────────────
  const handleCableBuildingClick = useCallback((itemId) => {
    if (!cableModeRef.current) return;
    const fromId = cableFromIdRef.current;
    if (fromId === null) {
      setCableFromId(itemId);
    } else if (fromId === itemId) {
      setCableFromId(null);
    } else {
      const from = placedItemsRef.current.find(i => i.id === fromId);
      const to   = placedItemsRef.current.find(i => i.id === itemId);
      if (from && to && canCableConnect(from.type, to.type)) {
        const dup = energyCablesRef.current.find(c => c.fromId === fromId && c.toId === itemId);
        if (!dup) {
          setEnergyCables(prev => [...prev, { id: Date.now(), fromId, toId: itemId }]);
        }
      }
      setCableFromId(null);
    }
  }, []);

  const startCableMode = useCallback(() => {
    setCableMode(true);
    setCableFromId(null);
  }, []);

  // ─── Wall handlers ────────────────────────────────────────────────────────
  const startWallMode  = useCallback(() => { setWallMode(true);  setWallFromPoint(null); setTowerMode(false); }, []);
  const startTowerMode = useCallback(() => { setTowerMode(true); setWallMode(false);     setWallFromPoint(null); }, []);

  const handleWallGroundClick = useCallback((x, z) => {
    if (!wallModeRef.current) return;
    const snapped = snapWallPoint(x, z, placedWallsRef.current, placedTowersRef.current);

    setWallFromPoint(prev => {
      if (prev === null) {
        // First click — set start point, wait for second click
        return snapped;
      }

      // Second click — place wall segment, then RESET (no chaining)
      const dx = snapped.x - prev.x;
      const dz = snapped.z - prev.z;
      const length = Math.hypot(dx, dz);
      if (length < 0.2) return null; // same point → cancel

      // Cost = number of grid columns spanned × coin cost per column
      const segments = Math.max(1, Math.round(length / WALL_GRID_SNAP));
      const totalCost = segments * WALL_SEGMENT_COIN_COST;
      const availableCoins = Object.values(storedAmountsRef.current).reduce((s, v) => s + (v?.coins ?? 0), 0);
      if (availableCoins < totalCost) {
        alert(`Нужно ${totalCost} монет (${segments} столбов × ${WALL_SEGMENT_COIN_COST})!`);
        return null; // cancel, stay in wall mode but reset points
      }

      // Deduct coins proportionally across storages
      let remaining = totalCost;
      const next = { ...storedAmountsRef.current };
      for (const sid of Object.keys(next)) {
        if (remaining <= 0) break;
        const c = next[sid]?.coins ?? 0;
        if (c > 0) { const take = Math.min(c, remaining); next[sid] = { ...next[sid], coins: c - take }; remaining -= take; }
      }
      storedAmountsRef.current = next;
      setStoredAmounts({ ...next });

      const newWall = { id: Date.now(), from: prev, to: snapped, level: 1 };
      setPlacedWalls(p => { const n = [...p, newWall]; placedWallsRef.current = n; return n; });

      // Reset: ready for next independent wall segment
      return null;
    });
  }, []); // eslint-disable-line

  const handleTowerGroundClick = useCallback((x, z) => {
    if (!towerModeRef.current) return;
    const GRID = 2;
    const snapped = { x: Math.round(x / GRID) * GRID, z: Math.round(z / GRID) * GRID };
    const totalCoins = Object.values(storedAmountsRef.current).reduce((s, v) => s + (v?.coins ?? 0), 0);
    if (totalCoins < TOWER_COIN_COST) {
      alert(`Нужно ${TOWER_COIN_COST} монет для башни!`);
      setTowerMode(false); towerModeRef.current = false; return;
    }
    let remaining = TOWER_COIN_COST;
    const next = { ...storedAmountsRef.current };
    for (const sid of Object.keys(next)) {
      if (remaining <= 0) break;
      const c = next[sid]?.coins ?? 0;
      if (c > 0) { const take = Math.min(c, remaining); next[sid] = { ...next[sid], coins: c - take }; remaining -= take; }
    }
    storedAmountsRef.current = next;
    setStoredAmounts({ ...next });
    const newTower = { id: Date.now(), position: [snapped.x, 0, snapped.z], rotation: 0, level: 1 };
    setPlacedTowers(p => { const n = [...p, newTower]; placedTowersRef.current = n; return n; });
    setTowerMode(false); towerModeRef.current = false;
  }, []); // eslint-disable-line

  // ─── Placement tracking ───────────────────────────────────────────────────
  const placedHitRef     = useRef(false);
  const [selectedPlacedId, setSelectedPlacedId] = useState(null);
  const placementPosRef  = useRef(null);
  const placementRotYRef = useRef(0);
  const placingItemRef   = useRef(null);
  const movingItemIdRef  = useRef(null); // set when moving an existing building — reuse its id on re-placement
  useEffect(() => { placingItemRef.current = placingItem; }, [placingItem]);

  const startPlacing = useCallback((type) => {
    placementRotYRef.current = 0;
    setPlacingItem(type);
  }, []);

  // ─── Context menu handlers ────────────────────────────────────────────────
  const handleBuildingRightClick = useCallback((itemId, itemType, x, y) => {
    rightClickRef.current = { itemId, itemType, x, y };
  }, []);

  const handleDroneRightClick = useCallback((droneId, x, y) => {
    rightClickRef.current = { itemId: droneId, itemType: 'drone', x, y };
  }, []);

  const handleCableRightClick = useCallback((cableId, x, y) => {
    rightClickRef.current = { itemId: cableId, itemType: 'cable', x, y };
  }, []);

  const handleWallRightClick = useCallback((wallId, x, y) => {
    rightClickHitRef.current = true; // prevent pan from starting on RMB
    rightClickRef.current = { itemId: wallId, itemType: 'wall', x, y };
  }, []);

  const handleTowerRightClick = useCallback((towerId, x, y) => {
    rightClickHitRef.current = true;
    rightClickRef.current = { itemId: towerId, itemType: 'tower', x, y };
  }, []);

  // ─── Upgrade building level ───────────────────────────────────────────────
  const handleUpgrade = useCallback(async () => {
    if (!contextMenu) return;
    const { itemId, itemType } = contextMenu;

    // ── Wall coin-based upgrade (instant, no builder needed) ─────────────────
    if (itemType === 'wall') {
      const wall = placedWallsRef.current.find(w => w.id === itemId);
      const level = wall?.level ?? 1;
      if (level >= 7) return;
      const nextCfg = WALL_LEVELS[level]; // 0-indexed: level N is at index N (level 1→index 0, so next after level N is index N)
      if (!nextCfg) return;
      const cost = nextCfg.upgradeCoinCost;
      const totalCoins = Object.values(storedAmountsRef.current).reduce((s, v) => s + (v?.coins ?? 0), 0);
      if (totalCoins < cost) return;
      let remaining = cost;
      const next = { ...storedAmountsRef.current };
      for (const sid of Object.keys(next)) {
        if (remaining <= 0) break;
        const c = next[sid]?.coins ?? 0;
        if (c > 0) { const take = Math.min(c, remaining); next[sid] = { ...next[sid], coins: c - take }; remaining -= take; }
      }
      storedAmountsRef.current = next;
      setStoredAmounts({ ...next });
      setPlacedWalls(prev => { const u = prev.map(w => w.id === itemId ? { ...w, level: level + 1 } : w); placedWallsRef.current = u; return u; });
      setContextMenu(null);
      return;
    }

    // ── Tower coin-based upgrade (instant, no builder needed) ────────────────
    if (itemType === 'tower') {
      const tower = placedTowersRef.current.find(t => t.id === itemId);
      const level = tower?.level ?? 1;
      if (level >= 5) return;
      const nextCfg = TOWER_LEVELS[level];
      if (!nextCfg) return;
      const cost = nextCfg.upgradeCoinCost;
      const totalCoins = Object.values(storedAmountsRef.current).reduce((s, v) => s + (v?.coins ?? 0), 0);
      if (totalCoins < cost) return;
      let remaining = cost;
      const next = { ...storedAmountsRef.current };
      for (const sid of Object.keys(next)) {
        if (remaining <= 0) break;
        const c = next[sid]?.coins ?? 0;
        if (c > 0) { const take = Math.min(c, remaining); next[sid] = { ...next[sid], coins: c - take }; remaining -= take; }
      }
      storedAmountsRef.current = next;
      setStoredAmounts({ ...next });
      setPlacedTowers(prev => { const u = prev.map(t => t.id === itemId ? { ...t, level: level + 1 } : t); placedTowersRef.current = u; return u; });
      setContextMenu(null);
      return;
    }

    const currentLevel = buildingLevelsRef.current[String(itemId)] ?? 1;
    const next = getNextLevelConfig(itemType, currentLevel);
    if (!next) return;
    // Use real platform points, not in-game town-hall amounts
    if (userPoints < next.pointsCost) return;
    if (userXp < next.xpRequired) return;
    // Block if this building is already mid-upgrade
    if (upgradingBuildingsRef.current[String(itemId)]) return;
    // Require a free builder
    const fb = countFreeBuilders(placedItemsRef.current, buildingLevelsRef.current, constructingBuildingsRef.current, upgradingBuildingsRef.current);
    if (fb <= 0) { alert('Нет свободных строителей! Постройте или улучшите Дом строителя.'); return; }

    // Deduct from the real platform points via backend
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/points/spend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ amount: next.pointsCost, reason: `city_upgrade_${itemType}_lv${currentLevel + 1}` }),
      });
      if (!res.ok) return; // server rejected (race condition, etc.)
      const data = await res.json();
      setUserPoints(data.newBalance);
    } catch {
      return;
    }

    // Timed upgrade – show progress badge, complete after durationMs
    const durationMs = next.upgradeDurationMs ?? 15_000;
    const entry   = { startReal: Date.now(), durationMs, targetLevel: currentLevel + 1 };
    const nb      = { ...upgradingBuildingsRef.current, [String(itemId)]: entry };
    upgradingBuildingsRef.current = nb;
    setUpgradingBuildings({ ...nb });
    setContextMenu(null);
  }, [contextMenu, userXp, userPoints]); // eslint-disable-line

  // ─── Check for completed timed upgrades every second ─────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const upgrading = upgradingBuildingsRef.current;
      const now = Date.now();
      const completed = Object.entries(upgrading).filter(
        ([, v]) => now >= v.startReal + v.durationMs
      );
      if (!completed.length) return;
      const nextUpgrading = { ...upgrading };
      const nextLevels    = { ...buildingLevelsRef.current };
      for (const [bid, v] of completed) {
        nextLevels[bid] = v.targetLevel;
        delete nextUpgrading[bid];
      }
      buildingLevelsRef.current    = nextLevels;
      upgradingBuildingsRef.current = nextUpgrading;
      setBuildingLevels({ ...nextLevels });
      setUpgradingBuildings({ ...nextUpgrading });
    }, 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  // ─── Check for completed constructions every second ───────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const constructing = constructingBuildingsRef.current;
      const now = Date.now();
      const completed = Object.entries(constructing).filter(([, v]) => now >= v.startReal + v.durationMs);
      if (!completed.length) return;
      const next = { ...constructing };
      for (const [bid] of completed) delete next[bid];
      constructingBuildingsRef.current = next;
      setConstructingBuildings({ ...next });
      // Remove completed runners
      setMovingBuilders(prev => prev.filter(r => !completed.some(([bid]) => r.itemId === bid)));
    }, 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  const handleSell = useCallback(() => {
    if (!contextMenu) return;
    const { itemId: id, itemType } = contextMenu;
    if (itemType === 'drone') {
      setDrones(prev => prev.filter(c => c.id !== id));
    } else if (itemType === 'cable') {
      setEnergyCables(prev => prev.filter(c => c.id !== id));
    } else if (itemType === 'wall') {
      setPlacedWalls(prev => { const u = prev.filter(w => w.id !== id); placedWallsRef.current = u; return u; });
    } else if (itemType === 'tower') {
      setPlacedTowers(prev => { const u = prev.filter(t => t.id !== id); placedTowersRef.current = u; return u; });
    } else {
      // building — also remove attached connections
      setPlacedItems(prev => prev.filter(i => i.id !== id));
      setDrones(prev => prev.filter(c => c.fromId !== id && c.toId !== id));
      setEnergyCables(prev => prev.filter(c => c.fromId !== id && c.toId !== id));
    }
    setContextMenu(null);
  }, [contextMenu]);

  const handleMove = useCallback(() => {
    if (!contextMenu) return;
    // Walls and towers cannot be moved (they are placed by points)
    if (contextMenu.itemType === 'wall' || contextMenu.itemType === 'tower') { setContextMenu(null); return; }
    const item = placedItemsRef.current.find(i => i.id === contextMenu.itemId);
    if (item) {
      movingItemIdRef.current = item.id; // remember old id so level is preserved
      setPlacedItems(prev => prev.filter(i => i.id !== item.id));
      setDrones(prev => prev.filter(c => c.fromId !== item.id && c.toId !== item.id));
      startPlacing(item.type);
    }
    setContextMenu(null);
  }, [contextMenu, startPlacing]);

  // ─── Chunk selection state ────────────────────────────────────────────────
  const lmbHeldRef   = useRef(false);
  const selectedRef  = useRef(new Set());
  const meshMapRef   = useRef(new Map());
  const [selectedCount, setSelectedCount] = useState(0);

  const clearSelection = useCallback(() => {
    for (const id of selectedRef.current) {
      const mRef = meshMapRef.current.get(id);
      if (mRef?.current) {
        mRef.current.material.emissive.setHex(0x000000);
        mRef.current.material.emissiveIntensity = 0;
      }
    }
    selectedRef.current.clear();
    setSelectedCount(0);
  }, []);

  const cityCtx = useMemo(
    () => ({ lmbHeldRef, selectedRef, meshMapRef, placingItemRef, placedItemsRef, placedHitRef, conveyorModeRef: droneModeRef, rightClickHitRef, cableModeRef, wallModeRef, towerModeRef }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ─── Keyboard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      keysRef.current[e.code] = true;
      if (e.code === 'Escape') {
        if (wallModeRef.current || towerModeRef.current) {
          setWallMode(false); setTowerMode(false); setWallFromPoint(null); e.preventDefault(); return;
        }
        if (cableModeRef.current) {
          setCableMode(false); setCableFromId(null); e.preventDefault(); return;
        }
        if (droneModeRef.current) {
          setDroneMode(false); setDroneFromId(null); e.preventDefault(); return;
        }
        if (placingItemRef.current) { movingItemIdRef.current = null; setPlacingItem(null); e.preventDefault(); return; }
        clearSelection();
        setSelectedPlacedId(null);
      }
      if (e.code === 'F3') { setDebugOpen(v => !v); e.preventDefault(); return; }
      e.preventDefault?.();
    };
    const up = (e) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', down, { passive: false });
    window.addEventListener('keyup',   up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup',   up);
    };
  }, [clearSelection, setSelectedPlacedId]);

  // ─── Mouse events ─────────────────────────────────────────────────────────
  const canvasWrapRef = useRef(null);
  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;

    const onMove = (e) => {
      const inp = inputRef.current;
      inp.mouseX = e.clientX;
      inp.mouseY = e.clientY;
      if (inp.middleDrag) {
        inp.dragDeltaX += e.clientX - inp.lastMX;
        inp.dragDeltaY += e.clientY - inp.lastMY;
      }
      inp.lastMX = e.clientX;
      inp.lastMY = e.clientY;
    };
    const onDown = (e) => {
      if (e.button === 0) {
        if (placingItemRef.current) {
          if (placementPosRef.current) {
            const pos  = placementPosRef.current;
            const type = placingItemRef.current;
            if (isColliding({ x: pos.x, z: pos.z }, type, placedItemsRef.current)) return;

            // ── Place limits ──────────────────────────────────────────────
            if (type === 'town-hall' && countPlacedType(placedItemsRef.current, 'town-hall') >= 1) {
              alert('Ратуша может быть только одна!'); return;
            }
            if (type === 'builder-house' && countPlacedType(placedItemsRef.current, 'builder-house') >= 3) {
              alert('Можно построить не более 3 домиков строителя!'); return;
            }

            // ── Extractor — must be on ore ────────────────────────────────
            let nearOre = null;
            if (type === 'extractor') {
              nearOre = findNearestOreDeposit(pos.x, pos.z);
              if (!nearOre) return;
            }

            // ── Builder-house — no builder needed; 2nd/3rd costs coins (skip cost if moving) ───
            if (type === 'builder-house') {
              const isMove = movingItemIdRef.current != null;
              const bhCount = countPlacedType(placedItemsRef.current, 'builder-house');
              if (!isMove && bhCount > 0) {
                // Deduct coins from the in-game coin storage (storedAmounts)
                const totalCoins = Object.values(storedAmountsRef.current)
                  .reduce((s, v) => s + (v?.coins ?? 0), 0);
                if (totalCoins < BUILDER_HOUSE_EXTRA_COST_COINS) {
                  alert(`Нужно ${BUILDER_HOUSE_EXTRA_COST_COINS} монет для второго/третьего дома строителя!`);
                  return;
                }
                // Deduct coins proportionally from storages that have coins
                let remaining = BUILDER_HOUSE_EXTRA_COST_COINS;
                const next = { ...storedAmountsRef.current };
                for (const sid of Object.keys(next)) {
                  if (remaining <= 0) break;
                  const coins = next[sid]?.coins ?? 0;
                  if (coins > 0) {
                    const take = Math.min(coins, remaining);
                    next[sid] = { ...next[sid], coins: coins - take };
                    remaining -= take;
                  }
                }
                storedAmountsRef.current = next;
                setStoredAmounts({ ...next });
              }
              const bhId = isMove ? movingItemIdRef.current : Date.now();
              movingItemIdRef.current = null;
              const newItem = { id: bhId, type: 'builder-house', position: [pos.x, pos.y, pos.z], rotation: placementRotYRef.current };
              setPlacedItems(prev => [...prev, newItem]);
              setPlacingItem(null);
              return;
            }

            // ── All other buildings — require a free builder + spend points ──
            // Skip cost/builder checks when re-placing a moved building.
            const isMove = movingItemIdRef.current != null;
            if (!isMove) {
              const freeB = countFreeBuilders(placedItemsRef.current, buildingLevelsRef.current, constructingBuildingsRef.current, upgradingBuildingsRef.current);
              if (freeB <= 0) {
                alert('Нет свободных строителей! Постройте или улучшите Дом строителя.');
                return;
              }
            }
            const pointCost = isMove ? 0 : (ITEM_POINT_COST[type] ?? 0);
            if (pointCost > 0 && userPointsRef.current < pointCost) {
              alert(`Нужно ${pointCost} баллов для постройки!`);
              return;
            }

            // ── Deduct platform points via API ────────────────────────────
            const placeItem = async () => {
              if (pointCost > 0) {
                try {
                  const token = localStorage.getItem('token');
                  const res = await fetch('/api/points/spend', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    body: JSON.stringify({ amount: pointCost, reason: `city_place_${type}` }),
                  });
                  if (!res.ok) { alert('Не удалось списать баллы.'); return; }
                  const data = await res.json();
                  setUserPoints(data.newBalance);
                  userPointsRef.current = data.newBalance;
                } catch { alert('Ошибка сервера при списании баллов.'); return; }
              }

              // If this is a moved building, reuse its old id so buildingLevels entry is preserved.
              const newId = isMove ? movingItemIdRef.current : Date.now();
              movingItemIdRef.current = null; // reset
              const newItem = nearOre
                ? { id: newId, type, position: [pos.x, pos.y, pos.z], rotation: placementRotYRef.current, oreType: nearOre.name }
                : { id: newId, type, position: [pos.x, pos.y, pos.z], rotation: placementRotYRef.current };
              setPlacedItems(prev => [...prev, newItem]);

              // ── Start construction timer (skip for moved buildings) ──────
              if (!isMove) {
                const dur = CONSTRUCTION_DURATION_MS[type] ?? 0;
                if (dur > 0) {
                  const entry = { startReal: Date.now(), durationMs: dur };
                  const nb = { ...constructingBuildingsRef.current, [String(newId)]: entry };
                  constructingBuildingsRef.current = nb;
                  setConstructingBuildings({ ...nb });
                  // Spawn a moving builder runner from nearest builder house
                  const housePos = findIdleBuilderHousePos(placedItemsRef.current, buildingLevelsRef.current, constructingBuildingsRef.current, upgradingBuildingsRef.current);
                  if (housePos) {
                    setMovingBuilders(prev => [...prev, { id: `runner_${newId}`, itemId: String(newId), fromPos: housePos, toPos: [pos.x, pos.y, pos.z], startReal: Date.now() }]);
                  }
                }
              }
            };
            placeItem();
            setPlacingItem(null);
          }
          return;
        }
        lmbHeldRef.current = true;
        // В режиме дронов левый клик не запускает панорамирование камеры
        if (!droneModeRef.current) {
          inputRef.current.middleDrag = true;
          inputRef.current.lastMX = e.clientX;
          inputRef.current.lastMY = e.clientY;
        }
        if (placedHitRef.current) {
          placedHitRef.current = false;
        } else if (!wallModeRef.current && !towerModeRef.current) {
          setSelectedPlacedId(null);
        }
      }
      if (e.button === 1 || e.button === 2) {
        if (e.button === 2 && rightClickHitRef.current) {
          rightClickHitRef.current = false;
          e.preventDefault();
          return;
        }
        inputRef.current.middleDrag = true;
        inputRef.current.lastMX = e.clientX;
        inputRef.current.lastMY = e.clientY;
        e.preventDefault();
      }
    };
    const onUp = (e) => {
      if (e.button === 0) {
        lmbHeldRef.current = false;
        inputRef.current.middleDrag = false;
      }
      if (e.button === 1 || e.button === 2)
        inputRef.current.middleDrag = false;
    };
    const onLeave = () => {
      inputRef.current.mouseX = null;
      inputRef.current.mouseY = null;
      inputRef.current.middleDrag = false;
    };
    const onWheel = (e) => {
      if (placingItemRef.current) {
        placementRotYRef.current += e.deltaY > 0 ? 0.2 : -0.2;
      } else {
        inputRef.current.wheelDelta += e.deltaY > 0 ? 1 : -1;
      }
      e.preventDefault();
    };
    const onContext = (e) => {
      e.preventDefault();
      if (rightClickRef.current) {
        setContextMenu(rightClickRef.current);
        rightClickRef.current = null;
      }
    };

    el.addEventListener('mousemove',    onMove);
    el.addEventListener('mousedown',    onDown);
    el.addEventListener('mouseup',      onUp);
    el.addEventListener('mouseleave',   onLeave);
    el.addEventListener('wheel',        onWheel, { passive: false });
    el.addEventListener('contextmenu',  onContext);
    return () => {
      el.removeEventListener('mousemove',   onMove);
      el.removeEventListener('mousedown',   onDown);
      el.removeEventListener('mouseup',     onUp);
      el.removeEventListener('mouseleave',  onLeave);
      el.removeEventListener('wheel',       onWheel);
      el.removeEventListener('contextmenu', onContext);
    };
  }, []);

  // ─── HUD update ~10fps ────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setDisplayPos({ x: camTargetRef.current.x, z: camTargetRef.current.z });
      setDisplayZoom(camStateRef.current.zoom);
      setSelectedCount(selectedRef.current.size);
      setFps(fpsRef.current);
      setRendererStats({ ...rendererStatsRef.current });
    }, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <CityContext.Provider value={cityCtx}>
      <div className={styles.wrapper} ref={canvasWrapRef}>
        <Canvas
          shadows
          dpr={[1, 1.5]}
          performance={{ min: 0.5 }}
          gl={{ antialias: (navigator.hardwareConcurrency ?? 8) > 4, powerPreference: 'high-performance', stencil: false }}
          style={{ width: '100%', height: '100%', position: 'relative', zIndex: 0 }}
        >
          <Scene
            camTargetRef={camTargetRef}
            camStateRef={camStateRef}
            keysRef={keysRef}
            inputRef={inputRef}
            placingItem={placingItem}
            placedItems={placedItems}
            placementPosRef={placementPosRef}
            placementRotYRef={placementRotYRef}
            selectedPlacedId={selectedPlacedId}
            setSelectedPlacedId={setSelectedPlacedId}
            gameTimeRef={gameTimeRef}
            drones={drones}
            droneMode={droneMode}
            droneFromId={droneFromId}
            onDroneRouteBuildingClick={handleDroneRouteBuildingClick}

            fpsRef={fpsRef}
            rendererStatsRef={rendererStatsRef}
            poweredIds={poweredIds}
            storedAmounts={storedAmounts}
            pointsAmounts={pointsAmounts}
            buildingLevels={buildingLevels}
            upgradingBuildings={upgradingBuildings}
            constructingBuildings={constructingBuildings}
            movingBuilders={movingBuilders}
            totalBuilders={countTotalBuilders(placedItems, buildingLevels)}
            freeBuilders={countFreeBuilders(placedItems, buildingLevels, constructingBuildings, upgradingBuildings)}
            onBuildingRightClick={handleBuildingRightClick}
            onDroneRightClick={handleDroneRightClick}
            placedWalls={placedWalls}
            placedTowers={placedTowers}
            wallMode={wallMode}
            towerMode={towerMode}
            wallFromPoint={wallFromPoint}
            wallCursorRef={wallCursorRef}
            onWallGroundClick={handleWallGroundClick}
            onTowerGroundClick={handleTowerGroundClick}
            onWallRightClick={handleWallRightClick}
            onTowerRightClick={handleTowerRightClick}
            otherPlayers={otherPlayers}
          />
        </Canvas>

        <HUD
          pos={displayPos}
          zoom={displayZoom}
          selectedCount={selectedCount}
          onClearSelection={clearSelection}
          onShop={() => setShopOpen(true)}
          onBack={onBack || (() => {})}
          placingItem={placingItem}
          timeString={timeString}
          energyTotals={energyTotals}
          storageTotals={storageTotals}
          fps={fps}
          debugOpen={debugOpen}
          onToggleDebug={() => setDebugOpen(v => !v)}
          rendererStats={rendererStats}
          itemsCount={placedItems.length}
          dronesCount={drones.length}
          droneMode={droneMode}
          droneFromId={droneFromId}
          wallMode={wallMode}
          wallFromPoint={wallFromPoint}
          towerMode={towerMode}
          points={Object.values(pointsAmounts).reduce((s, v) => s + v, 0)}
        />
        {shopOpen && (
          <ShopModal
            onClose={() => setShopOpen(false)}
            onBuy={startPlacing}
            onDrone={startDroneMode}
            onWallMode={startWallMode}
            onTowerMode={startTowerMode}
            userPoints={userPoints}
            coinBalance={Object.values(storedAmounts).reduce((s, v) => s + (v?.coins ?? 0), 0)}
            freeBuilders={countFreeBuilders(placedItems, buildingLevels, constructingBuildings, upgradingBuildings)}
            totalBuilders={countTotalBuilders(placedItems, buildingLevels)}
            townHallCount={countPlacedType(placedItems, 'town-hall')}
            builderHouseCount={countPlacedType(placedItems, 'builder-house')}
          />
        )}

        {contextMenu && (() => {
          const { itemId, itemType } = contextMenu;
          // Compute correct level per item type
          const ctxItemLevel =
            itemType === 'wall'  ? (placedWalls.find(w => w.id === itemId)?.level ?? 1) :
            itemType === 'tower' ? (placedTowers.find(t => t.id === itemId)?.level ?? 1) :
            (buildingLevels[String(itemId)] ?? 1);
          // Coin upgrade info for walls/towers
          const coinBal = Object.values(storedAmounts).reduce((s, v) => s + (v?.coins ?? 0), 0);
          let coinUpgradeNext = null;
          if (itemType === 'wall') {
            const lvl = ctxItemLevel;
            if (lvl < 7) {
              const nc = WALL_LEVELS[lvl]; // index = current level (levels are 1-based, array 0-based)
              if (nc) coinUpgradeNext = { name: nc.name, level: nc.level, coinCost: nc.upgradeCoinCost, canAfford: coinBal >= nc.upgradeCoinCost, description: nc.description };
            }
          } else if (itemType === 'tower') {
            const lvl = ctxItemLevel;
            if (lvl < 5) {
              const nc = TOWER_LEVELS[lvl];
              if (nc) coinUpgradeNext = { name: nc.name, level: nc.level, coinCost: nc.upgradeCoinCost, canAfford: coinBal >= nc.upgradeCoinCost, description: nc.description };
            }
          }
          return (
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              itemType={itemType}
              itemLevel={ctxItemLevel}
              totalPoints={userPoints}
              userXp={userXp}
              freeBuilders={countFreeBuilders(placedItems, buildingLevels, constructingBuildings, upgradingBuildings)}
              onSell={handleSell}
              onMove={handleMove}
              onUpgrade={handleUpgrade}
              onClose={() => setContextMenu(null)}
              upgradeInfo={upgradingBuildings[String(itemId)] ?? null}
              coinUpgradeNext={coinUpgradeNext}
            />
          );
        })()}

        {worldLoading && (
          <div className={styles.worldLoading}>
            <div className={styles.worldLoadingSpinner} />
            <span>Загрузка мира…</span>
          </div>
        )}

        {offlineToast && (
          <div className={styles.offlineToast}>
            🕒 Пока вас не было: прошло <strong>{offlineHours.toFixed(1)} игр. ч.</strong>
          </div>
        )}
      </div>
    </CityContext.Provider>
  );
}
