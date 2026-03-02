import { useState } from 'react';
import {
  FaSun, FaBatteryFull, FaLightbulb, FaIndustry, FaLandmark,
  FaHardHat, FaLink, FaBolt, FaHome, FaMedal,
  FaCoins, FaTimes, FaStore, FaHammer, FaInfoCircle, FaShieldAlt, FaChessRook,
  FaFighterJet,
} from 'react-icons/fa';
import { GiMining, GiFireBowl } from 'react-icons/gi';
import styles from '../OpenCity.module.css';
import { ITEM_POINT_COST, ITEM_PLACE_LIMIT, BUILDER_HOUSE_EXTRA_COST_COINS } from '../items/shopPrices.js';

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'energy',     label: 'Энергия',      Icon: FaBolt,       color: '#f59e0b' },
  { id: 'production', label: 'Производство', Icon: FaIndustry,   color: '#6366f1' },
  { id: 'logistics',  label: 'Логистика',    Icon: FaLink,       color: '#06b6d4' },
  { id: 'builders',   label: 'Строители',    Icon: FaHardHat,    color: '#f97316' },
  { id: 'military',   label: 'Военные',      Icon: FaFighterJet, color: '#8b5cf6' },
  { id: 'defence',    label: 'Защита',       Icon: FaShieldAlt,  color: '#ef4444' },
];

// ── Item card ─────────────────────────────────────────────────────────────────
function ShopCard({ Icon, iconColor, name, desc, cost, coinCost, isFree, badge,
  onPlace, disabled, disabledReason, btnLabel = 'Разместить' }) {
  const [hovered, setHovered] = useState(false);
  const isDisabled = !!disabled;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={isDisabled ? undefined : onPlace}
      style={{
        display:       'flex',
        flexDirection: 'column',
        gap:           10,
        padding:       '16px 16px 14px',
        background:    hovered && !isDisabled
          ? 'rgba(255,255,255,0.07)'
          : 'rgba(255,255,255,0.03)',
        border:        `1px solid ${hovered && !isDisabled ? iconColor + '55' : 'rgba(255,255,255,0.07)'}`,
        borderRadius:  14,
        cursor:        isDisabled ? 'not-allowed' : 'pointer',
        opacity:       isDisabled ? 0.5 : 1,
        transition:    'all 0.18s ease',
        transform:     hovered && !isDisabled ? 'translateY(-2px)' : 'none',
        boxShadow:     hovered && !isDisabled ? `0 8px 24px ${iconColor}20` : 'none',
        position:      'relative',
        overflow:      'hidden',
      }}
    >
      {/* Accent glow strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${iconColor}, transparent)`,
        opacity: hovered && !isDisabled ? 0.9 : 0.35,
        transition: 'opacity 0.2s',
      }} />

      {/* Top row: icon + name + badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: `${iconColor}22`,
          border: `1px solid ${iconColor}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon style={{ color: iconColor, fontSize: 22 }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>
            {name}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{desc}</div>
        </div>

        {badge && (
          <div style={{
            fontSize: 10, fontWeight: 700, padding: '3px 7px',
            borderRadius: 6, background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)', color: '#f87171',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {badge}
          </div>
        )}
      </div>

      {/* Bottom row: price + button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {isFree ? (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80',
              background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)',
              borderRadius: 6, padding: '2px 8px' }}>
              Бесплатно
            </span>
          ) : coinCost ? (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24',
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: 6, padding: '2px 8px' }}>
              <FaCoins style={{ fontSize: 10 }} /> {coinCost}
            </span>
          ) : cost > 0 ? (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8',
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)',
              borderRadius: 6, padding: '2px 8px' }}>
              <FaMedal style={{ fontSize: 10 }} /> {cost} баллов
            </span>
          ) : null}
        </div>

        <button
          disabled={isDisabled}
          onClick={e => { e.stopPropagation(); if (!isDisabled) onPlace(); }}
          style={{
            padding:    '6px 14px',
            background: isDisabled ? 'rgba(71,85,105,0.3)' : `${iconColor}25`,
            border:     `1px solid ${isDisabled ? 'rgba(71,85,105,0.3)' : iconColor + '50'}`,
            borderRadius: 8,
            color:      isDisabled ? '#475569' : iconColor,
            fontSize:   11,
            fontWeight: 700,
            cursor:     isDisabled ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
        >
          {isDisabled ? (disabledReason ?? 'Недоступно') : btnLabel}
        </button>
      </div>
    </div>
  );
}

// ── Balance bar ───────────────────────────────────────────────────────────────
function BalanceBar({ userPoints, freeBuilders, totalBuilders, coinBalance }) {
  const hasFree = (freeBuilders ?? 0) > 0;
  return (
    <div style={{
      display: 'flex', gap: 0,
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}>
      {[
        { icon: <FaMedal style={{ color: '#818cf8' }} />, val: `${userPoints ?? 0}`, label: 'баллов', bg: 'rgba(99,102,241,0.08)' },
        { icon: <FaCoins style={{ color: '#fbbf24' }} />, val: `${Math.floor(coinBalance ?? 0)}`, label: 'монет', bg: 'rgba(251,191,36,0.08)' },
        { icon: <FaHardHat style={{ color: hasFree ? '#4ade80' : '#f87171' }} />,
          val: `${freeBuilders ?? 0}/${totalBuilders ?? 0}`,
          label: 'строит.',
          bg: hasFree ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)' },
      ].map((item, i) => (
        <div key={i} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, padding: '8px 4px', background: item.bg,
          borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}>
          <span style={{ fontSize: 14 }}>{item.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace' }}>
            {item.val}
          </span>
          <span style={{ fontSize: 10, color: '#475569' }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Info tip ──────────────────────────────────────────────────────────────────
function InfoTip({ lines }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 12,
      background: 'rgba(99,102,241,0.06)',
      border: '1px solid rgba(99,102,241,0.15)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8,
        fontSize: 12, fontWeight: 700, color: '#a5b4fc' }}>
        <FaInfoCircle />
        Система строителей
      </div>
      {lines.map((l, i) => (
        <div key={i} style={{ fontSize: 11, color: '#64748b', marginBottom: 4,
          paddingLeft: 4, borderLeft: '2px solid rgba(99,102,241,0.3)' }}>
          {l}
        </div>
      ))}
    </div>
  );
}

// ── Main shop modal ───────────────────────────────────────────────────────────
export function ShopModal({
  onClose, onBuy,
  onWallMode, onTowerMode,
  userPoints = 0, coinBalance = 0,
  freeBuilders = 0, totalBuilders = 0,
  townHallCount = 0, builderHouseCount = 0,
}) {
  const [activeTab, setActiveTab] = useState('energy');

  function itemDisabled(type) {
    const pointCost = ITEM_POINT_COST[type] ?? 0;
    const limit     = ITEM_PLACE_LIMIT[type];
    if (type === 'town-hall'     && townHallCount     >= 1) return 'Лимит 1';
    if (type === 'builder-house' && builderHouseCount >= 3) return 'Лимит 3';
    if (limit && getCount(type) >= limit)                   return `Лимит ${limit}`;
    if (pointCost > 0 && userPoints < pointCost)            return `Мало баллов`;
    if (type !== 'builder-house' && freeBuilders <= 0)      return 'Нет строителя';
    return null;
  }

  function getCount(type) {
    if (type === 'town-hall')     return townHallCount;
    if (type === 'builder-house') return builderHouseCount;
    return 0;
  }

  function getBadge(type) {
    if (type === 'town-hall'     && townHallCount >= 1)     return '1/1 построено';
    if (type === 'builder-house' && builderHouseCount >= 1) return `${builderHouseCount}/3`;
    return null;
  }

  function builderHouseDisabled() {
    if (builderHouseCount >= 3) return 'Лимит 3';
    if (builderHouseCount > 0 && coinBalance < BUILDER_HOUSE_EXTRA_COST_COINS)
      return `Мало монет`;
    return null;
  }

  const droneCost  = ITEM_POINT_COST['drone']    ?? 5;

  const P = (type) => ({ cost: ITEM_POINT_COST[type] ?? 0 });

  const tabColor = TABS.find(t => t.id === activeTab)?.color ?? '#6366f1';

  return (
    <div className={styles.shopOverlay} onClick={onClose}>
      <div className={styles.shopModal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '18px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'linear-gradient(90deg, rgba(99,102,241,0.08), transparent)',
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FaStore style={{ color: '#818cf8', fontSize: 18 }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Магазин построек</div>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>Разместите здания для развития города</div>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', width: 32, height: 32, borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#64748b', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, flexShrink: 0, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.15)'; e.currentTarget.style.color='#fca5a5'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#64748b'; }}
          >
            <FaTimes />
          </button>
        </div>

        {/* Balance */}
        <BalanceBar userPoints={userPoints} freeBuilders={freeBuilders}
          totalBuilders={totalBuilders} coinBalance={coinBalance} />

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 0,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          {TABS.map(t => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  flex: 1, padding: '11px 4px',
                  background:  active ? `${t.color}12` : 'transparent',
                  border:      'none',
                  borderBottom: active ? `2px solid ${t.color}` : '2px solid transparent',
                  color:       active ? t.color : '#475569',
                  fontSize:    11, fontWeight: active ? 700 : 500,
                  cursor:      'pointer', transition: 'all 0.18s',
                  display:     'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 4,
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = t.color; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#475569'; }}
              >
                <t.Icon style={{ fontSize: 15 }} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px',
          scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>

          {/* ── Energy ── */}
          {activeTab === 'energy' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <ShopCard Icon={FaSun} iconColor="#f59e0b" name="Солнечная панель"
                desc="Генерирует электроэнергию в дневное время" {...P('solar-panel')}
                disabled={itemDisabled('solar-panel')} disabledReason={itemDisabled('solar-panel')}
                onPlace={() => { onBuy('solar-panel'); onClose(); }} />
              <ShopCard Icon={FaBatteryFull} iconColor="#22d3ee" name="Хранилище энергии"
                desc="Накапливает 100 кВт·ч, 50 л воды и монеты" {...P('energy-storage')}
                disabled={itemDisabled('energy-storage')} disabledReason={itemDisabled('energy-storage')}
                onPlace={() => { onBuy('energy-storage'); onClose(); }} />
              <div style={{ gridColumn: '1/-1' }}>
                <ShopCard Icon={FaLightbulb} iconColor="#fde68a" name="Фонарный столб"
                  desc="Освещает прилегающую территорию ночью" {...P('street-lamp')}
                  disabled={itemDisabled('street-lamp')} disabledReason={itemDisabled('street-lamp')}
                  onPlace={() => { onBuy('street-lamp'); onClose(); }} />
              </div>
            </div>
          )}

          {/* ── Production ── */}
          {activeTab === 'production' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <ShopCard Icon={FaIndustry} iconColor="#818cf8" name="Денежная фабрика"
                desc="Производит 10 монет в час" {...P('money-factory')}
                disabled={itemDisabled('money-factory')} disabledReason={itemDisabled('money-factory')}
                onPlace={() => { onBuy('money-factory'); onClose(); }} />
              <ShopCard Icon={FaLandmark} iconColor="#a78bfa" name="Ратуша"
                desc={`Конвертирует 1000 монет → 1 очко города${townHallCount >= 1 ? ' (построена)' : ''}`}
                {...P('town-hall')} badge={getBadge('town-hall')}
                disabled={itemDisabled('town-hall')} disabledReason={itemDisabled('town-hall')}
                onPlace={() => { onBuy('town-hall'); onClose(); }} />
              <div style={{ gridColumn: '1/-1' }}>
                <ShopCard Icon={GiMining} iconColor="#f97316" name="Добытчик руды"
                  desc="Размещайте на рудных залежах. Ур.1→уголь · Ур.5→алмаз" {...P('extractor')}
                  disabled={itemDisabled('extractor')} disabledReason={itemDisabled('extractor')}
                  onPlace={() => { onBuy('extractor'); onClose(); }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <ShopCard Icon={GiFireBowl} iconColor="#f97316" name="Угольный генератор"
                  desc="Принимает уголь от добытчика через дронов, вырабатывает 8 л топлива/ч и отдаёт в хранилище" {...P('coal-generator')}
                  disabled={itemDisabled('coal-generator')} disabledReason={itemDisabled('coal-generator')}
                  onPlace={() => { onBuy('coal-generator'); onClose(); }} />
              </div>
            </div>
          )}

          {/* ── Logistics ── */}
          {activeTab === 'logistics' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{
                  border: '1px solid rgba(6,182,212,0.25)',
                  borderRadius: 10,
                  padding: '14px 12px',
                  background: 'rgba(6,182,212,0.04)',
                  display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#22d3ee' }}>
                  <FaLink style={{ fontSize: 14 }} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Маршруты дронов</span>
                </div>
                <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                  Нажмите ПКМ на здание (например, фабрику монет) и используйте кнопку «Добавить маршрут» в информационном окне.
                </p>
              </div>
              <div style={{
                  border: '1px solid rgba(250,204,21,0.25)',
                  borderRadius: 10,
                  padding: '14px 12px',
                  background: 'rgba(250,204,21,0.04)',
                  display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fde68a' }}>
                  <FaBolt style={{ fontSize: 14 }} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Автопитание от зоны</span>
                </div>
                <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                  Здания внутри рабочей зоны Солнечной панели заряжаются
                  автоматически. Кабели не нужны.
                </p>
              </div>
            </div>
          )}

          {/* ── Military ── */}
          {activeTab === 'military' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ShopCard
                Icon={FaFighterJet} iconColor="#8b5cf6"
                name="Военный ангар"
                desc="Размещайте истребители на тарм-платформе рядом с ангаром. ЛКМ для управления. Ур.1 → 1 истребитель"
                {...P('hangar')}
                disabled={itemDisabled('hangar')} disabledReason={itemDisabled('hangar')}
                onPlace={() => { onBuy('hangar'); onClose(); }}
              />
              <div style={{
                border: '1px solid rgba(139,92,246,0.25)',
                borderRadius: 10, padding: '14px 12px',
                background: 'rgba(139,92,246,0.04)',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a78bfa' }}>
                  <FaFighterJet style={{ fontSize: 14 }} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Управление истребителями</span>
                </div>
                <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                  ЛКМ на ангар → заказать самолёт за 200 монет.
                  ЛКМ на истребитель → выделить (голубое кольцо).
                  ПКМ на землю → задать точку полёта.
                </p>
              </div>
            </div>
          )}

          {/* ── Defence ── */}
          {activeTab === 'defence' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ShopCard
                Icon={FaShieldAlt} iconColor="#ef4444"
                name="Стена"
                desc="Соединяйте точки для постройки стены. 7 уровней прочности: от дерева до магического сплава"
                coinCost={20}
                disabled={coinBalance < 20 ? 'Мало монет' : null}
                disabledReason="Мало монет"
                btnLabel="Строить стены"
                onPlace={() => { onWallMode?.(); onClose(); }}
              />
              <ShopCard
                Icon={FaChessRook} iconColor="#f97316"
                name="Башня со стрелком"
                desc="Встраивается в стены. Внутри лучник с анимированной стрельбой. 5 уровней улучшений"
                coinCost={150}
                disabled={coinBalance < 150 ? 'Мало монет' : null}
                disabledReason="Мало монет"
                btnLabel="Разместить башню"
                onPlace={() => { onTowerMode?.(); onClose(); }}
              />
              <div style={{
                padding: '12px 14px', borderRadius: 12,
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.18)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8,
                  fontSize: 12, fontWeight: 700, color: '#fca5a5' }}>
                  <FaShieldAlt /> Система обороны
                </div>
                {[
                  'Кликните «Строить стены» → выберите начальную точку, затем конечную',
                  'Стены соединяются в цепочку — конец одной = начало следующей',
                  'Башня ставится в любую точку карты, снапается к сетке 2 ед.',
                  'Улучшайте стены и башни через ПКМ → меню улучшения',
                  'Стоимость стены: 20 монет/сегмент · Башня: 150 монет',
                ].map((l, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#64748b', marginBottom: 4,
                    paddingLeft: 4, borderLeft: '2px solid rgba(239,68,68,0.3)' }}>
                    {l}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Builders ── */}
          {activeTab === 'builders' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ShopCard Icon={FaHome} iconColor="#f97316" name="Дом строителя"
                desc={
                  builderHouseCount === 0
                    ? 'Первый дом бесплатно! Открывает систему строительства'
                    : `Построено ${builderHouseCount} из 3 домов. Каждый даёт +1 рабочего`
                }
                cost={0} isFree={builderHouseCount === 0}
                coinCost={builderHouseCount > 0 ? BUILDER_HOUSE_EXTRA_COST_COINS : null}
                badge={getBadge('builder-house')}
                disabled={builderHouseDisabled()} disabledReason={builderHouseDisabled()}
                onPlace={() => { onBuy('builder-house'); onClose(); }}
                btnLabel={builderHouseCount === 0 ? 'Получить' : 'Купить'} />
              <InfoTip lines={[
                'Каждый Дом строителя даёт 1 рабочего',
                'Улучшение дома открывает +1 рабочего (макс. 3)',
                'Для постройки/улучшения любого здания нужен свободный рабочий',
                'Пока рабочий занят — новое строительство недоступно',
                'Максимум 3 дома строителя на город',
              ]} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
