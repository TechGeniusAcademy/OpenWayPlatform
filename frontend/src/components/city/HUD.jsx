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

export function HUD({ pos, zoom, selectedCount, onClearSelection, onShop, onBack, placingItem, timeString, energyTotals, storageTotals, conveyorMode, conveyorFromId, cableMode, cableFromId, wallMode, wallFromPoint, towerMode, points }) {
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

      {conveyorMode && (
        <div className={styles.placingHint}>
          <FaLink style={{ verticalAlign: 'middle', marginRight: 5 }} />&nbsp;
          {conveyorFromId === null
            ? 'Нажмите на здание-источник (подсвеченные — доступные цели)'
            : 'Нажмите на зелёное пульсирующее здание — цель'}
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
    </>
  );
}
