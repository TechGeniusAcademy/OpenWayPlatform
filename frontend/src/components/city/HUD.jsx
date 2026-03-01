import { ENERGY_TYPES } from '../systems/energy.js';
import styles from '../OpenCity.module.css';
import {
  FaStore, FaTrophy, FaWrench, FaLink,
  FaSun, FaCoins, FaBolt, FaMoon, FaCloudSun,
  FaShieldAlt, FaChessRook,
} from 'react-icons/fa';
import { MdArrowBack } from 'react-icons/md';
import { GiBattery100, GiMining, GiFireBowl, GiWhirlwind } from 'react-icons/gi';

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

export function HUD({ pos, zoom, selectedCount, onClearSelection, onShop, onBack, placingItem, timeString, energyTotals, storageTotals, droneMode, droneFromId, wallMode, wallFromPoint, towerMode, points, fps, debugOpen, onToggleDebug, rendererStats, itemsCount, dronesCount }) {
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
          {Object.entries(energyTotals).map(([type, val]) => {
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

      {points > 0 && (
        <div className={styles.energyPanel} style={{ marginTop: 6, borderColor: 'rgba(245,158,11,0.6)', background: 'rgba(120,60,0,0.72)' }}>
          <div className={styles.energyRow} style={{ color: '#fbbf24' }}>
            <span><FaTrophy style={{ verticalAlign: 'middle' }} /></span>
            <span>Очки города</span>
            <strong>{points}</strong>
          </div>
        </div>
      )}

      {storageTotals && Object.keys(storageTotals).length > 0 && (
        <div className={styles.energyPanel} style={{ marginTop: 6, borderColor: 'rgba(168,85,247,0.4)' }}>
          {Object.entries(storageTotals).map(([type, val]) => {
            const meta = ENERGY_TYPES[type];
            return (
              <div key={type} className={styles.energyRow} style={{ color: '#d8b4fe' }}>
                <span><GiBattery100 style={{ verticalAlign: 'middle' }} /></span>
                <span>{meta?.label ?? type} запас</span>
                <strong>{val} {meta?.unit ?? ''}</strong>
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
      <button className={styles.backBtn} onClick={onBack}>
        <MdArrowBack style={{ verticalAlign: 'middle', marginRight: 4 }} /> Назад
      </button>

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
