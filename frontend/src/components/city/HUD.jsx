import { useState, useEffect } from 'react';
import { ENERGY_TYPES } from '../systems/energy.js';
import styles from '../OpenCity.module.css';
import {
  FaStore, FaTrophy, FaWrench, FaLink, FaRobot,
  FaSun, FaCoins, FaBolt, FaMoon, FaCloudSun,
  FaShieldAlt, FaChessRook,
  FaBatteryFull, FaLightbulb, FaIndustry, FaLandmark, FaHome,
  FaHardHat, FaArrowUp, FaBuilding, FaMedal, FaFighterJet,
} from 'react-icons/fa';
import { MdArrowBack } from 'react-icons/md';
import { GiBattery100, GiMining, GiFireBowl, GiWhirlwind } from 'react-icons/gi';

// ─── City Info Panel (right side) ───────────────────────────────────────────
const PROD_ICONS = {
  solar: { Icon: FaSun,        color: '#fde047' },
  wind:  { Icon: GiWhirlwind,  color: '#7dd3fc' },
  fuel:  { Icon: GiFireBowl,   color: '#fb923c' },
  coins: { Icon: FaCoins,      color: '#fbbf24' },
  ore:   { Icon: GiMining,     color: '#a8874a' },
};

function SectionTitle({ icon: Icon, color, title }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      marginBottom: 8, paddingBottom: 6,
      borderBottom: `1px solid ${color}33`,
    }}>
      <Icon style={{ color, fontSize: 12 }} />
      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color, textTransform: 'uppercase' }}>
        {title}
      </span>
    </div>
  );
}

function InfoRow({ label, value, unit = '', color = '#e2e8f0', icon: Icon, iconColor, highlight }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748b', fontSize: 11 }}>
        {Icon && <Icon style={{ color: iconColor ?? '#64748b', fontSize: 11 }} />}
        <span>{label}</span>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
        color,
        background: highlight ? `${color}18` : 'transparent',
        borderRadius: 4, padding: highlight ? '1px 5px' : '0',
      }}>
        {value}{unit ? <span style={{ fontWeight: 400, color: '#475569', marginLeft: 2 }}>{unit}</span> : null}
      </span>
    </div>
  );
}

function CityInfoPanel({ energyTotals, storageTotals, storedCurrentTotals, points, userPoints, coinBalance, freeBuilders, totalBuilders, constructingCount, upgradingCount, itemsCount, dronesCount, timeString, ingots, oreRates }) {
  const hasProd    = energyTotals  && Object.keys(energyTotals).length  > 0;

  const buildersOk   = (freeBuilders ?? 0) > 0;
  const busyBuilders = (totalBuilders ?? 0) - (freeBuilders ?? 0);

  return (
    <div style={{
      position: 'fixed', right: 12, top: '50%', transform: 'translateY(-50%)',
      width: 210,
      background: 'rgba(8,15,28,0.84)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 14,
      backdropFilter: 'blur(14px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      zIndex: 900,
      overflow: 'hidden',
      pointerEvents: 'all',
    }}>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── Экономика ── */}
          <div>
            <SectionTitle icon={FaCoins} color="#fbbf24" title="Экономика" />
            <InfoRow label="Баллы (личные)" value={userPoints ?? 0} icon={FaMedal}    iconColor="#818cf8" color="#a5b4fc" />
            <InfoRow label="Баллы в городе"    value={points ?? 0}     icon={FaTrophy}   iconColor="#f59e0b" color="#fde047" />
            <InfoRow label="Монеты в запасе" value={Math.floor(coinBalance ?? 0)} unit=" ₿" icon={FaCoins} iconColor="#fbbf24" color="#fbbf24" highlight />
          </div>

          {/* ── Выработка ── */}
          {hasProd && (
            <div>
              <SectionTitle icon={FaArrowUp} color="#4ade80" title="Выработка / ч" />
              {Object.entries(energyTotals).map(([type, val]) => {
                const meta = ENERGY_TYPES[type];
                const ic   = PROD_ICONS[type];
                return (
                  <InfoRow
                    key={type}
                    label={meta?.label ?? type}
                    value={val}
                    unit={` ${meta?.unit ?? ''}/ч`}
                    icon={ic?.Icon ?? FaBolt}
                    iconColor={ic?.color ?? '#94a3b8'}
                    color={ic?.color ?? '#94a3b8'}
                  />
                );
              })}
            </div>
          )}

          {/* ── Хранилище ── */}
          {(storedCurrentTotals && Object.keys(storedCurrentTotals).length > 0) && (
            <div>
              <SectionTitle icon={GiBattery100} color="#a78bfa" title="Хранилище" />
              {Object.entries(storedCurrentTotals).map(([type, val]) => {
                const meta = ENERGY_TYPES[type];
                const ic   = PROD_ICONS[type];
                const cap  = storageTotals?.[type];
                const display = cap
                  ? `${Math.floor(val)} / ${cap}`
                  : Math.floor(val);
                const unit  = meta?.unit ?? '';
                return (
                  <InfoRow
                    key={type}
                    label={meta?.label ?? type}
                    value={display}
                    unit={unit ? ` ${unit}` : ''}
                    icon={ic?.Icon ?? FaBatteryFull}
                    iconColor="#a78bfa"
                    color="#d8b4fe"
                  />
                );
              })}
            </div>
          )}

          {/* ── Строительство ── */}
          {(totalBuilders ?? 0) > 0 && (
            <div>
              <SectionTitle icon={FaHardHat} color="#fb923c" title="Строители" />
              <InfoRow
                label="Свободные"
                value={`${freeBuilders ?? 0} / ${totalBuilders ?? 0}`}
                icon={FaHardHat}
                iconColor={buildersOk ? '#4ade80' : '#f87171'}
                color={buildersOk ? '#4ade80' : '#f87171'}
              />
              {busyBuilders > 0 && (
                <InfoRow label="Заняты" value={busyBuilders} icon={FaWrench} iconColor="#fb923c" color="#fb923c" />
              )}
              {(constructingCount ?? 0) > 0 && (
                <InfoRow label="В строительстве" value={constructingCount} icon={FaBuilding} iconColor="#38bdf8" color="#38bdf8" />
              )}
              {(upgradingCount ?? 0) > 0 && (
                <InfoRow label="На улучшении" value={upgradingCount} icon={FaArrowUp} iconColor="#34d399" color="#34d399" />
              )}
            </div>
          )}

          {/* ── Добыча руды ── */}
          {oreRates && Object.keys(oreRates).length > 0 && (
            <div>
              <SectionTitle icon={GiMining} color="#a8874a" title="Добыча руды / ч" />
              {Object.entries(oreRates).map(([oreType, rate]) => (
                <InfoRow
                  key={oreType}
                  label={oreType}
                  value={rate.toFixed(1)}
                  unit=" ед./ч"
                  icon={GiMining}
                  iconColor="#a8874a"
                  color="#d4a96a"
                />
              ))}
            </div>
          )}

          {/* ── Слитки ── */}
          {ingots && (ingots.iron > 0 || ingots.silver > 0 || ingots.copper > 0) && (
            <div>
              <SectionTitle icon={GiMining} color="#94a3b8" title="Слитки" />
              {ingots.iron   > 0 && <InfoRow label="Железо"  value={ingots.iron}   unit=" шт." icon={GiMining} iconColor="#94a3b8" color="#cbd5e1" />}
              {ingots.silver > 0 && <InfoRow label="Серебро" value={ingots.silver} unit=" шт." icon={GiMining} iconColor="#e2e8f0" color="#f1f5f9" />}
              {ingots.copper > 0 && <InfoRow label="Медь"    value={ingots.copper} unit=" шт." icon={GiMining} iconColor="#f97316" color="#fb923c" />}
            </div>
          )}

          {/* ── Город ── */}
          <div>
            <SectionTitle icon={FaBuilding} color="#38bdf8" title="Город" />
            <InfoRow label="Зданий"  value={itemsCount  ?? 0} icon={FaBuilding} iconColor="#38bdf8" color="#7dd3fc" />
            <InfoRow label="Дронов"  value={dronesCount ?? 0} icon={FaLink}     iconColor="#a78bfa" color="#c4b5fd" />
          </div>

        </div>

    </div>
  );
}

// ─── Building Hotbar ─────────────────────────────────────────────────────────
const HOTBAR_ITEMS = [
  { key: '1', type: 'solar-panel',    Icon: FaSun,         color: '#f59e0b', name: 'Солнечная панель' },
  { key: '2', type: 'energy-storage', Icon: FaBatteryFull, color: '#22d3ee', name: 'Хранилище энергии' },
  { key: '3', type: 'street-lamp',    Icon: FaLightbulb,   color: '#fde68a', name: 'Фонарный столб' },
  { key: '4', type: 'money-factory',  Icon: FaIndustry,    color: '#818cf8', name: 'Денежная фабрика' },
  { key: '5', type: 'town-hall',      Icon: FaLandmark,    color: '#a78bfa', name: 'Ратуша' },
  { key: '6', type: 'extractor',      Icon: GiMining,      color: '#f97316', name: 'Добытчик руды' },
  { key: '7', type: 'builder-house',    Icon: FaHome,        color: '#fb923c', name: 'Дом строителя' },
  { key: '8', type: 'coal-generator',   Icon: GiFireBowl,    color: '#f97316', name: 'Угольный генератор' },
  { key: '9', type: 'hangar',            Icon: FaFighterJet,  color: '#6366f1', name: 'Военный ангар' },
];

function BuildingHotbar({ onStartPlacing, placingItem }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      const digit = parseInt(e.key, 10);
      if (digit >= 1 && digit <= HOTBAR_ITEMS.length) {
        onStartPlacing(HOTBAR_ITEMS[digit - 1].type);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onStartPlacing]);

  return (
    <div style={{
      position: 'fixed', bottom: 10, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 6,
      background: 'rgba(8,15,28,0.82)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16, padding: '8px 10px',
      backdropFilter: 'blur(12px)',
      zIndex: 1000,
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      pointerEvents: 'all',
      userSelect: 'none',
    }}>
      {HOTBAR_ITEMS.map((item, idx) => {
        const active = placingItem === item.type;
        const hov    = hoveredIdx === idx;
        return (
          <div key={item.type} style={{ position: 'relative' }}>
            {/* Tooltip */}
            {hov && (
              <div style={{
                position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(8,15,28,0.95)',
                border: `1px solid ${item.color}55`,
                borderRadius: 8, padding: '5px 10px',
                color: item.color, fontSize: 11, fontWeight: 700,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                zIndex: 1001,
              }}>
                {item.name}
              </div>
            )}
            {/* Slot */}
            <div
              onClick={() => onStartPlacing(item.type)}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                width: 52, height: 52,
                borderRadius: 12,
                background: active ? `${item.color}22` : hov ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${active ? item.color : hov ? item.color + '88' : 'rgba(255,255,255,0.12)'}`,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s ease',
                transform: hov || active ? 'translateY(-2px)' : 'none',
                boxShadow: active ? `0 0 14px ${item.color}66` : 'none',
                position: 'relative',
              }}
            >
              <item.Icon style={{
                color: active || hov ? item.color : '#94a3b8',
                fontSize: 22,
                transition: 'color 0.15s',
              }} />
              {/* Key badge */}
              <span style={{
                position: 'absolute', top: 3, left: 5,
                fontSize: 9, fontWeight: 700, lineHeight: 1,
                color: active ? item.color : '#475569',
              }}>
                {item.key}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const ENERGY_ICONS = {
  solar: FaSun,
  wind:  GiWhirlwind,
  fuel:  GiFireBowl,
  coins: FaCoins,
  ore:   GiMining,
};
function EnergyIcon({ type }) {
  const Ic = ENERGY_ICONS[type] ?? FaBolt;
  return <Ic style={{ verticalAlign: 'middle' }} />;
}
function DayPeriodIcon({ hour }) {
  const h = hour % 24;
  if (h < 5)  return <FaMoon     style={{ verticalAlign: 'middle', color: '#818cf8' }} />;
  if (h < 8)  return <FaCloudSun style={{ verticalAlign: 'middle', color: '#fb923c' }} />;
  if (h < 18) return <FaSun      style={{ verticalAlign: 'middle', color: '#fde047' }} />;
  if (h < 21) return <FaCloudSun style={{ verticalAlign: 'middle', color: '#f97316' }} />;
  return <FaMoon style={{ verticalAlign: 'middle', color: '#818cf8' }} />;
}

export function HUD({ pos, zoom, selectedCount, onClearSelection, onShop, onDrones, onBack, placingItem, timeString, energyTotals, storageTotals, droneMode, droneFromId, wallMode, wallFromPoint, towerMode, points, fps, debugOpen, onToggleDebug, rendererStats, itemsCount, dronesCount, onStartPlacing, coinBalance, freeBuilders, totalBuilders, constructingCount, upgradingCount, userPoints, allEnergyTotals, storedCurrentTotals, ingots, oreRates }) {
  const fpsColor = fps >= 50 ? '#4ade80' : fps >= 30 ? '#fbbf24' : '#f87171';

  // thresholds: [goodMax, warnMax]  — above warnMax = critical
  function stat(label, value, norm, goodMax, warnMax, fmt) {
    const v      = value ?? 0;
    const color  = v <= goodMax ? '#4ade80' : v <= warnMax ? '#fbbf24' : '#f87171';
    const status = v <= goodMax ? '✓' : v <= warnMax ? '!' : '✗';
    const sColor = v <= goodMax ? '#4ade80' : v <= warnMax ? '#fbbf24' : '#f87171';
    const display = fmt ? fmt(v) : String(v);
    return (
      <>
        <span className={styles.debugKey}>{label}</span>
        <span className={styles.debugVal} style={{ color }}>{display}</span>
        <span className={styles.debugNorm}>{norm}</span>
        <span className={styles.debugStatus} style={{ color: sColor }}>{status}</span>
      </>
    );
  }
  return (
    <>
      <div className={styles.coords}>
        X: {pos.x.toFixed(0)} &nbsp;|&nbsp; Z: {pos.z.toFixed(0)}
        &nbsp;|&nbsp; Зум: {zoom.toFixed(0)}
      </div>

      {timeString && (
        <div className={styles.gameClock}>
          <DayPeriodIcon hour={parseInt(timeString, 10)} /> {timeString}
        </div>
      )}

      {energyTotals && Object.keys(energyTotals).length > 0 && (
        <div className={styles.energyPanel}>
          {Object.entries(energyTotals).filter(([type]) => type !== 'coins').map(([type, val]) => {
            const meta = ENERGY_TYPES[type];
            return (
              <div key={type} className={styles.energyRow} style={{ color: meta?.color ?? '#fff' }}>
                <span><EnergyIcon type={type} /></span>
                <span>{meta?.label ?? type}</span>
                <strong>{val} {meta?.unit ?? ''}/ч</strong>
              </div>
            );
          })}
        </div>
      )}

      {placingItem && (
        <div className={styles.placingHint}>
          <FaWrench style={{ verticalAlign: 'middle', marginRight: 5 }} /> Перемещайте объект &nbsp;·&nbsp; <kbd>Колесо</kbd> поворот &nbsp;·&nbsp; <kbd>ЛКМ</kbd> поставить &nbsp;·&nbsp; <kbd>Esc</kbd> отмена
        </div>
      )}

      {droneMode && (
        <div className={styles.placingHint}>
          <FaLink style={{ verticalAlign: 'middle', marginRight: 5 }} />&nbsp;
          {droneFromId === null
            ? 'Нажмите на здание-источник дрона (подсвеченные — доступные цели)'
            : 'Нажмите на здание-цель для маршрута дрона'}
          &nbsp;·&nbsp; <kbd>Esc</kbd> отмена
        </div>
      )}

      {wallMode && (
        <div className={styles.placingHint}>
          <FaShieldAlt style={{ verticalAlign: 'middle', marginRight: 5 }} />&nbsp;
          {wallFromPoint
            ? 'Кликните на конечную точку стены · 20 монет/сегмент'
            : 'Кликните на начальную точку стены'}
          &nbsp;·&nbsp; <kbd>Esc</kbd> отмена
        </div>
      )}

      {towerMode && (
        <div className={styles.placingHint}>
          <FaChessRook style={{ verticalAlign: 'middle', marginRight: 5 }} />&nbsp;
          Кликните на место башни · 150 монет
          &nbsp;·&nbsp; <kbd>Esc</kbd> отмена
        </div>
      )}

      {!placingItem && selectedCount > 0 && (
        <div className={styles.selectionInfo}>
          <span>Выбрано: <strong>{selectedCount}</strong></span>
          <button className={styles.clearBtn} onClick={onClearSelection} title="Сбросить выделение">✕</button>
        </div>
      )}

      <div className={styles.miniControls}>
        <span><kbd>W A S D</kbd> панорама</span>
        <span><kbd>Q / E</kbd> поворот</span>
        <span><kbd>↕ Колесо</kbd> зум</span>
        <span><kbd>ЛКМ/ПКМ</kbd> перетащить</span>
        <span><kbd>ЛКМ</kbd> выделить объект</span>
        <span><kbd>Esc</kbd> сбросить выбор</span>
      </div>

      {!placingItem && (
        <button className={styles.shopBtn} onClick={onShop} title="Магазин построек">
          <FaStore />
        </button>
      )}
      {!placingItem && onDrones && (
        <button className={styles.dronesBtn} onClick={onDrones} title="Управление дронами">
          <FaRobot />
        </button>
      )}
      <button className={styles.backBtn} onClick={onBack}>
        <MdArrowBack style={{ verticalAlign: 'middle', marginRight: 4 }} /> Назад
      </button>

      {onStartPlacing && (
        <BuildingHotbar onStartPlacing={onStartPlacing} placingItem={placingItem} />
      )}

      <CityInfoPanel
        energyTotals={allEnergyTotals ?? energyTotals}
        storageTotals={storageTotals}
        storedCurrentTotals={storedCurrentTotals}
          ingots={ingots}
          oreRates={oreRates}
        points={points}
        userPoints={userPoints}
        coinBalance={coinBalance}
        freeBuilders={freeBuilders}
        totalBuilders={totalBuilders}
        constructingCount={constructingCount}
        upgradingCount={upgradingCount}
        itemsCount={itemsCount}
        dronesCount={dronesCount}
        timeString={timeString}
      />

      {/* FPS badge + Debug toggle — anchored below the back button */}
      <div className={styles.fpsRow}>
        <span className={styles.fpsBadge} style={{ color: fpsColor }}>
          {fps} FPS
        </span>
        <button
          className={styles.debugBtn + (debugOpen ? ' ' + styles.debugBtnActive : '')}
          onClick={onToggleDebug}
          title="Открыть/закрыть панель отладки [F3]"
        >
          F3
        </button>
      </div>

      {debugOpen && (
        <div className={styles.debugPanel}>
          <div className={styles.debugTitle}>⚙ Debug — производительность</div>
          <div className={styles.debugGridHdr}>
            <span className={styles.debugHdrCell}>Метрика</span>
            <span className={styles.debugHdrCell} style={{ textAlign:'right' }}>Текущее</span>
            <span className={styles.debugHdrCell} style={{ textAlign:'right' }}>Норма</span>
            <span className={styles.debugHdrCell} style={{ textAlign:'center' }}></span>
          </div>
          <div className={styles.debugGrid}>
            {stat('FPS',           fps,                           '≥50',   50, 30,  v => v)}
            {stat('Draw calls',    rendererStats.calls,           '<100',  100, 300)}
            {stat('Треугольники',  rendererStats.triangles,       '<200k', 200000, 600000, v => (v/1000).toFixed(0)+'k')}
            {stat('Геометрий GPU', rendererStats.geometries,      '<80',   80,  200)}
            {stat('Текстур GPU',    rendererStats.textures,        '<30',   30,  80)}
            {stat('Шейдеров',     rendererStats.programs,        '<20',   20,  50)}
          </div>
          <div className={styles.debugDivider} />
          <div className={styles.debugGrid}>
            {stat('Зданий',       itemsCount,                    '<20',   20,  40)}
            {stat('Дронов',       dronesCount,                   '<10',   10,  30)}
            {stat('Зум камеры',   zoom,                          '<40',   40,  50,  v => v.toFixed(1))}
          </div>
          <div className={styles.debugLegend}>
            <span style={{ color: '#4ade80' }}></span>
            <span style={{ color: '#fbbf24' }}></span>
            <span style={{ color: '#f87171' }}></span>
          </div>
          <div className={styles.debugHint}>[F3] или кнопка — закрыть</div>
        </div>
      )}
    </>
  );
}
