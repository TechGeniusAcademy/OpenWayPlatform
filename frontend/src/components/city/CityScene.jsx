import { useMemo, memo, useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { DynamicEnvironment } from './DynamicEnvironment.jsx';
import { World } from './WorldChunks.jsx';
import { RTSCamera } from './RTSCamera.jsx';
import { Drone } from './Drone.jsx';
import { SolarPanelPreview, SolarPanelPlaced } from './buildings/SolarPanel.jsx';
import { MoneyFactoryPreview, MoneyFactoryPlaced } from './buildings/MoneyFactory.jsx';
import { EnergyStoragePreview, EnergyStoragePlaced } from './buildings/EnergyStorage.jsx';
import { TownHallPreview, TownHallPlaced } from './buildings/TownHall.jsx';
import { StreetLampPreview, StreetLampPlaced } from './buildings/StreetLamp.jsx';
import { ExtractorPreview, ExtractorPlaced } from './buildings/Extractor.jsx';
import { BuilderHousePreview, BuilderHousePlaced, BuilderAtWork, BuilderRunner, UpgradeBadgeInline } from './buildings/BuilderHouse.jsx';
import { CoalGeneratorPreview, CoalGeneratorPlaced } from './buildings/CoalGenerator.jsx';
import { HangarPreview, HangarPlaced } from './buildings/Hangar.jsx';
import { FighterUnit } from './buildings/FighterUnit.jsx';
import { Missile, Explosion } from './buildings/FighterAttack.jsx';
import { ConveyorTargetPulse } from './ConveyorTargetPulse.jsx';
import { ConstructionSite } from './ConstructionSite.jsx';
import { calcConveyorRates } from '../systems/connectionRates.js';
import { WallSegment, WallPlacementPreview, SnapIndicator } from './buildings/Wall.jsx';
import { TowerPlaced, TowerPreview } from './buildings/Tower.jsx';
import { OtherPlayerCity } from './OtherPlayerCity.jsx';
import { LampLightPool } from './LampLightPool.jsx';
import * as THREE from 'three';

// ─── Fighter target marker — pulsing cyan rings + crosshair at RMB click point ──
function FighterTargetMarker({ position }) {
  const ring1Ref  = useRef();
  const ring2Ref  = useRef();
  const cross1Ref = useRef();
  const cross2Ref = useRef();
  const spawnRef  = useRef(null);

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    if (spawnRef.current === null) spawnRef.current = now;
    const age  = now - spawnRef.current;
    const LIFE = 2.2;
    const fade = Math.max(0, 1 - age / LIFE);
    const show = fade > 0;
    const pulse = 1 + Math.sin(now * 9) * 0.14;

    if (ring1Ref.current) {
      ring1Ref.current.visible = show;
      ring1Ref.current.scale.setScalar(pulse);
      ring1Ref.current.material.opacity = 0.85 * fade;
    }
    if (ring2Ref.current) {
      ring2Ref.current.visible = show;
      ring2Ref.current.scale.setScalar(2.0 - pulse * 0.45);
      ring2Ref.current.material.opacity = 0.35 * fade;
    }
    if (cross1Ref.current) {
      cross1Ref.current.visible = show;
      cross1Ref.current.material.opacity = 0.6 * fade;
    }
    if (cross2Ref.current) {
      cross2Ref.current.visible = show;
      cross2Ref.current.material.opacity = 0.6 * fade;
    }
  });

  return (
    <group position={[position[0], 0.1, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Inner pulsing ring */}
      <mesh ref={ring1Ref}>
        <ringGeometry args={[0.7, 1.15, 32]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.85} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Outer counter-pulsing ring */}
      <mesh ref={ring2Ref}>
        <ringGeometry args={[1.55, 2.1, 32]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Crosshair — vertical bar */}
      <mesh ref={cross1Ref}>
        <planeGeometry args={[0.18, 2.6]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Crosshair — horizontal bar */}
      <mesh ref={cross2Ref} rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[0.18, 2.6]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

// Ref-driven cursor ring: shows where the next wall point will snap (green = start, amber = end)
function WallCursorRing({ cursorRef, hasStart }) {
  const meshRef  = useRef();
  const frameRef = useRef(0);
  const GRID = 2;
  useFrame(({ clock }) => {
    if (++frameRef.current % 2 !== 0) return;
    const mesh = meshRef.current;
    if (!mesh) return;
    if (!cursorRef?.current) { mesh.visible = false; return; }
    const { x, z } = cursorRef.current;
    mesh.visible = true;
    mesh.position.set(Math.round(x / GRID) * GRID, 0.12, Math.round(z / GRID) * GRID);
    mesh.material.opacity = 0.4 + Math.sin(clock.getElapsedTime() * 6) * 0.3;
    mesh.material.color.set(hasStart ? '#fbbf24' : '#4ade80');
  });
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.55, 0.85, 16]} />
      <meshBasicMaterial color="#4ade80" transparent opacity={0.7} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── FPS + renderer stats sampler (inside Canvas, writes to refs every 0.5 s) ──
function FpsMonitor({ fpsRef, rendererStatsRef }) {
  const { gl } = useThree();
  const countRef = useRef(0);
  const t0Ref    = useRef(performance.now());
  useFrame(() => {
    countRef.current++;
    const now     = performance.now();
    const elapsed = now - t0Ref.current;
    if (elapsed < 500) return;
    if (fpsRef)          fpsRef.current = Math.round(countRef.current * 1000 / elapsed);
    if (rendererStatsRef) rendererStatsRef.current = {
      calls:      gl.info.render.calls,
      triangles:  gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      textures:   gl.info.memory.textures,
      programs:   gl.info.programs?.length ?? 0,
    };
    countRef.current = 0;
    t0Ref.current    = now;
  });
  return null;
}

// Pulsing amber ring shown on a building while it's being upgraded
function UpgradeRing({ position, radius = 3.2 }) {
  const meshRef  = useRef();
  const frameRef = useRef(0);
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    if (++frameRef.current % 2 !== 0) return;
    const t = (Math.sin(clock.getElapsedTime() * 3) + 1) / 2; // 0..1
    meshRef.current.material.opacity = 0.25 + t * 0.55;
    const s = 1 + t * 0.08;
    meshRef.current.scale.set(s, 1, s);
  });
  return (
    <mesh ref={meshRef} position={[position[0], (position[1] ?? 0) + 0.12, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.18, 5, 16]} />
      <meshBasicMaterial color="#fbbf24" transparent opacity={0.55} />
    </mesh>
  );
}

// Approximate half-sizes per building type for scaffolding fit
const BUILDING_HALF_SIZE = {
  'solar-panel':    { hw: 2.5, hh: 1.0 },
  'energy-storage': { hw: 3.0, hh: 3.5 },
  'street-lamp':    { hw: 0.8, hh: 2.5 },
  'money-factory':  { hw: 3.5, hh: 4.0 },
  'town-hall':      { hw: 4.5, hh: 6.0 },
  'extractor':      { hw: 2.5, hh: 3.0 },
  'splitter':       { hw: 2.0, hh: 2.0 },
  'merger':         { hw: 2.0, hh: 2.0 },
  'builder-house':  { hw: 3.5, hh: 4.0 },
  'coal-generator': { hw: 5.0, hh: 5.0 },
  'hangar':          { hw: 8.0, hh: 6.0 },
};

// ─── View-distance culling radii ─────────────────────────────────────────────
const SELF_RENDER_R  = 350; // own objects hidden >350 world-units from camera ground-target
const OTHER_RENDER_R = 320; // other-player cities skip render when this far away

function SceneInner({
  camTargetRef,
  camStateRef,
  keysRef,
  inputRef,
  placingItem,
  placedItems,
  placementPosRef,
  placementRotYRef,
  selectedPlacedId,
  setSelectedPlacedId,
  gameTimeRef,
  drones,
  droneMode,
  droneFromId,
  onDroneRouteBuildingClick,
  poweredIds,
  storedAmounts,
  pointsAmounts,
  buildingLevels,
  upgradingBuildings,
  constructingBuildings,
  movingBuilders,
  totalBuilders,
  freeBuilders,
  onBuildingRightClick,
  // Wall / Tower
  placedWalls,
  placedTowers,
  wallMode,
  towerMode,
  wallFromPoint,
  wallCursorRef,
  onWallGroundClick,
  onTowerGroundClick,
  onWallRightClick,
  onTowerRightClick,
  otherPlayers,
  // Fighters
  placedFighters,
  selectedFighterId,
  onFighterSelect,
  onFighterUpdatePos,
  onGroundFighterTarget,
  // Performance
  fpsRef,
  rendererStatsRef,
}) {
  // ── Enemy building positions for fighter targeting ──────────────────────────────
  const enemyBuildings = useMemo(() => {
    if (!otherPlayers || otherPlayers.length === 0) return [];
    const list = [];
    for (const player of otherPlayers) {
      for (const item of (player.placedItems ?? [])) {
        if (item.position) {
          list.push({ id: `${player.userId}_${item.id}`, position: item.position });
        }
      }
    }
    return list;
  }, [otherPlayers]);

  // ── Active missiles and explosions ───────────────────────────────────────
  const [missiles,   setMissiles]   = useState([]);
  const [explosions, setExplosions] = useState([]);

  const handleFireMissile = useCallback((from, to) => {
    const id = Date.now() + Math.random();
    setMissiles(prev => [...prev, { id, from, to }]);
  }, []);

  const handleMissileImpact = useCallback((missileId, impactPos) => {
    setMissiles(prev => prev.filter(m => m.id !== missileId));
    setExplosions(prev => [...prev, { id: Date.now() + Math.random(), position: impactPos }]);
  }, []);

  const handleExplosionDone = useCallback((explosionId) => {
    setExplosions(prev => prev.filter(e => e.id !== explosionId));
  }, []);

  // ── Fighter target marker state ────────────────────────────────────────────
  const [fighterTargetMarker, setFighterTargetMarker] = useState(null);
  useEffect(() => { if (!selectedFighterId) setFighterTargetMarker(null); }, [selectedFighterId]);

  // ── Camera-centered visibility tracking ──────────────────────────────────
  // useFrame writes to a ref every frame; React state only updates when the
  // camera ground-target moves >8 world units, keeping re-renders minimal.
  const [camCenter, setCamCenter] = useState({ x: 0, z: 0 });
  const _lastCam = useRef({ x: -99999, z: -99999 });
  useFrame(() => {
    const { x, z } = camTargetRef.current;
    if (Math.abs(x - _lastCam.current.x) + Math.abs(z - _lastCam.current.z) > 8) {
      _lastCam.current = { x, z };
      setCamCenter({ x, z });
    }
  });
  const camX = camCenter.x, camZ = camCenter.z;
  // True if a world [x,y,z] position array is within render radius of camera
  function inSelfRange(pos) {
    return Math.hypot((pos[0] ?? 0) - camX, (pos[2] ?? 0) - camZ) < SELF_RENDER_R;
  }
  // True if at least one endpoint of a belt/cable is within range
  function connInSelfRange(conn) {
    const from = placedItems.find(i => i.id === conn.fromId);
    const to   = placedItems.find(i => i.id === conn.toId);
    return (from && inSelfRange(from.position)) || (to && inSelfRange(to.position));
  }

  const droneRates = useMemo(
    () => calcConveyorRates(placedItems, drones, buildingLevels ?? {}),
    [placedItems, drones, buildingLevels],
  );

  return (
    <>
      {/* FPS + renderer sampler — zero visual output */}
      <FpsMonitor fpsRef={fpsRef} rendererStatsRef={rendererStatsRef} />
      {/* Global PointLight pool — only MAX 5 real lights, assigned to nearest lamps */}
      <LampLightPool />
      <DynamicEnvironment gameTimeRef={gameTimeRef} />
      <World camTargetRef={camTargetRef} />
      <RTSCamera
        camTargetRef={camTargetRef}
        camStateRef={camStateRef}
        keysRef={keysRef}
        inputRef={inputRef}
      />

      {/* Placement previews */}
      {placingItem === 'solar-panel' && (
        <SolarPanelPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />
      )}
      {placingItem === 'money-factory' && (
        <MoneyFactoryPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />
      )}
      {placingItem === 'energy-storage' && (
        <EnergyStoragePreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />
      )}
      {placingItem === 'town-hall' && (
        <TownHallPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />
      )}
      {placingItem === 'street-lamp' && (
        <StreetLampPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />
      )}
      {placingItem === 'extractor' && (
        <ExtractorPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />
      )}
      {placingItem === 'builder-house' && (
        <BuilderHousePreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />
      )}
      {placingItem === 'coal-generator' && (
        <CoalGeneratorPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />
      )}
      {placingItem === 'hangar' && (
        <HangarPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />
      )}

      {/* Placed buildings — culled to SELF_RENDER_R around camera target */}
      {placedItems.filter(item => inSelfRange(item.position)).map(item =>
        item.type === 'solar-panel' ? (
          <SolarPanelPlaced
            key={item.id}
            position={item.position}
            rotation={item.rotation}
            isSelected={selectedPlacedId === item.id}
            onSelect={() => setSelectedPlacedId(item.id)}
            isConveyorSource={droneFromId === item.id}
            onConveyorClick={() => onDroneRouteBuildingClick(item.id)}
            isPowered={poweredIds ? poweredIds.has(item.id) : true}
            onRightClick={(x, y) => onBuildingRightClick?.(item.id, item.type, x, y)}
            level={buildingLevels?.[String(item.id)] ?? 1}
          />
        ) : item.type === 'money-factory' ? (
          <MoneyFactoryPlaced
            key={item.id}
            position={item.position}
            rotation={item.rotation}
            isSelected={selectedPlacedId === item.id}
            onSelect={() => setSelectedPlacedId(item.id)}
            isConveyorSource={droneFromId === item.id}
            onConveyorClick={() => onDroneRouteBuildingClick(item.id)}
            isPowered={poweredIds ? poweredIds.has(item.id) : true}
            onRightClick={(x, y) => onBuildingRightClick?.(item.id, item.type, x, y)}
            level={buildingLevels?.[String(item.id)] ?? 1}
          />
        ) : item.type === 'energy-storage' ? (
          <EnergyStoragePlaced
            key={item.id}
            position={item.position}
            rotation={item.rotation}
            isSelected={selectedPlacedId === item.id}
            onSelect={() => setSelectedPlacedId(item.id)}
            isConveyorSource={droneFromId === item.id}
            onConveyorClick={() => onDroneRouteBuildingClick(item.id)}
            isPowered={poweredIds ? poweredIds.has(item.id) : true}
            onRightClick={(x, y) => onBuildingRightClick?.(item.id, item.type, x, y)}
            currentAmounts={storedAmounts ? (storedAmounts[String(item.id)] ?? {}) : {}}
            level={buildingLevels?.[String(item.id)] ?? 1}
          />
        ) : item.type === 'town-hall' ? (
          <TownHallPlaced
            key={item.id}
            position={item.position}
            rotation={item.rotation}
            isSelected={selectedPlacedId === item.id}
            onSelect={() => setSelectedPlacedId(item.id)}
            isConveyorSource={droneFromId === item.id}
            onConveyorClick={() => onDroneRouteBuildingClick(item.id)}
            onRightClick={(x, y) => onBuildingRightClick?.(item.id, item.type, x, y)}
            currentAmounts={storedAmounts ? (storedAmounts[String(item.id)] ?? {}) : {}}
            points={pointsAmounts ? (pointsAmounts[String(item.id)] ?? 0) : 0}
            level={buildingLevels?.[String(item.id)] ?? 1}
          />
        ) : item.type === 'street-lamp' ? (
          <StreetLampPlaced
            key={item.id}
            position={item.position}
            rotation={item.rotation}
            isSelected={selectedPlacedId === item.id}
            onSelect={() => setSelectedPlacedId(item.id)}
            isConveyorSource={droneFromId === item.id}
            onConveyorClick={() => onDroneRouteBuildingClick(item.id)}
            onRightClick={(x, y) => onBuildingRightClick?.(item.id, item.type, x, y)}
            gameTimeRef={gameTimeRef}
            isPowered={poweredIds ? poweredIds.has(item.id) : true}
            level={buildingLevels?.[String(item.id)] ?? 1}
          />
        ) : item.type === 'extractor' ? (
          <ExtractorPlaced
            key={item.id}
            position={item.position}
            rotation={item.rotation}
            isSelected={selectedPlacedId === item.id}
            onSelect={() => setSelectedPlacedId(item.id)}
            isConveyorSource={droneFromId === item.id}
            onConveyorClick={() => onDroneRouteBuildingClick(item.id)}
            onRightClick={(x, y) => onBuildingRightClick?.(item.id, item.type, x, y)}
            currentAmounts={storedAmounts ? (storedAmounts[String(item.id)] ?? {}) : {}}
            level={buildingLevels?.[String(item.id)] ?? 1}
            oreType={item.oreType}
          />
        ) : item.type === 'builder-house' ? (
          <BuilderHousePlaced
            key={item.id}
            position={item.position}
            rotation={item.rotation}
            isSelected={selectedPlacedId === item.id}
            onSelect={() => setSelectedPlacedId(item.id)}
            onRightClick={(x, y) => onBuildingRightClick?.(item.id, item.type, x, y)}
            level={buildingLevels?.[String(item.id)] ?? 1}
            totalBuilders={totalBuilders}
            freeBuilders={freeBuilders}
          />
        ) : item.type === 'coal-generator' ? (
          <CoalGeneratorPlaced
            key={item.id}
            position={item.position}
            rotation={item.rotation}
            isSelected={selectedPlacedId === item.id}
            onSelect={() => setSelectedPlacedId(item.id)}
            isConveyorSource={droneFromId === item.id}
            onConveyorClick={() => onDroneRouteBuildingClick(item.id)}
            isPowered={poweredIds ? poweredIds.has(item.id) : true}
            onRightClick={(x, y) => onBuildingRightClick?.(item.id, item.type, x, y)}
            currentAmounts={storedAmounts ? (storedAmounts[String(item.id)] ?? {}) : {}}
            level={buildingLevels?.[String(item.id)] ?? 1}
          />
        ) : item.type === 'hangar' ? (
          <HangarPlaced
            key={item.id}
            position={item.position}
            rotation={item.rotation}
            isSelected={selectedPlacedId === item.id}
            onSelect={() => setSelectedPlacedId(item.id)}
            onRightClick={(x, y) => onBuildingRightClick?.(item.id, item.type, x, y)}
            level={buildingLevels?.[String(item.id)] ?? 1}
          />
        ) : null
      )}

      {/* Construction sites — scaffolding + progress + builder figure */}
      {Object.entries(constructingBuildings ?? {}).map(([bid, constructInfo]) => {
        const item = placedItems.find(i => String(i.id) === bid);
        if (!item) return null;
        if (!inSelfRange(item.position)) return null;
        const sz = BUILDING_HALF_SIZE[item.type] ?? { hw: 3.0, hh: 3.5 };
        const hasRunner = (movingBuilders ?? []).some(r => r.itemId === bid);
        return (
          <group key={`cs_${bid}`}>
            <ConstructionSite
              position={item.position}
              constructInfo={constructInfo}
              halfW={sz.hw}
              halfH={sz.hh}
            />
            {!hasRunner && Date.now() >= (constructInfo.startReal ?? 0) && <BuilderAtWork position={item.position} />}
          </group>
        );
      })}

      {/* Upgrade workers — builder figure + badge + pulsing ring */}
      {Object.entries(upgradingBuildings ?? {}).map(([bid, upgradeInfo]) => {
        const item = placedItems.find(i => String(i.id) === bid);
        if (!item) return null;
        if (!inSelfRange(item.position)) return null;
        const sz     = BUILDING_HALF_SIZE[item.type] ?? { hw: 3.0, hh: 3.5 };
        const px     = item.position[0] ?? 0;
        const py     = item.position[1] ?? 0;
        const pz     = item.position[2] ?? 0;
        const badgePos = [px, py + sz.hh * 2 + 1.8, pz];
        const ringR  = sz.hw * 1.1;
        const droneArrived = Date.now() >= (upgradeInfo.startReal ?? 0);
        const hasRunner    = (movingBuilders ?? []).some(r => r.itemId === bid);
        return (
          <group key={`uw_${bid}`}>
            {droneArrived && !hasRunner && <BuilderAtWork position={item.position} />}
            {droneArrived && <UpgradeRing position={item.position} radius={ringR} />}
            <UpgradeBadgeInline upgradeInfo={upgradeInfo} position={badgePos} />
          </group>
        );
      })}

      {/* Running builder figures */}
      {(movingBuilders ?? []).map(r => (
        <BuilderRunner key={r.id} fromPos={r.fromPos} toPos={r.toPos} startReal={r.startReal} durationMs={r.durationMs} workDurationMs={r.workDurationMs} />
      ))}

      {/* Drone route target pulse hints */}
      <ConveyorTargetPulse
        conveyorFromId={droneFromId}
        placedItems={placedItems}
        conveyors={drones}
      />

      {/* Drone animations — visual only, not interactive */}
      {drones.filter(connInSelfRange).map(drone => (
        <Drone key={drone.id} fromId={drone.fromId} toId={drone.toId}
          placedItems={placedItems} effectiveRate={droneRates.get(drone.id) ?? 0} />
      ))}

      {/* Fighter jets */}
      {(placedFighters ?? []).filter(f => inSelfRange(f.position)).map(f => (
        <FighterUnit
          key={f.id}
          fighter={f}
          isSelected={selectedFighterId === f.id}
          onSelect={() => onFighterSelect?.(f.id)}
          onUpdatePos={onFighterUpdatePos}
          enemyBuildings={enemyBuildings}
          onFireMissile={handleFireMissile}
        />
      ))}

      {/* Active missiles */}
      {missiles.map(m => (
        <Missile
          key={m.id}
          from={m.from}
          to={m.to}
          onImpact={() => handleMissileImpact(m.id, m.to)}
        />
      ))}

      {/* Active explosions */}
      {explosions.map(ex => (
        <Explosion
          key={ex.id}
          position={ex.position}
          onDone={() => handleExplosionDone(ex.id)}
        />
      ))}

      {/* Fighter target marker */}
      {fighterTargetMarker && (
        <FighterTargetMarker
          key={`${fighterTargetMarker[0].toFixed(1)}_${fighterTargetMarker[2].toFixed(1)}`}
          position={fighterTargetMarker}
        />
      )}

      {/* Transparent ground plane for fighter RMB targeting */}
      {selectedFighterId && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.03, 0]}
          onPointerDown={(e) => {
            if (e.button === 2) {
              e.stopPropagation();
              const x = e.point.x, z = e.point.z;
              setFighterTargetMarker([x, 0, z]);
              onGroundFighterTarget?.(x, z);
            } else if (e.button === 0) {
              e.stopPropagation();
              // Deselect fighter if clicking empty ground
              onFighterSelect?.(null);
            }
          }}
        >
          <planeGeometry args={[2000, 2000]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}


      {/* ── Wall & Tower system ─────────────────────────────────────────── */}

      {/* Placed wall segments — culled if both endpoints out of range */}
      {(placedWalls ?? []).filter(wall =>
        !wall.from || !wall.to ||
        inSelfRange([wall.from.x, 0, wall.from.z]) ||
        inSelfRange([wall.to.x,   0, wall.to.z])
      ).map(wall => (
        <WallSegment
          key={wall.id}
          wallData={wall}
          level={wall.level ?? 1}
          onRightClick={(x, y) => onWallRightClick?.(wall.id, x, y)}
        />
      ))}

      {/* Placed towers — culled by position */}
      {(placedTowers ?? []).filter(tower => inSelfRange(tower.position)).map(tower => (
        <TowerPlaced
          key={tower.id}
          position={tower.position}
          rotation={tower.rotation ?? 0}
          level={tower.level ?? 1}
          onRightClick={(x, y) => onTowerRightClick?.(tower.id, x, y)}
        />
      ))}

      {/* Wall cursor ring — shows snapped grid position while in wall mode */}
      {wallMode && <WallCursorRing cursorRef={wallCursorRef} hasStart={!!wallFromPoint} />}

      {/* Tower placement preview */}
      {towerMode && (
        <TowerPreview cursorRef={wallCursorRef} />
      )}

      {/* Wall placement preview (start point set, dragging to end) */}
      {wallMode && wallFromPoint && (
        <WallPlacementPreview fromPoint={wallFromPoint} cursorRef={wallCursorRef} />
      )}

      {/* Snap indicator at start point */}
      {wallMode && wallFromPoint && (
        <SnapIndicator position={wallFromPoint} />
      )}

      {/* Invisible ground plane — captures pointer events in wall/tower mode */}
      {(wallMode || towerMode) && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02, 0]}
          onPointerMove={(e) => {
            e.stopPropagation();
            if (wallCursorRef) wallCursorRef.current = { x: e.point.x, z: e.point.z };
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (wallMode)  onWallGroundClick?.(e.point.x, e.point.z);
            if (towerMode) onTowerGroundClick?.(e.point.x, e.point.z);
          }}
        >
          <planeGeometry args={[2000, 2000]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {/* ── Other players' cities (read-only) ─────────────────────────── */}
      {(otherPlayers ?? []).map(player => (
        <OtherPlayerCity
          key={player.userId}
          player={player}
          gameTimeRef={gameTimeRef}
          camCenter={camCenter}
        />
      ))}
    </>
  );
}

export const Scene = memo(SceneInner);