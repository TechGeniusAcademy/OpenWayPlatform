import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import styles from './OpenCity.module.css';
import { isColliding } from './items/collision.js';
import './items/conveyorRules.js';   // side-effect: registers all transfer rules
import './items/solarPanel.js';      // side-effect: registers solar-panel energy zone
import './items/townHall.js';         // side-effect: registers town-hall storage
import './items/extractor.js';        // side-effect: registers extractor storage
import './items/coalGenerator.js';    // side-effect: registers coal-generator storage + production
import './items/steamGenerator.js';   // side-effect: registers steam-generator storage + production
import './items/labFactory.js';       // side-effect: registers lab-factory ore input storage
import './items/hangar.js';           // side-effect: registers hangar config
import { HANGAR_CONFIG } from './items/hangar.js';
import { findNearestOreDeposit, canMineOre } from './systems/oreRegistry.js';
import { countFreeBuilders, countTotalBuilders, countPlacedType, findIdleBuilderHousePos } from './systems/builderSystem.js';
import { ITEM_POINT_COST, ITEM_PLACE_LIMIT, CONSTRUCTION_DURATION_MS, BUILDER_HOUSE_EXTRA_COST_COINS } from './items/shopPrices.js';
import { snapWallPoint, WALL_SEGMENT_COIN_COST, TOWER_COIN_COST, WALL_LEVELS, TOWER_LEVELS, WALL_GRID_SNAP } from './items/wallSystem.js';
import { canConnect, canBeSource, getTransferRule, getConveyorOutLimit, getConveyorInLimit } from './systems/conveyor.js';
import { calcConveyorRates } from './systems/connectionRates.js';
import { getLevelConfig, getNextLevelConfig } from './systems/upgrades.js';
import { useCitySync }             from './systems/citySync.js';
import { initHp, initFighterHp, applyDamage, repairCost, findNearestDamageable, MISSILE_DAMAGE } from './systems/hpSystem.js';
import { REAL_MS_PER_GAME_HOUR, formatGameTime } from './systems/dayNight.js';
import { calcEnergyTotals, calcStorageTotals, calcPoweredItems, getStorages, getEnergyZone, getProductions } from './systems/energy.js';
import { CityContext }             from './city/CityContext.js';
import { Scene }                   from './city/CityScene.jsx';
import { useOtherPlayers }         from './systems/useOtherPlayers.js';
import { HUD }                     from './city/HUD.jsx';
import { ShopModal }               from './city/ShopModal.jsx';
import { ContextMenu }             from './city/ContextMenu.jsx';
import { MiniMap }                 from './city/MiniMap.jsx';
import { DronePanel, FIGHTER_UPGRADE_COSTS, DRONE_ROUTE_UPGRADE_COSTS } from './city/DronePanel.jsx';
import { WaypointMarkers }         from './city/WaypointMarkers.jsx';
import { WaypointEdgeArrows }      from './city/WaypointEdgeArrows.jsx';

// ─── Main export ─────────────────────────────────────────────────────────────

export default function OpenCity({ onBack }) {
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [tabOpen,       setTabOpen]       = useState(false);
  const [username,      setUsername]      = useState('');
  const [waypoints,     setWaypoints]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('mapWaypoints') ?? '[]'); } catch { return []; }
  });
  const addWaypoint    = (x, z, name) => setWaypoints(prev => {
    const next = [...prev, { id: Date.now(), x, z, name }];
    localStorage.setItem('mapWaypoints', JSON.stringify(next));
    return next;
  });
  const removeWaypoint = (id) => setWaypoints(prev => {
    const next = prev.filter(w => w.id !== id);
    localStorage.setItem('mapWaypoints', JSON.stringify(next));
    return next;
  });
  // Shared ref: WaypointMarkers writes screen positions here each frame;
  // WaypointEdgeArrows reads it to show off-screen direction indicators.
  const waypointScreenPosRef = useRef({});

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
  const [shopOpen,        setShopOpen]        = useState(false);
  const [dronePanelOpen,  setDronePanelOpen]  = useState(false);
  const [ingots,          setIngots]          = useState({ iron: 0, silver: 0, copper: 0 });
  const ingotsRef         = useRef({ iron: 0, silver: 0, copper: 0 });
  const [upgradingDrones, setUpgradingDrones] = useState({});
  const upgradingDronesRef = useRef({});
  const [droneRouteLevels, setDroneRouteLevels] = useState({});
  const droneRouteLevelsRef = useRef({});
  const [debugOpen,   setDebugOpen]   = useState(false);
  const [fps,         setFps]         = useState(0);
  const [rendererStats, setRendererStats] = useState({});
  const fpsRef          = useRef(0);
  const rendererStatsRef = useRef({});

  // ─── Day / night time tracking ────────────────────────────────────────────
  // Derived from wall-clock so all players share the same game time.
  // DEV: set to a number (0–24) to freeze the clock; null = live cycle.
  const DEV_FREEZE_TIME = 12; // ← null = живое время; число (0-24) = заморозка
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
  // ─── Lines mode (L key) — shows drone paths + dims world ──────────────────────
  const [linesMode, setLinesMode] = useState(false);
  const linesModeRef = useRef(false);
  useEffect(() => { linesModeRef.current = linesMode; }, [linesMode]);
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

  // ─── Fighter / Hangar state ────────────────────────────────────────────────
  const [placedFighters,    setPlacedFighters]    = useState([]);
  // { id, hangarId, position:[x,y,z], target:[x,y,z]|null, state:'idle'|'flying' }
  const placedFightersRef = useRef([]);
  useEffect(() => { placedFightersRef.current = placedFighters; }, [placedFighters]);
  const [selectedFighterId, setSelectedFighterId] = useState(null);
  const selectedFighterIdRef = useRef(null);
  useEffect(() => { selectedFighterIdRef.current = selectedFighterId; }, [selectedFighterId]);

  // ─── Object HP — declared BEFORE useCitySync so it can be persisted ─────────
  const objectHpRef = useRef({});   // { [id]: { current, max } } for buildings + fighters
  const [objectHp, setObjectHp] = useState({});
  useEffect(() => { objectHpRef.current = objectHp; }, [objectHp]);

  // ─── Enemy building HP — persisted so destroyed buildings survive page reload ─
  const enemyBuildingHpRef = useRef({});
  const [enemyBuildingHp, setEnemyBuildingHp] = useState({});
  useEffect(() => { enemyBuildingHpRef.current = enemyBuildingHp; }, [enemyBuildingHp]);

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
        if (typeof u?.username === 'string') setUsername(u.username);
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
    droneRouteLevelsRef,
    setDroneRouteLevels,
    ingotsRef,
    setIngots,
    placedWallsRef,
    setPlacedWalls,
    placedTowersRef,
    setPlacedTowers,
    placedFightersRef,
    setPlacedFighters,
    objectHpRef,
    setObjectHp,
    enemyBuildingHpRef,
    setEnemyBuildingHp,
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

  // Potential production — time-independent, shown in info panel
  const allEnergyTotals = useMemo(() => {
    const t = {};
    for (const item of placedItems) {
      for (const prod of getProductions(item.type)) {
        t[prod.type] = (t[prod.type] ?? 0) + prod.ratePerHour;
      }
    }
    return t;
  }, [placedItems]);

  // Actual stored amounts summed across all buildings per resource key
  const storedCurrentTotals = useMemo(() => {
    const t = {};
    for (const v of Object.values(storedAmounts)) {
      if (!v) continue;
      for (const [key, val] of Object.entries(v)) {
        if (typeof val === 'number' && val > 0) t[key] = (t[key] ?? 0) + val;
      }
    }
    return t;
  }, [storedAmounts]);

  // Per-ore-type mining rate (ед./ч) summed across all active extractors
  const oreRates = useMemo(() => {
    const rates = {};
    for (const item of placedItems) {
      if (item.type !== 'extractor' || !item.oreType) continue;
      const lvl  = buildingLevels[String(item.id)] ?? 1;
      if (!canMineOre(lvl, item.oreType)) continue;
      const conf = getLevelConfig('extractor', lvl);
      const rate = 3 * (conf?.rateMultiplier ?? 1.0);
      rates[item.oreType] = (rates[item.oreType] ?? 0) + rate;
    }
    return rates;
  }, [placedItems, buildingLevels]);

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
      const convRates = calcConveyorRates(
        placedItemsRef.current,
        conveyorsRef.current,
        buildingLevelsRef.current,
        droneRouteLevelsRef.current,
      );

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

      // ─── Pump extraction: fill internal water buffer ──────────────────────────
      for (const item of placedItemsRef.current) {
        if (item.type !== 'pump') continue;
        const key  = String(item.id);
        const lvl  = buildingLevelsRef.current[key] ?? 1;
        const conf = getLevelConfig('pump', lvl);
        const rate = 20 * (conf?.rateMultiplier ?? 1.0); // л/ч (matches base drone carry rate)
        const cap  = 50; // internal buffer capacity (л)
        if (!next[key]) next[key] = {};
        next[key].water = Math.min((next[key].water ?? 0) + rate * deltaGameHours, cap);
      }

      // ─── Coal Generator: consume ore → gate zone-based fuel production ────────────────
      // 4 ore/hr × mult consumed to produce 8 fuel/hr × mult
      // (ratio 1 ore → 2 fuel; coal-gen L1 needs 4 ore/hr, extractor L1 delivers 3 → 75% ok)
      const activeCoalGens = new Set();
      for (const item of placedItemsRef.current) {
        if (item.type !== 'coal-generator') continue;
        const key  = String(item.id);
        const lvl  = buildingLevelsRef.current[key] ?? 1;
        const conf = getLevelConfig('coal-generator', lvl);
        const mult = conf?.rateMultiplier ?? 1.0;
        // consume 4×mult ore/hr → the zone loop will produce 8×mult fuel/hr
        const oreNeeded = 4 * mult * deltaGameHours;
        if (!next[key]) next[key] = {};
        const oreAvail = next[key].ore ?? 0;
        if (oreAvail >= oreNeeded) {
          next[key].ore = oreAvail - oreNeeded;
          activeCoalGens.add(item.id);
        }
        // if not enough ore: coal-gen stays inactive this tick (zone won't fire)
      }

      // ─── Steam Generator: consume ore+water → produce steam ─────────────────
      for (const item of placedItemsRef.current) {
        if (item.type !== 'steam-generator') continue;
        const key   = String(item.id);
        const lvl   = buildingLevelsRef.current[key] ?? 1;
        const conf  = getLevelConfig('steam-generator', lvl);
        const mult  = conf?.rateMultiplier ?? 1.0;
        const oreNeeded   = 2 * mult * deltaGameHours;
        const waterNeeded = 1 * mult * deltaGameHours;
        if (!next[key]) next[key] = {};
        const oreAvail   = next[key].ore   ?? 0;
        const waterAvail = next[key].water ?? 0;
        if (oreAvail < oreNeeded || waterAvail < waterNeeded) continue;
        next[key].ore   = oreAvail   - oreNeeded;
        next[key].water = waterAvail - waterNeeded;
        next[key].steam = Math.min((next[key].steam ?? 0) + mult * deltaGameHours, 50);
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
        // Coal-gen only produces when it has consumed enough ore this tick
        if (producer.type === 'coal-generator' && !activeCoalGens.has(producer.id)) continue;
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

  // ─── Fighter control handlers ─────────────────────────────────────────────
  const handleFighterSelect = useCallback((id) => {
    setSelectedFighterId(prev => (prev === id ? null : id));
    // Deselect any placed building when a fighter is selected
    if (id != null) setSelectedPlacedId(null);
  }, []); // eslint-disable-line

  const handleFighterUpdatePos = useCallback((id, newPos, newState, newTarget) => {
    setPlacedFighters(prev => prev.map(f =>
      f.id === id
        ? { ...f, position: newPos, state: newState ?? f.state, target: newTarget !== undefined ? newTarget : f.target }
        : f
    ));
  }, []);

  const handleGroundFighterTarget = useCallback((x, z) => {
    const fid = selectedFighterIdRef.current;
    if (!fid) return;
    const TARGET_FLY_Y = 0;
    setPlacedFighters(prev => prev.map(f =>
      f.id === fid
        // Clear attackTarget when giving a movement order
        ? { ...f, target: [x, TARGET_FLY_Y, z], state: 'flying', attackTarget: null }
        : f
    ));
  }, []);

  const handleSetAttackTarget = useCallback((fighterId, targetId, targetPos) => {
    setPlacedFighters(prev => {
      const next = prev.map(f =>
        f.id === fighterId
          ? { ...f, attackTarget: { id: targetId, position: targetPos } }
          : f
      );
      placedFightersRef.current = next;
      return next;
    });
  }, []);

  const handleEnemyHpChange = useCallback((compositeId, current, max) => {
    setEnemyBuildingHp(prev => {
      const next = { ...prev, [compositeId]: { current, max } };
      enemyBuildingHpRef.current = next;
      return next;
    });
  }, []);

  const handleEnemyBuildingDestroyed = useCallback((compositeId) => {
    // Clear attackTarget on any fighter that was targeting this building
    setPlacedFighters(prev => {
      const changed = prev.some(f => f.attackTarget?.id === compositeId);
      if (!changed) return prev;
      const next = prev.map(f =>
        f.attackTarget?.id === compositeId ? { ...f, attackTarget: null } : f
      );
      placedFightersRef.current = next;
      return next;
    });
  }, []);

  const handleOrderFighter = useCallback((hangarId, hangarPos, hangarLevel) => {
    const cost = HANGAR_CONFIG.fighterCoinCost;

    // Check coin balance
    const totalCoins = Object.values(storedAmountsRef.current).reduce((s, v) => s + (v?.coins ?? 0), 0);
    if (totalCoins < cost) { alert(`Нужно ${cost} монет для заказа истребителя! (у вас ${Math.floor(totalCoins)})`); return; }

    // Check slot limit
    const maxSlots = HANGAR_CONFIG.maxFightersPerLevel[Math.min(hangarLevel, 3) - 1] ?? 1;
    const existing = placedFightersRef.current.filter(f => f.hangarId === hangarId).length;
    if (existing >= maxSlots) { alert('Все слоты ангара заняты!'); return; }

    // Deduct coins
    if (cost > 0) {
      let remaining = cost;
      const next = { ...storedAmountsRef.current };
      for (const sid of Object.keys(next)) {
        if (remaining <= 0) break;
        const c = next[sid]?.coins ?? 0;
        if (c > 0) { const take = Math.min(c, remaining); next[sid] = { ...next[sid], coins: c - take }; remaining -= take; }
      }
      storedAmountsRef.current = next;
      setStoredAmounts({ ...next });
    }

    // Spawn fighter on platform next to hangar
    const slotIndex = existing;
    const platformX = (hangarPos[0] ?? 0) + HANGAR_CONFIG.platformOffsetX;
    const offsetZ   = (slotIndex - (maxSlots - 1) / 2) * 5;
    const spawnPos  = [platformX, 0, (hangarPos[2] ?? 0) + offsetZ];

    const newFighterId = Date.now();
    const newFighter = {
      id:       newFighterId,
      hangarId,
      position: spawnPos,
      target:   null,
      state:    'idle',
      level:    1,
    };
    // Give fighter initial HP
    const fighterHpEntry = initFighterHp();
    setObjectHp(prev => {
      const next = { ...prev, [newFighterId]: fighterHpEntry };
      objectHpRef.current = next;
      return next;
    });
    setPlacedFighters(prev => {
      const next = [...prev, newFighter];
      placedFightersRef.current = next;
      return next;
    });
  }, []); // eslint-disable-line

  // ─── Fighter upgrade handler ──────────────────────────────────────────────
  const handleUpgradeFighter = useCallback((fighterId) => {
    const fighter = placedFightersRef.current.find(f => f.id === fighterId);
    if (!fighter) return;
    const currentLevel = fighter.level ?? 1;
    const cost = FIGHTER_UPGRADE_COSTS[currentLevel];
    if (!cost) return; // already max level

    // Check concurrent limit
    const activeCount = Object.keys(upgradingDronesRef.current).length;
    if (activeCount >= 5) { alert('Достигнут лимит одновременных улучшений (5)!'); return; }
    if (upgradingDronesRef.current[fighterId]) return; // already upgrading

    // Check coins
    const totalCoins = Object.values(storedAmountsRef.current).reduce((s, v) => s + (v?.coins ?? 0), 0);
    if (totalCoins < cost.coins) { alert(`Нужно ${cost.coins} монет для улучшения!`); return; }
    // Check ingots
    if ((ingotsRef.current.iron ?? 0) < (cost.iron ?? 0)) { alert(`Нужно ${cost.iron} железных слитков!`); return; }
    if ((ingotsRef.current.silver ?? 0) < (cost.silver ?? 0)) { alert(`Нужно ${cost.silver} серебряных слитков!`); return; }

    // Deduct coins
    if (cost.coins > 0) {
      let remaining = cost.coins;
      const next = { ...storedAmountsRef.current };
      for (const sid of Object.keys(next)) {
        if (remaining <= 0) break;
        const c = next[sid]?.coins ?? 0;
        if (c > 0) { const take = Math.min(c, remaining); next[sid] = { ...next[sid], coins: c - take }; remaining -= take; }
      }
      storedAmountsRef.current = next;
      setStoredAmounts({ ...next });
    }
    // Deduct ingots
    setIngots(prev => {
      const next = {
        ...prev,
        iron:   (prev.iron   ?? 0) - (cost.iron   ?? 0),
        silver: (prev.silver ?? 0) - (cost.silver ?? 0),
        copper: (prev.copper ?? 0) - (cost.copper ?? 0),
      };
      ingotsRef.current = next;
      return next;
    });

    const UPGRADE_DURATION_MS = 30_000;
    const entry = { startMs: Date.now(), durationMs: UPGRADE_DURATION_MS, targetLevel: currentLevel + 1 };
    upgradingDronesRef.current = { ...upgradingDronesRef.current, [fighterId]: entry };
    setUpgradingDrones({ ...upgradingDronesRef.current });
  }, []); // eslint-disable-line

  // ─── Lab factory recipe setter ────────────────────────────────────────────
  const handleSetLabRecipe = useCallback((itemId, recipe) => {
    setPlacedItems(prev => {
      const next = prev.map(i => i.id === itemId ? { ...i, labRecipe: recipe } : i);
      placedItemsRef.current = next;
      return next;
    });
  }, []); // eslint-disable-line

  // ─── Drone route upgrade handler ──────────────────────────────────────────
  const handleUpgradeDroneRoute = useCallback((droneId) => {
    const currentLevel = droneRouteLevelsRef.current[droneId] ?? 1;
    const cost = DRONE_ROUTE_UPGRADE_COSTS[currentLevel];
    if (!cost) return;

    const activeCount = Object.keys(upgradingDronesRef.current).length;
    if (activeCount >= 5) { alert('Достигнут лимит одновременных улучшений (5)!'); return; }
    if (upgradingDronesRef.current[droneId]) return;

    const totalCoins = Object.values(storedAmountsRef.current).reduce((s, v) => s + (v?.coins ?? 0), 0);
    if (totalCoins < cost.coins) { alert(`Нужно ${cost.coins} монет для улучшения!`); return; }
    if ((ingotsRef.current.iron ?? 0) < (cost.iron ?? 0)) { alert(`Нужно ${cost.iron} железных слитков!`); return; }
    if ((ingotsRef.current.silver ?? 0) < (cost.silver ?? 0)) { alert(`Нужно ${cost.silver} серебряных слитков!`); return; }

    if (cost.coins > 0) {
      let remaining = cost.coins;
      const next = { ...storedAmountsRef.current };
      for (const sid of Object.keys(next)) {
        if (remaining <= 0) break;
        const c = next[sid]?.coins ?? 0;
        if (c > 0) { const take = Math.min(c, remaining); next[sid] = { ...next[sid], coins: c - take }; remaining -= take; }
      }
      storedAmountsRef.current = next;
      setStoredAmounts({ ...next });
    }
    setIngots(prev => {
      const next = {
        ...prev,
        iron:   (prev.iron   ?? 0) - (cost.iron   ?? 0),
        silver: (prev.silver ?? 0) - (cost.silver ?? 0),
      };
      ingotsRef.current = next;
      return next;
    });

    const entry = { startMs: Date.now(), durationMs: 30_000, targetLevel: currentLevel + 1, kind: 'route' };
    upgradingDronesRef.current = { ...upgradingDronesRef.current, [droneId]: entry };
    setUpgradingDrones({ ...upgradingDronesRef.current });
  }, []); // eslint-disable-line

  // ─── Upgrade completion interval ─────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const upgrading = upgradingDronesRef.current;
      const now = Date.now();
      const completed = Object.entries(upgrading).filter(([, v]) => now >= v.startMs + v.durationMs);
      if (!completed.length) return;
      const nextUpgrading = { ...upgrading };
      for (const [fid, v] of completed) {
        const numId = Number(fid);
        delete nextUpgrading[numId];
        if (v.kind === 'route') {
          setDroneRouteLevels(prev => {
            const next = { ...prev, [numId]: v.targetLevel };
            droneRouteLevelsRef.current = next;
            return next;
          });
        } else {
          setPlacedFighters(prev => {
            const next = prev.map(f => f.id === numId ? { ...f, level: v.targetLevel } : f);
            placedFightersRef.current = next;
            return next;
          });
        }
      }
      upgradingDronesRef.current = nextUpgrading;
      setUpgradingDrones({ ...nextUpgrading });
    }, 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  // ─── Lab factory production interval ─────────────────────────────────────
  // Every 10 s each lab-factory with a chosen recipe consumes ORE_PER_INGOT
  // units of ore from its internal buffer and outputs 1 ingot of the recipe type.
  const ORE_PER_INGOT = 5;
  const LAB_PRODUCTION_MS = 10_000;
  useEffect(() => {
    const id = setInterval(() => {
      const labs = placedItemsRef.current.filter(i => i.type === 'lab-factory' && i.labRecipe);
      if (!labs.length) return;

      const ingotsToAdd = {};
      const oreToConsume = {}; // labId → amount to drain from its ore buffer

      for (const lab of labs) {
        const key   = String(lab.id);
        const avail = storedAmountsRef.current[key]?.ore ?? 0;
        const lvl   = buildingLevelsRef.current[key] ?? 1;
        const rate  = Math.round(getLevelConfig('lab-factory', lvl)?.rateMultiplier ?? 1);
        if (avail < ORE_PER_INGOT) continue; // not enough ore — skip this tick
        // Produce as many ingots as ore allows, up to the level's rate cap
        const actualRate = Math.min(rate, Math.floor(avail / ORE_PER_INGOT));
        ingotsToAdd[lab.labRecipe] = (ingotsToAdd[lab.labRecipe] ?? 0) + actualRate;
        oreToConsume[key] = (oreToConsume[key] ?? 0) + actualRate * ORE_PER_INGOT;
      }

      if (Object.keys(oreToConsume).length === 0) return;

      // Drain ore from lab buffers
      const nextStored = { ...storedAmountsRef.current };
      for (const [key, amount] of Object.entries(oreToConsume)) {
        nextStored[key] = { ...nextStored[key], ore: (nextStored[key]?.ore ?? 0) - amount };
      }
      storedAmountsRef.current = nextStored;
      setStoredAmounts({ ...nextStored });

      // Credit ingots
      setIngots(prev => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(ingotsToAdd)) next[k] = (next[k] ?? 0) + v;
        ingotsRef.current = next;
        return next;
      });
    }, LAB_PRODUCTION_MS);
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  // ─── HP / Damage handlers ─────────────────────────────────────────────────
  const handleBuildingDamage = useCallback((impactPos) => {
    const hit = findNearestDamageable(
      impactPos,
      placedItemsRef.current,
      placedFightersRef.current,
      14,
    );
    if (!hit) return;
    setObjectHp(prev => {
      const current = prev[hit.id];
      // If no HP entry yet, initialise from item type
      let hpObj = current;
      if (!hpObj) {
        if (hit.type === 'fighter') {
          hpObj = initFighterHp();
        } else {
          const item = placedItemsRef.current.find(i => i.id === hit.id);
          hpObj = initHp(item?.type ?? 'unknown');
        }
      }
      const updated = applyDamage(hpObj, MISSILE_DAMAGE);
      const next = { ...prev, [hit.id]: updated };
      objectHpRef.current = next;
      return next;
    });
  }, []);

  const handleRepairObject = useCallback(async (itemId, itemType) => {
    const hpObj = objectHpRef.current[itemId];
    if (!hpObj) return;
    const cost = repairCost(hpObj);
    if (cost <= 0) return;
    if (userPointsRef.current < cost) {
      alert(`Нужно ${cost} баллов для восстановления! (у вас ${Math.floor(userPointsRef.current)})`);
      return;
    }
    // Deduct points via backend
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/points/spend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ amount: cost, reason: `city_repair_${itemType ?? 'object'}` }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setUserPoints(data.newBalance);
      userPointsRef.current = data.newBalance;
    } catch {
      return;
    }
    // Restore full HP
    setObjectHp(prev => {
      const entry = prev[itemId];
      if (!entry) return prev;
      const next = { ...prev, [itemId]: { ...entry, current: entry.max } };
      objectHpRef.current = next;
      return next;
    });
    setContextMenu(null);
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

    // Find idle builder house to spawn a runner drone from
    const targetItem  = placedItemsRef.current.find(i => i.id === itemId);
    const toP         = targetItem?.position ?? [0, 0, 0];
    const housePos    = findIdleBuilderHousePos(
      placedItemsRef.current, buildingLevelsRef.current,
      constructingBuildingsRef.current, upgradingBuildingsRef.current,
    );
    // Travel time = liftoff (1 s) + distance-based flight
    const dist     = housePos ? Math.hypot(toP[0] - housePos[0], toP[2] - housePos[2]) : 0;
    const flightMs = Math.max(1500, Math.min(8000, Math.round((dist / 8) * 1000)));
    const travelMs = 1000 + flightMs;

    // Timed upgrade – timer starts only when drone arrives
    const durationMs = next.upgradeDurationMs ?? 15_000;
    const entry   = { startReal: Date.now() + travelMs, durationMs, targetLevel: currentLevel + 1 };
    const nb      = { ...upgradingBuildingsRef.current, [String(itemId)]: entry };
    upgradingBuildingsRef.current = nb;
    setUpgradingBuildings({ ...nb });

    // Spawn the runner drone
    if (housePos) {
      setMovingBuilders(prev => [...prev, {
        id:            `runner_upg_${itemId}_${Date.now()}`,
        itemId:        String(itemId),
        fromPos:       housePos,
        toPos:         [toP[0], toP[1] ?? 0, toP[2]],
        startReal:     Date.now(),
        durationMs:    flightMs,
        workDurationMs: durationMs,
      }]);
    }
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
      setMovingBuilders(prev => prev.filter(r => !completed.some(([bid]) => r.itemId === bid)));
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
    if (itemType === 'cable') {
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

  // ─── Add a drone route from the building modal ──────────────────────────────
  const handleAddDroneRoute = useCallback((fromId) => {
    setDroneMode(true);
    setDroneFromId(fromId);
    setContextMenu(null);
  }, []);

  // ─── Delete a drone route from the building modal ───────────────────────────
  const handleDeleteDrone = useCallback((droneId) => {
    setDrones(prev => prev.filter(d => d.id !== droneId));
  }, []);

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
      if (e.code === 'KeyM') { setMapFullscreen(v => !v); e.preventDefault(); return; }
      if (e.code === 'KeyL') {
        const exiting = linesModeRef.current;
        setLinesMode(v => !v);
        if (exiting) setSelectedPlacedId(null);
        e.preventDefault(); return;
      }
      if (e.code === 'Tab') { setTabOpen(true); e.preventDefault(); return; }
      e.preventDefault?.();
    };
    const up = (e) => {
      keysRef.current[e.code] = false;
      if (e.code === 'Tab') setTabOpen(false);
    };
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
            if (isColliding({ x: pos.x, z: pos.z }, type, placedItemsRef.current, placementRotYRef.current)) return;

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

              // ── Activate defense tower immediately on placement ──────────
              if (type === 'defense-tower') {
                const ns = { ...storedAmountsRef.current, [String(newId)]: { activatedAt: Date.now() } };
                storedAmountsRef.current = ns;
                setStoredAmounts({ ...ns });
              }

              // ── Start construction timer (skip for moved buildings) ──────
              if (!isMove) {
                const dur = CONSTRUCTION_DURATION_MS[type] ?? 0;
                if (dur > 0) {
                  const housePos  = findIdleBuilderHousePos(placedItemsRef.current, buildingLevelsRef.current, constructingBuildingsRef.current, upgradingBuildingsRef.current);
                  const cDist     = housePos ? Math.hypot(pos.x - housePos[0], pos.z - housePos[2]) : 0;
                  const cFlightMs = Math.max(1500, Math.min(8000, Math.round((cDist / 8) * 1000)));
                  const cTravelMs = 1000 + cFlightMs;
                  const entry = { startReal: Date.now() + cTravelMs, durationMs: dur };
                  const nb = { ...constructingBuildingsRef.current, [String(newId)]: entry };
                  constructingBuildingsRef.current = nb;
                  setConstructingBuildings({ ...nb });
                  // Spawn a moving builder runner from nearest builder house (drone arrives then work begins)
                  if (housePos) {
                    setMovingBuilders(prev => [...prev, { id: `runner_${newId}`, itemId: String(newId), fromPos: housePos, toPos: [pos.x, pos.y, pos.z], startReal: Date.now(), durationMs: cFlightMs, workDurationMs: dur }]);
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
        // Don't pan world camera when clicking inside map UI
        const isMapInput = !!e.target?.closest?.('[data-no-world-input]');
        // В режиме дронов и линий левый клик не запускает панорамирование камеры
        if (!droneModeRef.current && !linesModeRef.current && !isMapInput) {
          inputRef.current.middleDrag = true;
          inputRef.current.lastMX = e.clientX;
          inputRef.current.lastMY = e.clientY;
        }
        if (placedHitRef.current) {
          placedHitRef.current = false;
        } else if (!wallModeRef.current && !towerModeRef.current) {
          // Only deselect when clicking the actual WebGL canvas — not DOM UI overlays/buttons
          if (e.target && e.target.tagName === 'CANVAS' && !isMapInput) {
            setSelectedPlacedId(null);
          }
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
      if (e.target?.closest?.('[data-no-world-input]')) return;
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

    // ── Touch controls (mobile pan + pinch-zoom) ──────────────────────────
    let touchStartX = 0, touchStartY = 0, touchMoved = false;
    let prevPinchDist = 0, longPressTimer = null;

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        const t   = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchMoved  = false;
        const inp   = inputRef.current;
        inp.mouseX  = t.clientX;
        inp.mouseY  = t.clientY;
        inp.lastMX  = t.clientX;
        inp.lastMY  = t.clientY;
        // Long press (≥650 ms, no movement) → context menu like RMB
        longPressTimer = setTimeout(() => {
          if (!touchMoved && rightClickRef.current) {
            setContextMenu(rightClickRef.current);
            rightClickRef.current = null;
          }
        }, 650);
      } else if (e.touches.length === 2) {
        clearTimeout(longPressTimer);
        inputRef.current.middleDrag = false;
        const t1 = e.touches[0], t2 = e.touches[1];
        prevPinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      }
    };

    const onTouchMove = (e) => {
      const inp = inputRef.current;
      if (e.touches.length === 1) {
        const t = e.touches[0];
        if (!touchMoved) {
          const moved = Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY);
          if (moved > 8) {
            touchMoved = true;
            clearTimeout(longPressTimer);
            inp.middleDrag = true;
          }
        }
        if (inp.middleDrag) {
          inp.dragDeltaX += t.clientX - inp.lastMX;
          inp.dragDeltaY += t.clientY - inp.lastMY;
          e.preventDefault(); // stop page scroll while panning
        }
        inp.mouseX = t.clientX;
        inp.mouseY = t.clientY;
        inp.lastMX = t.clientX;
        inp.lastMY = t.clientY;
      } else if (e.touches.length === 2) {
        const t1 = e.touches[0], t2 = e.touches[1];
        const dist  = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const delta = prevPinchDist - dist; // positive = fingers closing = zoom in
        if (Math.abs(delta) > 1) {
          inp.wheelDelta += delta * 0.08;
          prevPinchDist   = dist;
        }
        e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      clearTimeout(longPressTimer);
      inputRef.current.middleDrag = false;
      // Keep mouseX/mouseY for placement preview until next interaction
      // Tap (touchMoved=false): browser will fire compat pointer/mouse events → R3F handles selection/placement
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false });
    el.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener('mousemove',   onMove);
      el.removeEventListener('mousedown',   onDown);
      el.removeEventListener('mouseup',     onUp);
      el.removeEventListener('mouseleave',  onLeave);
      el.removeEventListener('wheel',       onWheel);
      el.removeEventListener('contextmenu', onContext);
      el.removeEventListener('touchstart',  onTouchStart);
      el.removeEventListener('touchmove',   onTouchMove);
      el.removeEventListener('touchend',    onTouchEnd);
      clearTimeout(longPressTimer);
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
          dpr={[1, 2]}
          gl={{ antialias: true, powerPreference: 'high-performance', stencil: false }}
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
            droneRouteLevels={droneRouteLevels}
            droneMode={droneMode}
            droneFromId={droneFromId}
            onDroneRouteBuildingClick={handleDroneRouteBuildingClick}

            fpsRef={fpsRef}
            rendererStatsRef={rendererStatsRef}
            poweredIds={poweredIds}
            storedAmounts={storedAmounts}
            pointsAmounts={pointsAmounts}
            ingots={ingots}
            buildingLevels={buildingLevels}
            upgradingBuildings={upgradingBuildings}
            constructingBuildings={constructingBuildings}
            movingBuilders={movingBuilders}
            totalBuilders={countTotalBuilders(placedItems, buildingLevels)}
            freeBuilders={countFreeBuilders(placedItems, buildingLevels, constructingBuildings, upgradingBuildings)}
            onBuildingRightClick={handleBuildingRightClick}
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
            placedFighters={placedFighters}
            selectedFighterId={selectedFighterId}
            onFighterSelect={handleFighterSelect}
            onFighterUpdatePos={handleFighterUpdatePos}
            onGroundFighterTarget={handleGroundFighterTarget}
            onSetAttackTarget={handleSetAttackTarget}
            onEnemyBuildingDestroyed={handleEnemyBuildingDestroyed}
            enemyBuildingHp={enemyBuildingHp}
            onEnemyHpChange={handleEnemyHpChange}
            objectHp={objectHp}
            onBuildingDamage={handleBuildingDamage}
            linesMode={linesMode}
          />
          <WaypointMarkers waypoints={waypoints} screenPosRef={waypointScreenPosRef} />
        </Canvas>

        <WaypointEdgeArrows
          screenPosRef={waypointScreenPosRef}
          wrapRef={canvasWrapRef}
          onJump={(x, z) => { camTargetRef.current = { x, z }; }}
        />

        <MiniMap
          placedItems={placedItems}
          otherPlayers={otherPlayers}
          placedFighters={placedFighters}
          enemyBuildingHp={enemyBuildingHp}
          camTargetRef={camTargetRef}
          camStateRef={camStateRef}
          onJump={(x, z) => { camTargetRef.current = { x, z }; }}
          waypoints={waypoints}
          onAddWaypoint={addWaypoint}
          onRemoveWaypoint={removeWaypoint}
          fullscreen={mapFullscreen}
          onToggleFullscreen={() => setMapFullscreen(v => !v)}
          ownUsername={username}
        />

        {/* ── Tab overlay: online players ── */}
        {tabOpen && (
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 400,
            background: 'rgba(10,20,35,0.92)',
            border: '1.5px solid rgba(148,163,184,0.25)',
            borderRadius: 12,
            boxShadow: '0 0 60px rgba(0,0,0,0.9)',
            backdropFilter: 'blur(8px)',
            minWidth: 320, maxWidth: 440,
            padding: '18px 24px',
            pointerEvents: 'none',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 14 }}>
              ИГРОКИ ОНЛАЙН — {otherPlayers.length + 1}
            </div>
            {/* Own row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                          borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#22d3ee',
                             boxShadow: '0 0 6px #22d3ee', flexShrink: 0 }} />
              <span style={{ color: '#22d3ee', fontSize: 15, fontWeight: 700, flex: 1 }}>
                {username || 'Вы'}
              </span>
              <span style={{ fontSize: 11, color: '#64748b' }}>Вы</span>
            </div>
            {otherPlayers.map((p, i) => (
              <div key={p.userId} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                borderBottom: i < otherPlayers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ef4444',
                               boxShadow: '0 0 6px #ef4444', flexShrink: 0 }} />
                <span style={{ color: '#f8a3a3', fontSize: 14, fontWeight: 500, flex: 1 }}>
                  {p.username ?? `#${p.userId}`}
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  {(p.placedItems ?? []).length} зд.
                </span>
              </div>
            ))}
            <div style={{ marginTop: 12, fontSize: 10, color: '#374151', textAlign: 'center' }}>
              Отпустите Tab чтобы закрыть
            </div>
          </div>
        )}

        {linesMode && (
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(2, 11, 24, 0.85)',
            border: '1px solid rgba(56, 189, 248, 0.45)',
            borderRadius: 8, padding: '5px 18px',
            color: '#38bdf8', fontSize: 12, fontWeight: 700,
            letterSpacing: '0.07em', pointerEvents: 'none', zIndex: 50,
            userSelect: 'none', whiteSpace: 'nowrap',
          }}>
            МАРШРУТЫ ДРОНОВ
            <span style={{ color: '#94a3b8', fontWeight: 400 }}>
              &nbsp;·&nbsp; нажмите на здание для фокуса&nbsp;·&nbsp;
            </span>
            [L] выйти
          </div>
        )}
        <HUD
          pos={displayPos}
          zoom={displayZoom}
          selectedCount={selectedCount}
          onClearSelection={clearSelection}
          onShop={() => setShopOpen(true)}
          onDrones={() => setDronePanelOpen(true)}
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
          onStartPlacing={startPlacing}
          coinBalance={Object.values(storedAmounts).reduce((s, v) => s + (v?.coins ?? 0), 0)}
          freeBuilders={countFreeBuilders(placedItems, buildingLevels, constructingBuildings, upgradingBuildings)}
          totalBuilders={countTotalBuilders(placedItems, buildingLevels)}
          constructingCount={Object.keys(constructingBuildings).length}
          upgradingCount={Object.keys(upgradingBuildings).length}
          userPoints={userPoints}
          allEnergyTotals={allEnergyTotals}
          storedCurrentTotals={storedCurrentTotals}
          points={Object.values(pointsAmounts).reduce((s, v) => s + v, 0)}
          ingots={ingots}
          oreRates={oreRates}
        />
        {dronePanelOpen && (
          <DronePanel
            drones={drones}
            placedItems={placedItems}
            buildingLevels={buildingLevels}
            droneRouteLevels={droneRouteLevels}
            ingots={ingots}
            coinBalance={Object.values(storedAmounts).reduce((s, v) => s + (v?.coins ?? 0), 0)}
            upgradingDrones={upgradingDrones}
            onUpgrade={handleUpgradeDroneRoute}
            onClose={() => setDronePanelOpen(false)}
          />
        )}
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
              itemId={itemId}
              itemType={itemType}
              itemLevel={ctxItemLevel}
              totalPoints={userPoints}
              userXp={userXp}
              freeBuilders={countFreeBuilders(placedItems, buildingLevels, constructingBuildings, upgradingBuildings)}
              drones={drones}
              placedItems={placedItems}
              onSell={handleSell}
              onMove={handleMove}
              onUpgrade={handleUpgrade}
              onClose={() => setContextMenu(null)}
              onAddDroneRoute={handleAddDroneRoute}
              onDeleteDrone={handleDeleteDrone}
              upgradeInfo={upgradingBuildings[String(itemId)] ?? null}
              coinUpgradeNext={coinUpgradeNext}
              hp={objectHp[itemId] ?? null}
              onRepair={handleRepairObject}
              labRecipe={itemType === 'lab-factory' ? (placedItems.find(i => i.id === itemId)?.labRecipe ?? null) : null}
              onSetRecipe={(r) => { handleSetLabRecipe(itemId, r); setContextMenu(null); }}
              labOreAmount={itemType === 'lab-factory' ? (storedAmounts[String(itemId)]?.ore ?? 0) : undefined}
              labIngots={itemType === 'lab-factory' ? ingots : undefined}
              orePerIngot={ORE_PER_INGOT}
              labProductionMs={LAB_PRODUCTION_MS}
            />
          );
        })()}

        {worldLoading && (
          <div className={styles.worldLoading}>
            <div className={styles.worldLoadingSpinner} />
            <span>Загрузка мира…</span>
          </div>
        )}

        {/* ── Hangar Modal (LMB click on hangar) ─────────────────────────── */}
        {selectedPlacedId && (() => {
          const hangar = placedItems.find(i => i.id === selectedPlacedId);
          if (!hangar || hangar.type !== 'hangar') return null;
          const hangarId    = hangar.id;
          const hangarLevel = buildingLevels[String(hangarId)] ?? 1;
          const maxF        = HANGAR_CONFIG.maxFightersPerLevel[Math.min(hangarLevel, 3) - 1] ?? 1;
          const myFighters  = placedFighters.filter(f => f.hangarId === hangarId);
          const coinBal     = Object.values(storedAmounts).reduce((s, v) => s + (v?.coins ?? 0), 0);
          const canOrder    = myFighters.length < maxF && coinBal >= HANGAR_CONFIG.fighterCoinCost;

          return (
            <div
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.65)',
                zIndex: 3001,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseDown={() => setSelectedPlacedId(null)}
            >
              <div
                style={{
                  background: 'rgba(10,15,28,0.98)',
                  border: '1px solid rgba(99,102,241,0.45)',
                  borderRadius: 16,
                  boxShadow: '0 12px 60px rgba(0,0,0,0.8)',
                  width: 420,
                  maxWidth: 'calc(100vw - 32px)',
                  fontFamily: 'monospace',
                  color: '#e2e8f0',
                  overflow: 'hidden',
                }}
                onMouseDown={e => e.stopPropagation()}
              >
                {/* Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 18px',
                  borderBottom: '1px solid rgba(99,102,241,0.3)',
                  background: 'linear-gradient(90deg, rgba(99,102,241,0.12), transparent)',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(99,102,241,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#818cf8', fontSize: 18,
                  }}>✈</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>
                      Военный ангар
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
                      Уровень {hangarLevel} · Слотов: {myFighters.length}/{maxF} · 🪙 {Math.floor(coinBal)} монет
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPlacedId(null)}
                    style={{
                      marginLeft: 'auto',
                      background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                      borderRadius: 6, width: 28, height: 28, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#64748b', fontSize: 13,
                    }}
                  >✕</button>
                </div>

                {/* Fighter slots */}
                <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Array.from({ length: maxF }).map((_, i) => {
                    const f = myFighters[i];
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: f ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${f ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      }}>
                        <div style={{ fontSize: 22 }}>✈</div>
                        <div style={{ flex: 1 }}>
                          {f ? (
                            <>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#c7d2fe' }}>
                                Истребитель #{i + 1}
                              </div>
                              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                                {f.state === 'flying' ? '🔵 Летит к цели' : '🟢 На платформе'}
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: 11, color: '#475569' }}>
                              Слот пустой
                            </div>
                          )}
                        </div>
                        {!f && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOrderFighter(hangarId, hangar.position, hangarLevel);
                            }}
                            style={{
                              padding: '6px 14px',
                              background: 'rgba(99,102,241,0.25)',
                              border: '1px solid rgba(99,102,241,0.5)',
                              borderRadius: 8, cursor: 'pointer',
                              color: '#c7d2fe',
                              fontSize: 11, fontWeight: 700,
                              display: 'flex', alignItems: 'center', gap: 6,
                            }}
                          >
                            ✈ Заказать
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Hint */}
                  <div style={{
                    marginTop: 4, padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(34,211,238,0.05)',
                    border: '1px solid rgba(34,211,238,0.15)',
                    fontSize: 10, color: '#94a3b8', lineHeight: 1.6,
                  }}>
                    💡 ЛКМ на истребителя — выделить · ПКМ на землю — задать цель полёта
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {offlineToast && (
          <div className={styles.offlineToast}>
            🕒 Пока вас не было: прошло <strong>{offlineHours.toFixed(1)} игр. ч.</strong>
          </div>
        )}

        {/* ── Mobile: camera rotate buttons (hidden on desktop via CSS) ── */}
        <div className={styles.mobileRotate}>
          <button
            className={styles.mobileRotBtn}
            onPointerDown={() => { keysRef.current['KeyQ'] = true; }}
            onPointerUp={() => { keysRef.current['KeyQ'] = false; }}
            onPointerLeave={() => { keysRef.current['KeyQ'] = false; }}
          >↺</button>
          <button
            className={styles.mobileRotBtn}
            onPointerDown={() => { keysRef.current['KeyE'] = true; }}
            onPointerUp={() => { keysRef.current['KeyE'] = false; }}
            onPointerLeave={() => { keysRef.current['KeyE'] = false; }}
          >↻</button>
        </div>
      </div>
    </CityContext.Provider>
  );
}
