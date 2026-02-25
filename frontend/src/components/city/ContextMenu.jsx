import { useState, useEffect, useRef } from 'react';
import { getNextLevelConfig, checkUpgrade } from '../systems/upgrades.js';
import {
  FaSun, FaBatteryFull, FaLightbulb, FaIndustry, FaLandmark,
  FaHardHat, FaLink, FaBolt, FaCodeBranch, FaHome, FaMedal,
  FaStar, FaArrowUp, FaArrowsAlt, FaTrash, FaTimes, FaCog,
  FaExclamationTriangle, FaHammer, FaShieldAlt, FaChessRook, FaCoins,
} from 'react-icons/fa';
import { MdCallMerge } from 'react-icons/md';
import { GiMining } from 'react-icons/gi';

// ─── Display names ───────────────────────────────────────────────────
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
};

// Types that cannot be "moved" (connections, not buildings)
const LINK_TYPES = new Set(['conveyor', 'cable', 'wall', 'tower']);

// Types that can be upgraded
const NO_UPGRADE_TYPES = new Set(['conveyor', 'cable']);

// Level accent colours (same palette as SharedUI)
const LEVEL_COLORS = ['', '#4ade80', '#fbbf24', '#f97316', '#ef4444'];

// ─── Single action row ─────────────────────────────────────────────────────────
function ContextAction({ icon, label, color, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{
        display:     'flex',
        alignItems:  'center',
        gap:         10,
        padding:     '9px 16px',
        cursor:      'pointer',
        background:  hover ? 'rgba(99,102,241,0.18)' : 'transparent',
        color,
        fontWeight:  600,
        fontSize:    13,
        transition:  'background 0.12s',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onMouseDown={(e) => { e.stopPropagation(); onClick(); }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

// ─── Context menu ──────────────────────────────────────────────────────────────
/**
 * @param {{ x, y, itemType, itemLevel, totalPoints, userXp, onSell, onMove, onUpgrade, onClose, upgradeInfo }} props
 */
export function ContextMenu({ x, y, itemType, itemLevel = 1, totalPoints = 0, userXp = 0, freeBuilders = 0, onSell, onMove, onUpgrade, onClose, upgradeInfo = null, coinUpgradeNext = null }) {
  const ref = useRef(null);
  const [, setTick] = useState(0);

  // Tick every second while an upgrade is in progress to refresh progress display
  useEffect(() => {
    if (!upgradeInfo) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [upgradeInfo]); // eslint-disable-line

  // Compute upgrade progress if ongoing
  const upgradeProgress = upgradeInfo
    ? Math.min(1, (Date.now() - upgradeInfo.startReal) / upgradeInfo.durationMs)
    : null;
  const upgradeSecLeft = upgradeInfo
    ? Math.max(0, Math.ceil((upgradeInfo.startReal + upgradeInfo.durationMs - Date.now()) / 1000))
    : null;

  const nextLevel   = !NO_UPGRADE_TYPES.has(itemType) && !coinUpgradeNext ? getNextLevelConfig(itemType, itemLevel) : null;
  const upgradeCheck = nextLevel ? checkUpgrade(itemType, itemLevel, totalPoints, userXp) : null;
  const noBuilder     = freeBuilders <= 0;
  const canDoUpgrade  = upgradeCheck?.ok === true && !noBuilder;
  const levelColor   = LEVEL_COLORS[itemLevel] ?? '#4ade80';

  // Adjust position so menu doesn't overflow viewport
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const menuW = 220;
  const menuH = nextLevel ? 280 : 160;
  const left = x + menuW > vw ? x - menuW : x;
  const top  = y + menuH > vh ? y - menuH : y;

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    // small delay so the same mousedown that opened the menu doesn't close it
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position:     'fixed',
        left,
        top,
        zIndex:       2000,
        minWidth:     menuW,
        background:   'rgba(10,15,28,0.97)',
        border:       '1px solid rgba(99,102,241,0.45)',
        borderRadius: 12,
        boxShadow:    '0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
        overflow:     'hidden',
        fontFamily:   'monospace',
        userSelect:   'none',
      }}
    >
      {/* Header */}
      <div style={{
        padding:      '10px 16px',
        borderBottom: '1px solid rgba(99,102,241,0.3)',
        fontWeight:   700,
        fontSize:     12,
        color:        '#818cf8',
        letterSpacing: 0.5,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {(() => { const Ic = BUILDING_ICONS[itemType] ?? FaHammer; return <Ic style={{ opacity: 0.8 }} />; })()}
          {BUILDING_LABELS[itemType] ?? 'Постройка'}
        </span>
        {itemLevel > 1 && (
          <span style={{ color: levelColor, fontWeight: 900, fontSize: 11, letterSpacing: 1 }}>
            Ур. {itemLevel}
          </span>
        )}
      </div>

      {/* Upgrade in progress — show progress bar when timed upgrade is running */}
      {upgradeProgress !== null && (
        <div style={{
          padding:      '8px 14px 8px',
          borderBottom: '1px solid rgba(251,191,36,0.25)',
        }}>
          <div style={{ fontSize: 10, color: '#fbbf24', letterSpacing: 0.8, marginBottom: 5, fontWeight: 700 }}>УЛУЧШЕНИЕ В ПРОЦЕССЕ</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
            <FaCog style={{ marginRight: 4, verticalAlign: 'middle', animation: 'spin 2s linear infinite' }} />
            {Math.round(upgradeProgress * 100)}% · {upgradeSecLeft}с
          </div>
          <div style={{ height: 5, background: '#1e293b', borderRadius: 4 }}>
            <div style={{
              height:       '100%',
              width:        `${Math.round(upgradeProgress * 100)}%`,
              background:   'linear-gradient(90deg, #f59e0b, #fbbf24)',
              borderRadius: 4,
              transition:   'width 0.9s',
            }} />
          </div>
        </div>
      )}

      {/* Coin-based upgrade panel (walls / towers) */}
      {coinUpgradeNext && upgradeProgress === null && (
        <div style={{
          padding:      '8px 14px 4px',
          borderBottom: '1px solid rgba(251,191,36,0.18)',
        }}>
          <div style={{ fontSize: 10, color: '#64748b', letterSpacing: 0.8, marginBottom: 5 }}>УЛУЧШЕНИЕ</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 5 }}>
            {coinUpgradeNext.name}
            <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
              Ур. {coinUpgradeNext.level}
            </span>
          </div>
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600,
              color: coinUpgradeNext.canAfford ? '#4ade80' : '#f87171',
              display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <FaCoins /> {coinUpgradeNext.coinCost} монет
            </span>
          </div>
          {coinUpgradeNext.description && (
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>
              {coinUpgradeNext.description}
            </div>
          )}
          {!coinUpgradeNext.canAfford && (
            <div style={{ fontSize: 10, color: '#f87171', marginBottom: 2,
              display: 'flex', alignItems: 'center', gap: 4 }}>
              <FaCoins /> Мало монет!
            </div>
          )}
        </div>
      )}
      {coinUpgradeNext && upgradeProgress === null && (
        <ContextAction
          icon={<FaArrowUp />}
          label={coinUpgradeNext.canAfford ? `Улучшить до ${coinUpgradeNext.name}` : 'Улучшить'}
          color={coinUpgradeNext.canAfford ? '#4ade80' : '#475569'}
          onClick={coinUpgradeNext.canAfford ? onUpgrade : () => {}}
        />
      )}

      {/* Upgrade panel (only shown when NOT currently upgrading) */}
      {nextLevel && upgradeProgress === null && (
        <div style={{
          padding:      '8px 14px 4px',
          borderBottom: '1px solid rgba(99,102,241,0.18)',
        }}>
          <div style={{ fontSize: 10, color: '#64748b', letterSpacing: 0.8, marginBottom: 5 }}>УЛУЧШЕНИЕ</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 5 }}>
            {nextLevel.name}
            <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
              Ур. {nextLevel.level}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600,
              color: totalPoints >= nextLevel.pointsCost ? '#4ade80' : '#f87171',
              display: 'flex', alignItems: 'center', gap: 4 }}>
              <FaMedal /> {nextLevel.pointsCost} баллов
            </span>
            <span style={{ fontSize: 11, fontWeight: 600,
              color: userXp >= nextLevel.xpRequired ? '#4ade80' : '#f87171',
              display: 'flex', alignItems: 'center', gap: 4 }}>
              <FaStar /> {nextLevel.xpRequired} XP
            </span>
          </div>
          {nextLevel.description && (
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>
              {nextLevel.description}
            </div>
          )}
          {!canDoUpgrade && upgradeCheck?.reason && (
            <div style={{ fontSize: 10, color: '#f87171', marginBottom: 2,
              display: 'flex', alignItems: 'center', gap: 4 }}>
              <FaExclamationTriangle /> {upgradeCheck.reason}
            </div>
          )}
          {upgradeCheck?.ok === true && noBuilder && (
            <div style={{ fontSize: 10, color: '#f87171', marginBottom: 2,
              display: 'flex', alignItems: 'center', gap: 4 }}>
              <FaHardHat /> Нет свободных строителей!
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {nextLevel && upgradeProgress === null && (
        <ContextAction
          icon={<FaArrowUp />}
          label={canDoUpgrade ? `Улучшить до ${nextLevel.name}` : 'Улучшить'}
          color={canDoUpgrade ? '#4ade80' : '#475569'}
          onClick={canDoUpgrade ? onUpgrade : () => {}}
        />
      )}
      {!LINK_TYPES.has(itemType) && (
        <ContextAction
          icon={<FaArrowsAlt />}
          label="Переместить"
          color="#60a5fa"
          onClick={onMove}
        />
      )}
      <ContextAction
        icon={<FaTrash />}
        label="Удалить"
        color="#f87171"
        onClick={onSell}
      />
      <div style={{ height: 1, background: 'rgba(99,102,241,0.2)', margin: '2px 0' }} />
      <ContextAction
        icon={<FaTimes />}
        label="Закрыть"
        color="#64748b"
        onClick={onClose}
      />
    </div>
  );
}
