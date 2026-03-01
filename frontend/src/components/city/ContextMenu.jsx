import { useState, useEffect } from 'react';
import { getLevelConfig, getNextLevelConfig, checkUpgrade } from '../systems/upgrades.js';
import { canBeSource } from '../systems/conveyor.js';
import {
  FaSun, FaBatteryFull, FaLightbulb, FaIndustry, FaLandmark,
  FaHardHat, FaLink, FaBolt, FaCodeBranch, FaHome, FaMedal,
  FaStar, FaArrowUp, FaArrowsAlt, FaTrash, FaTimes, FaCog,
  FaExclamationTriangle, FaHammer, FaShieldAlt, FaChessRook, FaCoins,
  FaRobot, FaLongArrowAltRight, FaPlus,
} from 'react-icons/fa';
import { MdCallMerge } from 'react-icons/md';
import { GiMining } from 'react-icons/gi';

// ─── Display names ───────────────────────────────────────────────────────────
const BUILDING_LABELS = {
  'solar-panel':    'Солнечная панель',
  'money-factory':  'Денежная фабрика',
  'energy-storage': 'Хранилище энергии',
  'town-hall':      'Ратуша',
  'street-lamp':    'Фонарь',
  'splitter':       'Распределитель',
  'merger':         'Соединитель',
  'conveyor':       'Конвейер',
  'cable':          'Энергокабель',
  'extractor':      'Добытчик руды',
  'builder-house':  'Дом строителя',
  'wall':           'Стена',
  'tower':          'Башня',
  'drone':          'Маршрут дрона',
};

const BUILDING_ICONS = {
  'solar-panel':    FaSun,
  'money-factory':  FaIndustry,
  'energy-storage': FaBatteryFull,
  'town-hall':      FaLandmark,
  'street-lamp':    FaLightbulb,
  'splitter':       FaCodeBranch,
  'merger':         MdCallMerge,
  'conveyor':       FaLink,
  'cable':          FaBolt,
  'extractor':      GiMining,
  'builder-house':  FaHome,
  'wall':           FaShieldAlt,
  'tower':          FaChessRook,
  'drone':          FaRobot,
};

// Types that cannot be "moved"
const LINK_TYPES = new Set(['conveyor', 'cable', 'wall', 'tower', 'drone']);

// Types that have no points/XP upgrade
const NO_UPGRADE_TYPES = new Set(['conveyor', 'cable', 'drone']);

const LEVEL_COLORS = ['', '#4ade80', '#fbbf24', '#f97316', '#ef4444', '#a855f7', '#38bdf8', '#f43f5e'];

// ─── Stat extraction per level config ────────────────────────────────────────
function getStatRows(type, level) {
  const cfg = getLevelConfig(type, level);
  if (!cfg) return [];
  const rows = [];
  if (cfg.rateMultiplier !== undefined)    rows.push({ label: 'Скорость',     value: `×${cfg.rateMultiplier}` });
  if (cfg.capacityMultiplier !== undefined) rows.push({ label: 'Ёмкость',      value: `×${cfg.capacityMultiplier}` });
  if (cfg.coinsPerPoint !== undefined)      rows.push({ label: 'Монет / балл', value: cfg.coinsPerPoint });
  if (cfg.buildersCount !== undefined)      rows.push({ label: 'Строителей',   value: cfg.buildersCount });
  if (cfg.oreType !== undefined)            rows.push({ label: 'Руда',         value: `${cfg.oreIcon ?? ''} ${cfg.oreType}` });
  return rows;
}

// ─── Reusable button ─────────────────────────────────────────────────────────
function Btn({ children, color = '#4ade80', disabled, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: 1, padding: '9px 0',
        border: `1.5px solid ${disabled ? '#334155' : color}`,
        borderRadius: 8,
        background: hover && !disabled ? `${color}22` : 'rgba(15,23,42,0.8)',
        color: disabled ? '#475569' : color,
        fontWeight: 700, fontSize: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        transition: 'background 0.15s, color 0.15s',
        fontFamily: 'monospace',
      }}
    >
      {children}
    </button>
  );
}

// ─── Centered building info modal ─────────────────────────────────────────────
/**
 * Centered overlay modal replacing the old small right-click popup.
 *
 * Props:
 *   itemId          – id of the building / drone / wall / tower
 *   itemType        – type string
 *   itemLevel       – current level number
 *   totalPoints     – user platform points
 *   userXp          – user XP
 *   freeBuilders    – free builder count
 *   drones          – full drones array [{id, fromId, toId}]
 *   placedItems     – full placedItems array [{id, type, ...}]
 *   onSell / onMove / onUpgrade / onClose – callbacks
 *   onAddDroneRoute – (fromId) => void — starts drone mode from this building
 *   onDeleteDrone   – (droneId) => void — removes a drone route
 *   upgradeInfo     – { startReal, durationMs } | null
 *   coinUpgradeNext – { name, level, coinCost, canAfford, description } | null
 *   x, y            – kept for backward compat but ignored (modal is centered)
 */
export function ContextMenu({
  itemId,
  itemType,
  itemLevel = 1,
  totalPoints = 0,
  userXp = 0,
  freeBuilders = 0,
  drones = [],
  placedItems = [],
  onSell,
  onMove,
  onUpgrade,
  onClose,
  onAddDroneRoute,
  onDeleteDrone,
  upgradeInfo = null,
  coinUpgradeNext = null,
  // eslint-disable-next-line no-unused-vars
  x, y,
}) {
  const [, setTick] = useState(0);

  // Tick every second while upgrade is in progress
  useEffect(() => {
    if (!upgradeInfo) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [upgradeInfo]); // eslint-disable-line

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Upgrade state ──────────────────────────────────────────────────────────
  const upgradeProgress = upgradeInfo
    ? Math.min(1, (Date.now() - upgradeInfo.startReal) / upgradeInfo.durationMs)
    : null;
  const upgradeSecLeft = upgradeInfo
    ? Math.max(0, Math.ceil((upgradeInfo.startReal + upgradeInfo.durationMs - Date.now()) / 1000))
    : null;

  const nextLevel    = !NO_UPGRADE_TYPES.has(itemType) && !coinUpgradeNext
    ? getNextLevelConfig(itemType, itemLevel)
    : null;
  const upgradeCheck = nextLevel ? checkUpgrade(itemType, itemLevel, totalPoints, userXp) : null;
  const noBuilder    = freeBuilders <= 0;
  const canDoUpgrade = upgradeCheck?.ok === true && !noBuilder && upgradeProgress === null;
  const levelColor   = LEVEL_COLORS[itemLevel] ?? '#4ade80';

  // ── Stat rows ──────────────────────────────────────────────────────────────
  const currentStats = getStatRows(itemType, itemLevel);
  const nextStats    = (nextLevel || coinUpgradeNext) ? getStatRows(itemType, itemLevel + 1) : [];
  const hasStats     = currentStats.length > 0;
  const currentCfg   = getLevelConfig(itemType, itemLevel);
  const nextCfg      = nextLevel ?? (coinUpgradeNext ? getLevelConfig(itemType, itemLevel + 1) : null);

  // ── Drones ─────────────────────────────────────────────────────────────────
  const relatedDrones = drones.filter(d => d.fromId === itemId || d.toId === itemId);
  function getBuildingLabel(id) {
    const item = placedItems.find(i => i.id === id);
    if (!item) return `#${id}`;
    return BUILDING_LABELS[item.type] ?? item.type;
  }

  const Icon = BUILDING_ICONS[itemType] ?? FaHammer;

  return (
    /* Backdrop — click outside closes modal */
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 3000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseDown={onClose}
    >
      {/* Modal panel */}
      <div
        style={{
          background: 'rgba(10,15,28,0.98)',
          border: '1px solid rgba(99,102,241,0.45)',
          borderRadius: 16,
          boxShadow: '0 12px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
          width: 500,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          fontFamily: 'monospace',
          userSelect: 'none',
          color: '#e2e8f0',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px 12px',
          borderBottom: '1px solid rgba(99,102,241,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(99,102,241,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#818cf8', fontSize: 18, flexShrink: 0,
            }}>
              <Icon />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>
                {BUILDING_LABELS[itemType] ?? 'Постройка'}
              </div>
              {currentCfg?.name && (
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{currentCfg.name}</div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              padding: '4px 12px', borderRadius: 20,
              background: `${levelColor}22`, border: `1px solid ${levelColor}55`,
              color: levelColor, fontWeight: 900, fontSize: 12, letterSpacing: 0.8,
            }}>
              Ур. {itemLevel}
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 6, width: 28, height: 28, padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748b', cursor: 'pointer', fontSize: 13,
              }}
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* ── Stats section ── */}
        {hasStats && (
          <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(99,102,241,0.18)' }}>
            <div style={{ fontSize: 10, color: '#475569', letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>
              ХАРАКТЕРИСТИКИ
            </div>
            {(nextLevel || coinUpgradeNext) && (
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 24px 1fr', gap: 4, marginBottom: 6 }}>
                <div />
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textAlign: 'center' }}>Ур. {itemLevel}</div>
                <div />
                <div style={{ fontSize: 10, color: '#4ade80', fontWeight: 700, textAlign: 'center' }}>Ур. {itemLevel + 1}</div>
              </div>
            )}
            {currentStats.map((row, i) => {
              const nextRow = nextStats[i];
              const changed = nextRow && String(nextRow.value) !== String(row.value);
              return (
                <div
                  key={row.label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: (nextLevel || coinUpgradeNext) ? '120px 1fr 24px 1fr' : '120px 1fr',
                    gap: 4, alignItems: 'center',
                    padding: '4px 0',
                    borderTop: i > 0 ? '1px solid rgba(99,102,241,0.1)' : 'none',
                  }}
                >
                  <div style={{ fontSize: 11, color: '#64748b' }}>{row.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', textAlign: 'center' }}>{row.value}</div>
                  {(nextLevel || coinUpgradeNext) && (
                    <>
                      <div style={{ color: '#334155', fontSize: 10, textAlign: 'center' }}>→</div>
                      <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'center', color: changed ? '#4ade80' : '#475569' }}>
                        {nextRow?.value ?? '—'}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {currentCfg?.description && (
              <div style={{ marginTop: 8, fontSize: 10, color: '#64748b', lineHeight: 1.5 }}>
                {currentCfg.description}
                {nextCfg?.description && (nextLevel || coinUpgradeNext) && (
                  <> <span style={{ color: '#334155' }}>→</span>{' '}
                    <span style={{ color: '#4ade80' }}>{nextCfg.description}</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Points / XP upgrade cost ── */}
        {nextLevel && upgradeProgress === null && (
          <div style={{ padding: '10px 18px', borderBottom: '1px solid rgba(99,102,241,0.18)', background: 'rgba(99,102,241,0.04)' }}>
            <div style={{ fontSize: 10, color: '#475569', letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>СТОИМОСТЬ УЛУЧШЕНИЯ</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <FaMedal style={{ color: '#fbbf24' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: totalPoints >= nextLevel.pointsCost ? '#4ade80' : '#f87171' }}>
                  {nextLevel.pointsCost} баллов
                </span>
                <span style={{ fontSize: 10, color: '#475569' }}>(у вас: {totalPoints})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <FaStar style={{ color: '#818cf8' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: userXp >= nextLevel.xpRequired ? '#4ade80' : '#f87171' }}>
                  {nextLevel.xpRequired} XP
                </span>
                <span style={{ fontSize: 10, color: '#475569' }}>(у вас: {userXp})</span>
              </div>
            </div>
            {upgradeCheck?.ok === true && noBuilder && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}>
                <FaHardHat /> Нет свободных строителей!
              </div>
            )}
            {upgradeCheck?.ok === false && upgradeCheck?.reason && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}>
                <FaExclamationTriangle /> {upgradeCheck.reason}
              </div>
            )}
            {nextLevel.upgradeDurationMs > 0 && (
              <div style={{ marginTop: 6, fontSize: 10, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <FaCog /> Время строительства: {Math.round(nextLevel.upgradeDurationMs / 1000)}с
              </div>
            )}
          </div>
        )}

        {/* ── Coin upgrade (walls / towers) ── */}
        {coinUpgradeNext && upgradeProgress === null && (
          <div style={{ padding: '10px 18px', borderBottom: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.04)' }}>
            <div style={{ fontSize: 10, color: '#475569', letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>УЛУЧШЕНИЕ ЗА МОНЕТЫ</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>→ {coinUpgradeNext.name}</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>Ур. {coinUpgradeNext.level}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <FaCoins style={{ color: '#fbbf24' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: coinUpgradeNext.canAfford ? '#4ade80' : '#f87171' }}>
                {coinUpgradeNext.coinCost} монет
              </span>
              {!coinUpgradeNext.canAfford && <span style={{ fontSize: 10, color: '#f87171' }}>— недостаточно!</span>}
            </div>
            {coinUpgradeNext.description && (
              <div style={{ marginTop: 6, fontSize: 10, color: '#94a3b8' }}>{coinUpgradeNext.description}</div>
            )}
          </div>
        )}

        {/* ── Upgrade in progress ── */}
        {upgradeProgress !== null && (
          <div style={{ padding: '10px 18px', borderBottom: '1px solid rgba(251,191,36,0.2)' }}>
            <div style={{ fontSize: 14, color: '#fbbf24', letterSpacing: 1, marginBottom: 6, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FaCog style={{ animation: 'spin 2s linear infinite' }} />
              УЛУЧШЕНИЕ В ПРОЦЕССЕ — {Math.round(upgradeProgress * 100)}% · {upgradeSecLeft}с
            </div>
            <div style={{ height: 6, background: '#0f172a', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${Math.round(upgradeProgress * 100)}%`,
                background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                borderRadius: 4, transition: 'width 0.9s',
              }} />
            </div>
          </div>
        )}

        {/* ── Drone routes ── */}
        {(relatedDrones.length > 0 || canBeSource(itemType)) && (
          <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(99,102,241,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: '#475569', letterSpacing: 1, fontWeight: 700 }}>
                МАРШРУТЫ ДРОНОВ{relatedDrones.length > 0 ? ` (${relatedDrones.length})` : ''}
              </div>
              {canBeSource(itemType) && onAddDroneRoute && (
                <button
                  onClick={() => { onAddDroneRoute(itemId); onClose(); }}
                  style={{
                    background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)',
                    borderRadius: 6, padding: '3px 10px',
                    color: '#818cf8', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'monospace',
                  }}
                >
                  <FaPlus style={{ fontSize: 9 }} /> Добавить маршрут
                </button>
              )}
            </div>
            {relatedDrones.length === 0 && (
              <div style={{ fontSize: 10, color: '#334155', fontStyle: 'italic' }}>Нет активных маршрутов</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {relatedDrones.map(drone => (
                <div
                  key={drone.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 10px', background: 'rgba(99,102,241,0.07)',
                    borderRadius: 6, fontSize: 11, color: '#94a3b8',
                  }}
                >
                  <FaRobot style={{ color: '#818cf8', flexShrink: 0 }} />
                  <span style={{ color: drone.fromId === itemId ? '#f1f5f9' : '#94a3b8', fontWeight: drone.fromId === itemId ? 700 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getBuildingLabel(drone.fromId)}
                  </span>
                  <FaLongArrowAltRight style={{ color: '#334155', flexShrink: 0 }} />
                  <span style={{ color: drone.toId === itemId ? '#f1f5f9' : '#94a3b8', fontWeight: drone.toId === itemId ? 700 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getBuildingLabel(drone.toId)}
                  </span>
                  {onDeleteDrone && (
                    <button
                      onClick={() => onDeleteDrone(drone.id)}
                      style={{
                        background: 'transparent', border: 'none',
                        color: '#475569', cursor: 'pointer', padding: '2px 4px',
                        flexShrink: 0, display: 'flex', alignItems: 'center',
                        borderRadius: 4, fontSize: 12,
                      }}
                      title="Удалить маршрут"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div style={{ padding: '12px 18px', display: 'flex', gap: 8 }}>
          {!LINK_TYPES.has(itemType) && (
            <Btn color="#60a5fa" onClick={onMove}>
              <FaArrowsAlt /> Переместить
            </Btn>
          )}
          <Btn color="#f87171" onClick={onSell}>
            <FaTrash /> Удалить
          </Btn>
          {nextLevel && upgradeProgress === null && !coinUpgradeNext && (
            <Btn color="#4ade80" disabled={!canDoUpgrade} onClick={canDoUpgrade ? onUpgrade : undefined}>
              <FaArrowUp /> Улучшить
            </Btn>
          )}
          {coinUpgradeNext && upgradeProgress === null && (
            <Btn color="#fbbf24" disabled={!coinUpgradeNext.canAfford} onClick={coinUpgradeNext.canAfford ? onUpgrade : undefined}>
              <FaCoins /> Улучшить
            </Btn>
          )}
        </div>

      </div>
    </div>
  );
}
