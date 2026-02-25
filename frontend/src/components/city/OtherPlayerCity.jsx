// ─── OtherPlayerCity.jsx ──────────────────────────────────────────────────────
// Renders another player's city in read-only mode inside the shared 3-D scene.
//   • All buildings are rendered with no interactive handlers (click/select/
//     context-menu do nothing), so the local player cannot control them.
//   • A pulsing territory ring + player-name label mark the base.
//   • A subtle tinted ground overlay shows the base boundary.
//
// Props:
//   player       — { userId, username, placedItems, placedWalls, placedTowers, buildingLevels }
//   gameTimeRef  — shared ref to current game time (needed for street lamps)

import { memo, useMemo, useRef } from 'react';
import { FaUser } from 'react-icons/fa';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { SolarPanelPlaced }                          from './buildings/SolarPanel.jsx';
import { MoneyFactoryPlaced }                        from './buildings/MoneyFactory.jsx';
import { EnergyStoragePlaced }                       from './buildings/EnergyStorage.jsx';
import { TownHallPlaced }                            from './buildings/TownHall.jsx';
import { StreetLampPlaced }                          from './buildings/StreetLamp.jsx';
import { SplitterPlaced, MergerPlaced }              from './buildings/SplitterMerger.jsx';
import { ExtractorPlaced }                           from './buildings/Extractor.jsx';
import { BuilderHousePlaced }                        from './buildings/BuilderHouse.jsx';
import { WallSegment }                               from './buildings/Wall.jsx';
import { TowerPlaced }                               from './buildings/Tower.jsx';
import { ConveyorBelt }                              from './ConveyorBelt.jsx';
import { EnergyCable }                               from './EnergyCable.jsx';
import { calcConveyorRates, calcCableRates }          from '../systems/connectionRates.js';

// ── Territory ring — pulsing circle that marks the base boundary ──────────────
function TerritoryRing({ cx, cz, radius }) {
  const ringRef = useRef();
  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    ringRef.current.material.opacity = 0.28 + Math.sin(clock.getElapsedTime() * 1.5) * 0.12;
  });
  return (
    <mesh ref={ringRef} position={[cx, 0.08, cz]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.6, radius + 0.6, 64]} />
      <meshBasicMaterial color="#60a5fa" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

// ── Ground tint — semi-transparent circle covering the base ───────────────────
function TerritoryGround({ cx, cz, radius }) {
  return (
    <mesh position={[cx, 0.04, cz]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 64]} />
      <meshBasicMaterial color="#3b82f6" transparent opacity={0.05} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

// ── Player name label ─────────────────────────────────────────────────────────
function PlayerLabel({ cx, cz, height, username }) {
  return (
    <Html
      position={[cx, height + 2, cz]}
      center
      distanceFactor={80}
      zIndexRange={[5, 6]}
      style={{ pointerEvents: 'none' }}
    >
      <div style={{
        background:   'rgba(15, 23, 42, 0.88)',
        border:       '1px solid #60a5fa',
        borderRadius: 8,
        padding:      '4px 12px',
        fontSize:     13,
        fontWeight:   700,
        fontFamily:   'sans-serif',
        color:        '#93c5fd',
        whiteSpace:   'nowrap',
        userSelect:   'none',
        letterSpacing: 0.5,
      }}>
        <FaUser style={{ marginRight: 6, verticalAlign: 'middle', fontSize: 11 }} />{username}
      </div>
    </Html>
  );
}

// ── OtherPlayerCity ───────────────────────────────────────────────────────────
function OtherPlayerCityInner({ player, gameTimeRef }) {
  const { username, placedItems = [], placedWalls = [], placedTowers = [], buildingLevels = {},
          conveyors = [], energyCables = [], storedAmounts = {}, pointsAmounts = {} } = player;

  const conveyorRates = useMemo(
    () => calcConveyorRates(placedItems, conveyors, buildingLevels),
    [placedItems, conveyors, buildingLevels],
  );
  const cableRates = useMemo(
    () => calcCableRates(placedItems, energyCables, buildingLevels),
    [placedItems, energyCables, buildingLevels],
  );

  // Compute territory center and radius from all placed items
  const { cx, cz, radius, labelHeight } = useMemo(() => {
    const positions = placedItems
      .filter(i => i.position)
      .map(i => ({ x: i.position[0], z: i.position[2] }));

    // Also include wall endpoints
    for (const w of placedWalls) {
      if (w.from) positions.push(w.from);
      if (w.to)   positions.push(w.to);
    }
    // And tower positions
    for (const t of placedTowers) {
      if (t.position) positions.push({ x: t.position[0], z: t.position[2] });
    }

    if (positions.length === 0) return { cx: 0, cz: 0, radius: 24, labelHeight: 12 };

    const sumX = positions.reduce((s, p) => s + p.x, 0);
    const sumZ = positions.reduce((s, p) => s + p.z, 0);
    const centerX = sumX / positions.length;
    const centerZ = sumZ / positions.length;

    // Radius = farthest element + some padding
    const maxDist = positions.reduce(
      (m, p) => Math.max(m, Math.hypot(p.x - centerX, p.z - centerZ)),
      0,
    );
    const r = Math.max(20, maxDist + 18);

    // Label height: above the town-hall if present, else default
    const th = placedItems.find(i => i.type === 'town-hall');
    const lh = th ? 22 : 14;

    return { cx: centerX, cz: centerZ, radius: r, labelHeight: lh };
  }, [placedItems, placedWalls, placedTowers]);

  return (
    <group>
      {/* Territorio visual */}
      <TerritoryGround cx={cx} cz={cz} radius={radius} />
      <TerritoryRing   cx={cx} cz={cz} radius={radius} />
      <PlayerLabel     cx={cx} cz={cz} height={labelHeight} username={username} />

      {/* ── Buildings — same Placed components, no interaction handlers ── */}
      {placedItems.map(item => {
        const level = buildingLevels[String(item.id)] ?? 1;
        const key   = `other_${player.userId}_${item.id}`;
        const pos   = item.position;
        const rot   = item.rotation;

        if (item.type === 'solar-panel') return (
          <SolarPanelPlaced key={key} position={pos} rotation={rot} level={level} isPowered />
        );
        if (item.type === 'money-factory') return (
          <MoneyFactoryPlaced key={key} position={pos} rotation={rot} level={level} isPowered />
        );
        if (item.type === 'energy-storage') return (
          <EnergyStoragePlaced key={key} position={pos} rotation={rot} level={level}
            isPowered currentAmounts={storedAmounts[String(item.id)] ?? {}} />
        );
        if (item.type === 'town-hall') return (
          <TownHallPlaced key={key} position={pos} rotation={rot} level={level}
            currentAmounts={storedAmounts[String(item.id)] ?? {}}
            points={pointsAmounts[String(item.id)] ?? 0} />
        );
        if (item.type === 'street-lamp') return (
          <StreetLampPlaced key={key} position={pos} rotation={rot} level={level}
            gameTimeRef={gameTimeRef} isPowered />
        );
        if (item.type === 'splitter') return (
          <SplitterPlaced key={key} position={pos} rotation={rot} level={level}
            currentAmounts={storedAmounts[String(item.id)] ?? {}} />
        );
        if (item.type === 'merger') return (
          <MergerPlaced key={key} position={pos} rotation={rot} level={level}
            currentAmounts={storedAmounts[String(item.id)] ?? {}} />
        );
        if (item.type === 'extractor') return (
          <ExtractorPlaced key={key} position={pos} rotation={rot} level={level}
            oreType={item.oreType} currentAmounts={storedAmounts[String(item.id)] ?? {}} isPowered />
        );
        if (item.type === 'builder-house') return (
          <BuilderHousePlaced key={key} position={pos} rotation={rot} level={level} />
        );
        return null;
      })}

      {/* ── Conveyors ─────────────────────────────────────────────────── */}
      {conveyors.map(conv => (
        <ConveyorBelt
          key={`other_${player.userId}_conv_${conv.id}`}
          fromId={conv.fromId}
          toId={conv.toId}
          placedItems={placedItems}
          effectiveRate={conveyorRates.get(conv.id) ?? 0}
        />
      ))}

      {/* ── Energy cables ─────────────────────────────────────────────── */}
      {energyCables.map(cable => (
        <EnergyCable
          key={`other_${player.userId}_cable_${cable.id}`}
          fromId={cable.fromId}
          toId={cable.toId}
          placedItems={placedItems}
          effectiveRate={cableRates.get(cable.id) ?? 0}
        />
      ))}

      {/* ── Walls ───────────────────────────────────────────────────────── */}
      {placedWalls.map(wall => (
        <WallSegment
          key={`other_${player.userId}_wall_${wall.id}`}
          wallData={wall}
          level={wall.level ?? 1}
        />
      ))}

      {/* ── Towers ──────────────────────────────────────────────────────── */}
      {placedTowers.map(tower => (
        <TowerPlaced
          key={`other_${player.userId}_tower_${tower.id}`}
          position={tower.position}
          rotation={tower.rotation ?? 0}
          level={tower.level ?? 1}
        />
      ))}
    </group>
  );
}

export const OtherPlayerCity = memo(OtherPlayerCityInner);
