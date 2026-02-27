import { useMemo, memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DynamicEnvironment } from './DynamicEnvironment.jsx';
import { World } from './WorldChunks.jsx';
import { RTSCamera } from './RTSCamera.jsx';
import { ConveyorBelt } from './ConveyorBelt.jsx';
import { EnergyCable } from './EnergyCable.jsx';
import { SolarPanelPreview, SolarPanelPlaced } from './buildings/SolarPanel.jsx';
import { MoneyFactoryPreview, MoneyFactoryPlaced } from './buildings/MoneyFactory.jsx';
import { EnergyStoragePreview, EnergyStoragePlaced } from './buildings/EnergyStorage.jsx';
import { TownHallPreview, TownHallPlaced } from './buildings/TownHall.jsx';
import { StreetLampPreview, StreetLampPlaced } from './buildings/StreetLamp.jsx';
import { SplitterPreview, SplitterPlaced, MergerPreview, MergerPlaced } from './buildings/SplitterMerger.jsx';
import { ExtractorPreview, ExtractorPlaced } from './buildings/Extractor.jsx';
import { BuilderHousePreview, BuilderHousePlaced, BuilderAtWork, BuilderRunner, UpgradeBadgeInline } from './buildings/BuilderHouse.jsx';
import { CableTargetPulse } from './CableTargetPulse.jsx';
import { ConveyorTargetPulse } from './ConveyorTargetPulse.jsx';
import { ConstructionSite } from './ConstructionSite.jsx';
import { calcConveyorRates, calcCableRates } from '../systems/connectionRates.js';
import { WallSegment, WallPlacementPreview, SnapIndicator } from './buildings/Wall.jsx';
import { TowerPlaced, TowerPreview } from './buildings/Tower.jsx';
import { ConveyorPathPreview } from './ConveyorPathPreview.jsx';
import { OtherPlayerCity } from './OtherPlayerCity.jsx';
import { LampLightPool } from './LampLightPool.jsx';
import * as THREE from 'three';

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
};

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
  conveyors,
  conveyorFromId,
  onConveyorBuildingClick,
  energyCables,
  cableFromId,
  onCableBuildingClick,
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
  onConveyorRightClick,
  onCableRightClick,
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
  // Conveyor path routing
  conveyorWaypointsRef,
  conveyorCursorRef,
  onConveyorGroundClick,
  otherPlayers,
}) {
  const conveyorRates = useMemo(
    () => calcConveyorRates(placedItems, conveyors, buildingLevels ?? {}),
    [placedItems, conveyors, buildingLevels],
  );
  const cableRates = useMemo(
    () => calcCableRates(placedItems, energyCables ?? [], buildingLevels ?? {}),
    [placedItems, energyCables, buildingLevels],
  );

  return (
    <>
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
      {placingItem === 'splitter' && (
        <SplitterPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />
      )}
      {placingItem === 'merger' && (
        <MergerPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />
      )}
      {placingItem === 'extractor' && (
        <ExtractorPreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />
      )}
      {placingItem === 'builder-house' && (
        <BuilderHousePreview placementPosRef={placementPosRef} inputRef={inputRef} placementRotYRef={placementRotYRef} />
      )}

      {/* Placed buildings */}
      {placedItems.map(item =>
        item.type === 'solar-panel' ? (
          <SolarPanelPlaced
            key={item.id}
            position={item.position}
            rotation={item.rotation}
            isSelected={selectedPlacedId === item.id}
            onSelect={() => setSelectedPlacedId(item.id)}
            isConveyorSource={conveyorFromId === item.id}
            onConveyorClick={() => onConveyorBuildingClick(item.id)}
            isCableSource={cableFromId === item.id}
            onCableClick={() => onCableBuildingClick(item.id)}
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
            isConveyorSource={conveyorFromId === item.id}
            onConveyorClick={() => onConveyorBuildingClick(item.id)}
            isCableSource={cableFromId === item.id}
            onCableClick={() => onCableBuildingClick(item.id)}
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
            isConveyorSource={conveyorFromId === item.id}
            onConveyorClick={() => onConveyorBuildingClick(item.id)}
            isCableSource={cableFromId === item.id}
            onCableClick={() => onCableBuildingClick(item.id)}
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
            isConveyorSource={conveyorFromId === item.id}
            onConveyorClick={() => onConveyorBuildingClick(item.id)}
            isCableSource={cableFromId === item.id}
            onCableClick={() => onCableBuildingClick(item.id)}
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
            isConveyorSource={conveyorFromId === item.id}
            onConveyorClick={() => onConveyorBuildingClick(item.id)}
            isCableSource={cableFromId === item.id}
            onCableClick={() => onCableBuildingClick(item.id)}
            onRightClick={(x, y) => onBuildingRightClick?.(item.id, item.type, x, y)}
            gameTimeRef={gameTimeRef}
            isPowered={poweredIds ? poweredIds.has(item.id) : true}
            level={buildingLevels?.[String(item.id)] ?? 1}
          />
        ) : item.type === 'splitter' ? (
          <SplitterPlaced
            key={item.id}
            position={item.position}
            rotation={item.rotation}
            isSelected={selectedPlacedId === item.id}
            onSelect={() => setSelectedPlacedId(item.id)}
            isConveyorSource={conveyorFromId === item.id}
            onConveyorClick={() => onConveyorBuildingClick(item.id)}
            onRightClick={(x, y) => onBuildingRightClick?.(item.id, item.type, x, y)}
            currentAmounts={storedAmounts ? (storedAmounts[String(item.id)] ?? {}) : {}}
            level={buildingLevels?.[String(item.id)] ?? 1}
          />
        ) : item.type === 'merger' ? (
          <MergerPlaced
            key={item.id}
            position={item.position}
            rotation={item.rotation}
            isSelected={selectedPlacedId === item.id}
            onSelect={() => setSelectedPlacedId(item.id)}
            isConveyorSource={conveyorFromId === item.id}
            onConveyorClick={() => onConveyorBuildingClick(item.id)}
            onRightClick={(x, y) => onBuildingRightClick?.(item.id, item.type, x, y)}
            currentAmounts={storedAmounts ? (storedAmounts[String(item.id)] ?? {}) : {}}
            level={buildingLevels?.[String(item.id)] ?? 1}
          />
        ) : item.type === 'extractor' ? (
          <ExtractorPlaced
            key={item.id}
            position={item.position}
            rotation={item.rotation}
            isSelected={selectedPlacedId === item.id}
            onSelect={() => setSelectedPlacedId(item.id)}
            isConveyorSource={conveyorFromId === item.id}
            onConveyorClick={() => onConveyorBuildingClick(item.id)}
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
        ) : null
      )}

      {/* Construction sites — scaffolding + progress + builder figure */}
      {Object.entries(constructingBuildings ?? {}).map(([bid, constructInfo]) => {
        const item = placedItems.find(i => String(i.id) === bid);
        if (!item) return null;
        const sz = BUILDING_HALF_SIZE[item.type] ?? { hw: 3.0, hh: 3.5 };
        return (
          <group key={`cs_${bid}`}>
            <ConstructionSite
              position={item.position}
              constructInfo={constructInfo}
              halfW={sz.hw}
              halfH={sz.hh}
            />
            <BuilderAtWork position={item.position} />
          </group>
        );
      })}

      {/* Upgrade workers — builder figure + badge + pulsing ring */}
      {Object.entries(upgradingBuildings ?? {}).map(([bid, upgradeInfo]) => {
        const item = placedItems.find(i => String(i.id) === bid);
        if (!item) return null;
        const sz     = BUILDING_HALF_SIZE[item.type] ?? { hw: 3.0, hh: 3.5 };
        const px     = item.position[0] ?? 0;
        const py     = item.position[1] ?? 0;
        const pz     = item.position[2] ?? 0;
        const badgePos = [px, py + sz.hh * 2 + 1.8, pz];
        const ringR  = sz.hw * 1.1;
        return (
          <group key={`uw_${bid}`}>
            <BuilderAtWork position={item.position} />
            <UpgradeRing position={item.position} radius={ringR} />
            <UpgradeBadgeInline upgradeInfo={upgradeInfo} position={badgePos} />
          </group>
        );
      })}

      {/* Running builder figures */}
      {(movingBuilders ?? []).map(r => (
        <BuilderRunner key={r.id} fromPos={r.fromPos} toPos={r.toPos} startReal={r.startReal} />
      ))}

      {/* Cable target pulse hints */}
      <CableTargetPulse
        cableFromId={cableFromId}
        placedItems={placedItems}
        energyCables={energyCables ?? []}
      />

      {/* Conveyor target pulse hints */}
      <ConveyorTargetPulse
        conveyorFromId={conveyorFromId}
        placedItems={placedItems}
        conveyors={conveyors}
      />

      {/* Conveyor belts */}
      {conveyors.map(conv => (
        <ConveyorBelt
          key={conv.id}
          fromId={conv.fromId}
          toId={conv.toId}
          waypoints={conv.waypoints ?? []}
          placedItems={placedItems}
          effectiveRate={conveyorRates.get(conv.id) ?? 0}
          onRightClick={(x, y) => onConveyorRightClick?.(conv.id, x, y)}
        />
      ))}

      {/* Energy cables */}
      {(energyCables ?? []).map(cable => (
        <EnergyCable
          key={cable.id}
          fromId={cable.fromId}
          toId={cable.toId}
          placedItems={placedItems}
          effectiveRate={cableRates.get(cable.id) ?? 0}
          onRightClick={(x, y) => onCableRightClick?.(cable.id, x, y)}
        />
      ))}

      {/* ── Wall & Tower system ─────────────────────────────────────────── */}

      {/* Placed wall segments */}
      {(placedWalls ?? []).map(wall => (
        <WallSegment
          key={wall.id}
          wallData={wall}
          level={wall.level ?? 1}
          onRightClick={(x, y) => onWallRightClick?.(wall.id, x, y)}
        />
      ))}

      {/* Placed towers */}
      {(placedTowers ?? []).map(tower => (
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

      {/* Невидимая земля для прокладки маршрута конвейера */}
      {conveyorFromId !== null && !placingItem && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.03, 0]}
          onPointerMove={(e) => {
            e.stopPropagation();
            if (conveyorCursorRef) conveyorCursorRef.current = { x: e.point.x, z: e.point.z };
          }}
          onClick={(e) => {
            e.stopPropagation();
            onConveyorGroundClick?.(e.point.x, e.point.z);
          }}
        >
          <planeGeometry args={[2000, 2000]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {/* Призрак маршрута конвейера в режиме прокладки пути */}
      {conveyorFromId !== null && conveyorWaypointsRef && (
        <ConveyorPathPreview
          sourceId={conveyorFromId}
          placedItems={placedItems}
          waypointsRef={conveyorWaypointsRef}
          cursorRef={conveyorCursorRef}
        />
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
        />
      ))}
    </>
  );
}

export const Scene = memo(SceneInner);