// ─── DronePanel.jsx ────────────────────────────────────────────────────────────
// Panel for viewing and upgrading drones:
//   • Builder drones    — each builder-house building
//   • Item transport    — drone routes (non-pump)
//   • Liquid transport  — drone routes (pump → pump-factory)
// Upgrade requires: coins + iron/silver ingots. Max 5 upgrades simultaneously.

import { useState, useMemo } from 'react';
import { FaTimes, FaArrowUp, FaCoins, FaRobot, FaCog, FaHardHat, FaTruck, FaSearch } from 'react-icons/fa';
import { GiAnvilImpact, GiSilverBullet, GiWaterDrop } from 'react-icons/gi';

// ─── Upgrade config ────────────────────────────────────────────────────────────
const MAX_ROUTE_LEVEL = 4;
const MAX_CONCURRENT_UPGRADES = 5;

// Kept for backwards-compat with OpenCity
export const FIGHTER_UPGRADE_COSTS = [
  null,
  { coins: 200,  iron: 5,  silver: 0  },
  { coins: 500,  iron: 15, silver: 0  },
  { coins: 1000, iron: 0,  silver: 30 },
];

export const DRONE_ROUTE_UPGRADE_COSTS = [
  null,
  { coins: 150, iron: 3,  silver: 0 },   // 1 → 2
  { coins: 350, iron: 8,  silver: 0 },   // 2 → 3
  { coins: 700, iron: 20, silver: 0 },   // 3 → 4
];

const ROUTE_LEVEL_LABELS = ['', 'Базовый', 'Улучшен', 'Продвинутый', 'Максимум'];
const ROUTE_LEVEL_COLORS = ['', '#4ade80', '#fbbf24', '#f97316', '#a855f7'];
const ROUTE_SPEED_BONUS  = ['', '+0%', '+30%', '+80%', '+150%'];

const BNAME = {
  'solar-panel':    'Солн. панель',   'money-factory':  'Фабрика монет',
  'energy-storage': 'Хран. энергии',  'town-hall':      'Ратуша',
  'extractor':      'Добытчик',       'coal-generator': 'Угол. генератор',
  'hangar':         'Ангар',          'builder-house':  'Дом строителя',
  'pump':           'Насос',          'pump-factory':   'Завод насосов',
  'lab-factory':    'Лаб.-завод',     'defense-tower':  'Обор. башня',
};
function bname(type, id) {
  return (BNAME[type] ?? type) + (id != null ? ` #${String(id).slice(-4)}` : '');
}

// ─── Shared cost display ───────────────────────────────────────────────────────
function CostRow({ cost, ingots, coinBalance }) {
  if (!cost) return null;
  const hasCoins  = coinBalance >= cost.coins;
  const hasIron   = (ingots.iron   ?? 0) >= (cost.iron   ?? 0);
  const hasSilver = (ingots.silver ?? 0) >= (cost.silver ?? 0);
  const cs = (ok) => ({
    display: 'flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
    color: ok ? '#4ade80' : '#f87171',
  });
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 5 }}>
      {cost.coins > 0 && (
        <span style={cs(hasCoins)}><FaCoins style={{ color: '#fbbf24' }} /> {cost.coins}</span>
      )}
      {(cost.iron ?? 0) > 0 && (
        <span style={cs(hasIron)}><GiAnvilImpact style={{ color: '#94a3b8' }} /> {cost.iron} жел.</span>
      )}
      {(cost.silver ?? 0) > 0 && (
        <span style={cs(hasSilver)}><GiSilverBullet style={{ color: '#e2e8f0' }} /> {cost.silver} сер.</span>
      )}
    </div>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, color, title, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 4px 6px',
      borderBottom: `1px solid ${color}33`,
      marginBottom: 8,
    }}>
      <Icon style={{ color, fontSize: 15 }} />
      <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, color }}>{title}</span>
      <span style={{
        marginLeft: 'auto', fontSize: 11, color: '#475569',
        background: 'rgba(255,255,255,0.05)', borderRadius: 10,
        padding: '1px 8px',
      }}>{count}</span>
    </div>
  );
}

// ─── Compact grid card (transport + liquid drone routes) ─────────────────────
function DroneRouteCard({ drone, placedItems, level, ingots, coinBalance, upgradingDrones, onUpgrade, isLiquid, showFrom = true }) {
  const from = placedItems.find(i => i.id === drone.fromId);
  const to   = placedItems.find(i => i.id === drone.toId);
  const lc   = ROUTE_LEVEL_COLORS[level] ?? '#4ade80';
  const cost = level < MAX_ROUTE_LEVEL ? DRONE_ROUTE_UPGRADE_COSTS[level] : null;

  const upgrading   = !!upgradingDrones[drone.id];
  const upEntry     = upgradingDrones[drone.id];
  const activeCount = Object.keys(upgradingDrones).length;

  const hasCoins  = cost ? coinBalance >= cost.coins : false;
  const hasIron   = cost ? (ingots.iron   ?? 0) >= (cost.iron   ?? 0) : false;
  const hasSilver = cost ? (ingots.silver ?? 0) >= (cost.silver ?? 0) : false;
  const canUpgrade = cost && !upgrading && activeCount < MAX_CONCURRENT_UPGRADES
    && hasCoins && hasIron && hasSilver;

  let upgProgress = null, upgLeft = null;
  if (upgrading && upEntry) {
    upgProgress = Math.min(1, (Date.now() - upEntry.startMs) / upEntry.durationMs);
    upgLeft     = Math.max(0, Math.ceil((upEntry.startMs + upEntry.durationMs - Date.now()) / 1000));
  }

  const accent = isLiquid ? '#38bdf8' : '#818cf8';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${lc}44`,
      borderRadius: 12,
      padding: '12px 13px',
      display: 'flex', flexDirection: 'column', gap: 7,
      minWidth: 0,
    }}>
      {/* Icon + level badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${accent}1a`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent, fontSize: 16, flexShrink: 0,
        }}>
          {isLiquid ? <GiWaterDrop /> : <FaTruck />}
        </div>
        <div style={{
          padding: '2px 8px', borderRadius: 20,
          background: `${lc}1a`, border: `1px solid ${lc}44`,
          color: lc, fontSize: 10, fontWeight: 900,
        }}>Ур.{level}</div>
      </div>

      {/* Route names */}
      {showFrom && (
        <div style={{ fontSize: 11, fontWeight: 700, color: '#cbd5e1', lineHeight: 1.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {bname(from?.type, from?.id)}
        </div>
      )}
      <div style={{
        fontSize: 10, fontWeight: showFrom ? 400 : 700,
        color: showFrom ? '#64748b' : '#cbd5e1',
        marginTop: showFrom ? -4 : 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        → {bname(to?.type, to?.id)}
      </div>

      {/* Speed bonus */}
      <div style={{ fontSize: 10, color: '#64748b' }}>⚡ {ROUTE_SPEED_BONUS[level] ?? '+0%'}</div>

      {/* Progress bar while upgrading */}
      {upgrading && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#fbbf24', marginBottom: 2 }}>
            <FaCog style={{ animation: 'spin 2s linear infinite', fontSize: 10 }} />
            {Math.round((upgProgress ?? 0) * 100)}% · {upgLeft}с
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(upgProgress ?? 0) * 100}%`, background: '#fbbf24', borderRadius: 2 }} />
          </div>
        </div>
      )}

      {/* Cost display */}
      {cost && !upgrading && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
          {cost.coins > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: hasCoins ? '#4ade80' : '#f87171' }}>
              <FaCoins style={{ color: '#fbbf24', fontSize: 11 }} />{cost.coins}
            </span>
          )}
          {(cost.iron ?? 0) > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: hasIron ? '#4ade80' : '#f87171' }}>
              <GiAnvilImpact style={{ color: '#94a3b8', fontSize: 13 }} />{cost.iron}
            </span>
          )}
          {(cost.silver ?? 0) > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: hasSilver ? '#4ade80' : '#f87171' }}>
              <GiSilverBullet style={{ color: '#e2e8f0', fontSize: 13 }} />{cost.silver}
            </span>
          )}
        </div>
      )}

      {/* Upgrade button */}
      {cost && !upgrading ? (
        <button
          onClick={canUpgrade ? () => onUpgrade(drone.id) : undefined}
          disabled={!canUpgrade}
          title={canUpgrade ? `Улучшить → Ур.${level + 1}` : 'Недостаточно ресурсов'}
          style={{
            marginTop: 'auto', width: '100%', padding: '7px 0',
            border: `1px solid ${canUpgrade ? '#4ade80' : '#334155'}`,
            borderRadius: 7,
            background: canUpgrade ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.02)',
            color: canUpgrade ? '#4ade80' : '#475569',
            fontWeight: 700, fontSize: 11, cursor: canUpgrade ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            fontFamily: 'monospace',
          }}
        >
          <FaArrowUp style={{ fontSize: 10 }} /> Улучшить
        </button>
      ) : (!cost && level >= MAX_ROUTE_LEVEL) ? (
        <div style={{ fontSize: 11, color: '#a855f7', fontWeight: 700, textAlign: 'center', paddingTop: 2 }}>★ Макс.</div>
      ) : null}
    </div>
  );
}

// ─── Compact builder card ─────────────────────────────────────────────────────
function BuilderCard({ item, buildingLevels }) {
  const level     = buildingLevels[String(item.id)] ?? 1;
  const maxDrones = level >= 3 ? 3 : level >= 2 ? 2 : 1;
  const lc        = ROUTE_LEVEL_COLORS[level] ?? '#4ade80';
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${lc}44`,
      borderRadius: 12,
      padding: '12px 13px',
      display: 'flex', flexDirection: 'column', gap: 7,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'rgba(251,146,60,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fb923c', fontSize: 16,
        }}>
          <FaHardHat />
        </div>
        <div style={{
          padding: '2px 8px', borderRadius: 20,
          background: `${lc}1a`, border: `1px solid ${lc}44`,
          color: lc, fontSize: 10, fontWeight: 900,
        }}>Ур.{level}</div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#cbd5e1' }}>
        Дом #{String(item.id).slice(-4)}
      </div>
      <div style={{ fontSize: 10, color: '#64748b' }}>🔨 {maxDrones} дрон{maxDrones > 1 ? 'а' : ''}</div>
      <div style={{ fontSize: 10, color: '#334155', marginTop: 'auto', paddingTop: 2 }}>ПКМ → улучшить</div>
    </div>
  );
}

// ─── Group drones by source building ────────────────────────────────────────
function groupByFrom(droneList, placedItems) {
  const map = new Map();
  for (const d of droneList) {
    if (!map.has(d.fromId)) map.set(d.fromId, []);
    map.get(d.fromId).push(d);
  }
  return [...map.entries()].map(([fromId, drones]) => ({
    fromId,
    building: placedItems.find(i => i.id === fromId),
    drones,
  }));
}

// ─── Sub-header for a single source building ─────────────────────────────────
function BuildingGroupHeader({ building, drones, placedItems, count, color }) {
  const TypeIcon = building?.type === 'pump' || building?.type === 'pump-factory'
    ? GiWaterDrop : FaTruck;

  // Unique destination names for this group
  const destinations = [...new Map(
    drones.map(d => {
      const to = placedItems.find(i => i.id === d.toId);
      return [d.toId, bname(to?.type, to?.id)];
    })
  ).values()];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 10px', marginBottom: 7,
      background: `${color}0d`,
      border: `1px solid ${color}28`,
      borderRadius: 8,
      fontSize: 11,
      flexWrap: 'wrap',
    }}>
      <TypeIcon style={{ color, fontSize: 13, flexShrink: 0 }} />
      <span style={{ fontWeight: 800, color: '#cbd5e1', whiteSpace: 'nowrap' }}>
        {bname(building?.type, building?.id)}
      </span>
      <span style={{ color: '#475569', fontSize: 12 }}>→</span>
      <span style={{ color: '#94a3b8', fontSize: 10 }}>
        {destinations.join(', ')}
      </span>
      <span style={{ marginLeft: 'auto', color: '#475569', fontSize: 10, whiteSpace: 'nowrap' }}>
        {count} маршр.
      </span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function DronePanel({
  drones           = [],
  placedItems      = [],
  buildingLevels   = {},
  droneRouteLevels = {},
  ingots           = { iron: 0, silver: 0, copper: 0 },
  coinBalance      = 0,
  upgradingDrones  = {},
  onUpgrade,
  onClose,
}) {
  const [, setTick] = useState(0);
  const [search, setSearch] = useState('');

  // Tick every second for upgrade progress
  useState(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  });

  const builderHouses = useMemo(
    () => placedItems.filter(i => i.type === 'builder-house'),
    [placedItems],
  );

  const isLiquidRoute = (d) => {
    const from = placedItems.find(i => i.id === d.fromId);
    const to   = placedItems.find(i => i.id === d.toId);
    return (
      (from?.type === 'pump'         && to?.type === 'pump-factory') ||
      (from?.type === 'pump-factory' && to?.type === 'steam-generator')
    );
  };

  const itemDrones = useMemo(
    () => drones.filter(d => !isLiquidRoute(d)),
    [drones, placedItems],
  );

  const liquidDrones = useMemo(
    () => drones.filter(d => isLiquidRoute(d)),
    [drones, placedItems],
  );

  const itemGroups = useMemo(
    () => groupByFrom(itemDrones, placedItems),
    [itemDrones, placedItems],
  );
  const liquidGroups = useMemo(
    () => groupByFrom(liquidDrones, placedItems),
    [liquidDrones, placedItems],
  );

  const activeUpgrades = Object.keys(upgradingDrones).length;
  const totalCount = builderHouses.length + itemDrones.length + liquidDrones.length;

  const q = search.trim().toLowerCase();
  const matchBuilding = (b) => !q || bname(b?.type, b?.id).toLowerCase().includes(q);
  const matchDrone    = (d) => {
    if (!q) return true;
    const from = placedItems.find(i => i.id === d.fromId);
    const to   = placedItems.find(i => i.id === d.toId);
    return bname(from?.type, from?.id).toLowerCase().includes(q)
        || bname(to?.type,   to?.id  ).toLowerCase().includes(q);
  };

  const filteredBuilderHouses = builderHouses.filter(matchBuilding);
  const filteredItemGroups    = itemGroups
    .map(g => ({ ...g, drones: g.drones.filter(matchDrone) }))
    .filter(g => g.drones.length > 0 || matchBuilding(g.building));
  const filteredLiquidGroups  = liquidGroups
    .map(g => ({ ...g, drones: g.drones.filter(matchDrone) }))
    .filter(g => g.drones.length > 0 || matchBuilding(g.building));

  const filteredTotal = filteredBuilderHouses.length
    + filteredItemGroups.reduce((s, g) => s + g.drones.length, 0)
    + filteredLiquidGroups.reduce((s, g) => s + g.drones.length, 0);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 980, maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 48px)',
        background: '#0d1b2a',
        border: '1.5px solid rgba(148,163,184,0.22)',
        borderRadius: 14,
        boxShadow: '0 12px 60px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'monospace',
        color: '#e2e8f0',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(129,140,248,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#818cf8', fontSize: 20,
            }}>
              <FaRobot />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#f1f5f9' }}>Управление дронами</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>
                {totalCount} дронов · макс. {MAX_CONCURRENT_UPGRADES} улучшений одновременно
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, fontSize: 13, color: '#94a3b8' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <FaCoins style={{ color: '#fbbf24' }} /> {Math.floor(coinBalance)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <GiAnvilImpact style={{ color: '#94a3b8' }} /> {ingots.iron ?? 0} жел.
              </span>
            </div>
            <div style={{
              padding: '4px 14px', borderRadius: 20,
              background: activeUpgrades >= MAX_CONCURRENT_UPGRADES
                ? 'rgba(239,68,68,0.15)' : 'rgba(74,222,128,0.1)',
              border: `1px solid ${activeUpgrades >= MAX_CONCURRENT_UPGRADES
                ? 'rgba(239,68,68,0.4)' : 'rgba(74,222,128,0.3)'}`,
              color: activeUpgrades >= MAX_CONCURRENT_UPGRADES ? '#f87171' : '#4ade80',
              fontSize: 12, fontWeight: 700,
            }}>
              {activeUpgrades}/{MAX_CONCURRENT_UPGRADES} улучш.
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 6, width: 30, height: 30, padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748b', cursor: 'pointer', fontSize: 14,
              }}
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div style={{
          padding: '8px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(0,0,0,0.25)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(148,163,184,0.15)',
            borderRadius: 8,
            padding: '6px 12px',
          }}>
            <FaSearch style={{ color: '#475569', fontSize: 13, flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.stopPropagation()}
              onKeyUp={e => e.stopPropagation()}
              placeholder="Поиск по зданию или маршруту…"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: '#e2e8f0', fontSize: 12, fontFamily: 'monospace',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer',
                  color: '#475569', fontSize: 13, padding: 0, display: 'flex' }}
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>

        {/* Scroll body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {filteredTotal === 0 && (
            <div style={{ textAlign: 'center', color: '#475569', padding: 40, fontSize: 13 }}>
              <FaSearch style={{ fontSize: 28, display: 'block', margin: '0 auto 10px', color: '#334155' }} />
              {q ? `Ничего не найдено по «${search}»` : 'Дронов нет. Постройте Дом строителя или добавьте маршруты дронов.'}
            </div>
          )}

          {filteredBuilderHouses.length > 0 && (
            <div>
              <SectionHeader icon={FaHardHat} color="#fb923c" title="СТРОИТЕЛЬНЫЕ ДРОНЫ" count={filteredBuilderHouses.length} />
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
                gap: 8,
              }}>
                {filteredBuilderHouses.map(item => (
                  <BuilderCard key={item.id} item={item} buildingLevels={buildingLevels} />
                ))}
              </div>
            </div>
          )}

          {itemDrones.length > 0 && (
            <div>
              <SectionHeader icon={FaTruck} color="#818cf8" title="ТРАНСПОРТНЫЕ ДРОНЫ (ПРЕДМЕТЫ)" count={filteredItemGroups.reduce((s,g)=>s+g.drones.length,0)} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredItemGroups.map(({ fromId, building, drones: gd }) => (
                  <div key={fromId}>
                    <BuildingGroupHeader building={building} drones={gd} placedItems={placedItems} count={gd.length} color="#818cf8" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 8 }}>
                      {gd.map(d => (
                        <DroneRouteCard
                          key={d.id}
                          drone={d}
                          placedItems={placedItems}
                          level={droneRouteLevels[d.id] ?? 1}
                          ingots={ingots}
                          coinBalance={coinBalance}
                          upgradingDrones={upgradingDrones}
                          onUpgrade={onUpgrade}
                          isLiquid={false}
                          showFrom={false}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {liquidDrones.length > 0 && (
            <div>
              <SectionHeader icon={GiWaterDrop} color="#38bdf8" title="ЖИДКОСТНЫЕ ДРОНЫ" count={filteredLiquidGroups.reduce((s,g)=>s+g.drones.length,0)} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredLiquidGroups.map(({ fromId, building, drones: gd }) => (
                  <div key={fromId}>
                    <BuildingGroupHeader building={building} drones={gd} placedItems={placedItems} count={gd.length} color="#38bdf8" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 8 }}>
                      {gd.map(d => (
                        <DroneRouteCard
                          key={d.id}
                          drone={d}
                          placedItems={placedItems}
                          level={droneRouteLevels[d.id] ?? 1}
                          ingots={ingots}
                          coinBalance={coinBalance}
                          upgradingDrones={upgradingDrones}
                          onUpgrade={onUpgrade}
                          isLiquid={true}
                          showFrom={false}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

}
