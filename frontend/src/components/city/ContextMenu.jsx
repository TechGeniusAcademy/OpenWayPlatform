import { useState, useEffect } from 'react';
import { getLevelConfig, getNextLevelConfig, checkUpgrade } from '../systems/upgrades.js';
import { canBeSource } from '../systems/conveyor.js';
import {
  FaSun, FaBatteryFull, FaLightbulb, FaIndustry, FaLandmark,
  FaHardHat, FaLink, FaBolt, FaCodeBranch, FaHome, FaMedal,
  FaStar, FaArrowUp, FaArrowsAlt, FaTrash, FaTimes, FaCog,
  FaExclamationTriangle, FaHammer, FaShieldAlt, FaChessRook, FaCoins,
  FaRobot, FaLongArrowAltRight, FaPlus, FaFighterJet,
} from 'react-icons/fa';
import { MdCallMerge } from 'react-icons/md';
import { GiMining, GiFireBowl } from 'react-icons/gi';

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
  'coal-generator': 'Угольный генератор',
  'hangar':          'Военный ангар',
  'builder-house':  'Дом строителя',
  'wall':           'Стена',
  'tower':          'Башня',
  'drone':          'Маршрут дрона',
  'lab-factory':    'Лаборатория-завод',
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
  'coal-generator': GiFireBowl,
  'hangar':          FaFighterJet,
  'builder-house':  FaHome,
  'wall':           FaShieldAlt,
  'tower':          FaChessRook,
  'drone':          FaRobot,
  'lab-factory':    FaIndustry,
};

// Types that cannot be "moved"
const LINK_TYPES = new Set(['conveyor', 'cable', 'wall', 'tower', 'drone']);

// Types that have no points/XP upgrade
const NO_UPGRADE_TYPES = new Set(['conveyor', 'cable', 'drone']);

const LEVEL_COLORS = ['', '#4ade80', '#fbbf24', '#f97316', '#ef4444', '#a855f7', '#38bdf8', '#f43f5e'];

// ─── Lab Factory metadata ─────────────────────────────────────────────────────
const _LAB_RECIPES = [
  { id: 'iron',   icon: '🔩', name: 'Железо',  full: 'Железный слиток',   color: '#94a3b8', ore: 'Железная руда'   },
  { id: 'silver', icon: '⚪', name: 'Серебро', full: 'Серебряный слиток', color: '#e2e8f0', ore: 'Серебряная руда' },
  { id: 'copper', icon: '🟤', name: 'Медь',    full: 'Медный слиток',     color: '#f97316', ore: 'Медная руда'     },
];

// ─── Lab Factory Dashboard Component ─────────────────────────────────────────
function LabDashboard({ labRecipe, labOreAmount = 0, labIngots = {}, orePerIngot = 5, labProductionMs = 10_000, itemLevel = 1, onSetRecipe, onClose }) {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setPulse(p => !p), 1400);
    return () => clearInterval(id);
  }, []);

  const labCfg       = getLevelConfig('lab-factory', itemLevel);
  const ratePerTick  = Math.round(labCfg?.rateMultiplier ?? 1);
  const oreAvail     = Math.floor(labOreAmount ?? 0);
  const oreFrac      = Math.min(1, oreAvail / 50);
  const orePerCycle  = orePerIngot * ratePerTick;
  const canProduce   = !!(labRecipe && oreAvail >= orePerIngot);
  const ticksPerMin  = 60_000 / labProductionMs;
  const ingotsPerMin = Math.round(ratePerTick * ticksPerMin);
  const orePerMin    = Math.round(orePerCycle * ticksPerMin);
  const cyclesLeft   = orePerCycle > 0 ? Math.floor(oreAvail / orePerCycle) : 0;
  const activeRec    = _LAB_RECIPES.find(r => r.id === labRecipe) ?? null;
  const barColor     = oreFrac > 0.55 ? '#4ade80' : oreFrac > 0.25 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ borderBottom: '1px solid rgba(99,102,241,0.18)' }}>

      {/* ━━━ STATUS BANNER ━━━ */}
      <div style={{
        padding: '18px 18px 16px',
        background: activeRec
          ? `linear-gradient(135deg, ${activeRec.color}1c 0%, ${activeRec.color}06 55%, transparent 100%)`
          : 'rgba(5,8,18,0.45)',
        borderBottom: '1px solid rgba(99,102,241,0.10)',
        position: 'relative', overflow: 'hidden',
      }}>
        {canProduce && (
          <div style={{
            position: 'absolute', right: -50, top: -50,
            width: 180, height: 180, borderRadius: '50%',
            background: `radial-gradient(circle, ${activeRec.color}20 0%, transparent 70%)`,
            opacity: pulse ? 1 : 0.3, transition: 'opacity 1.4s ease',
            pointerEvents: 'none',
          }} />
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, flexShrink: 0,
              background: activeRec ? `${activeRec.color}1a` : 'rgba(15,23,42,0.7)',
              border: `2px solid ${activeRec ? activeRec.color + '50' : '#0f172a'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30,
              boxShadow: canProduce ? `0 0 22px ${activeRec.color}35` : 'none',
              transition: 'box-shadow 1.4s ease',
            }}>
              {activeRec?.icon ?? '⏸'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 8, color: '#334155', letterSpacing: 1.5, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Активный рецепт</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: activeRec?.color ?? '#0f172a', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeRec?.full ?? 'Рецепт не выбран'}
              </div>
              {activeRec && (
                <div style={{ fontSize: 10, color: '#334155', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>⛏</span><span>{activeRec.ore}</span>
                  <span style={{ color: '#1e293b' }}>·</span><span>Ур. {itemLevel}</span>
                  {labCfg?.name && <><span style={{ color: '#1e293b' }}>·</span><span style={{ color: '#475569' }}>{labCfg.name}</span></>}
                </div>
              )}
            </div>
          </div>

          <div style={{
            flexShrink: 0, padding: '10px 14px', borderRadius: 14,
            background: canProduce ? 'rgba(20,83,45,0.45)' : labRecipe ? 'rgba(127,29,29,0.45)' : 'rgba(10,15,26,0.6)',
            border: `1px solid ${canProduce ? '#16a34a55' : labRecipe ? '#b91c1c55' : '#0f172a'}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 72,
          }}>
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              background: canProduce ? '#4ade80' : labRecipe ? '#f87171' : '#1e293b',
              boxShadow: canProduce ? `0 0 ${pulse ? 14 : 5}px ${pulse ? 4 : 1}px #4ade8088` : 'none',
              transition: 'box-shadow 1.4s ease',
            }} />
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.6, color: canProduce ? '#4ade80' : labRecipe ? '#f87171' : '#334155', textAlign: 'center', lineHeight: 1.2 }}>
              {canProduce ? 'РАБОТАЕТ' : labRecipe ? 'НЕТ\nРУДЫ' : 'ПРОСТОЙ'}
            </div>
          </div>
        </div>

        {activeRec && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 14 }}>
            {[
              { lbl: 'Слитков/тик', val: ratePerTick,    unit: 'шт',      col: activeRec.color },
              { lbl: '/минуту',      val: ingotsPerMin,   unit: 'слитков', col: '#818cf8'       },
              { lbl: 'Руды/цикл',   val: orePerCycle,    unit: 'ед.',     col: '#f59e0b'       },
              { lbl: 'Циклов',       val: cyclesLeft,     unit: 'осталось', col: canProduce ? '#4ade80' : '#ef4444' },
            ].map((m, i) => (
              <div key={i} style={{ padding: '8px 4px', borderRadius: 8, textAlign: 'center', background: 'rgba(5,10,20,0.7)', border: '1px solid rgba(99,102,241,0.12)' }}>
                <div style={{ fontSize: 8, color: '#1e293b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{m.lbl}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: m.col, lineHeight: 1 }}>{m.val}</div>
                <div style={{ fontSize: 8, color: '#1e293b', marginTop: 3 }}>{m.unit}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ━━━ PRODUCTION CHAIN ━━━ */}
      {activeRec && (
        <div style={{ padding: '10px 18px', borderBottom: '1px solid rgba(99,102,241,0.10)', background: 'rgba(3,6,16,0.4)' }}>
          <div style={{ fontSize: 8, color: '#1e293b', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
            Производственная цепочка
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Ore node */}
            <div style={{ flex: 1, padding: '8px 6px', borderRadius: 8, textAlign: 'center', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.22)' }}>
              <div style={{ fontSize: 14 }}>⛏</div>
              <div style={{ fontSize: 7, color: '#78350f', fontWeight: 700, marginTop: 2, textTransform: 'uppercase' }}>Руда</div>
              <div style={{ fontSize: 14, color: '#f59e0b', fontWeight: 900 }}>{oreAvail}</div>
              <div style={{ fontSize: 7, color: '#78350f' }}>/ 50 ед.</div>
            </div>
            {/* Arrow 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, opacity: canProduce ? 1 : 0.15 }}>
              <div style={{ fontSize: 8, color: '#334155', fontWeight: 700 }}>{orePerCycle}×</div>
              <div style={{ width: 24, height: 2, background: canProduce ? `linear-gradient(90deg,#f59e0b,${activeRec.color})` : '#1e293b', borderRadius: 1, position: 'relative' }}>
                <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: `5px solid ${canProduce ? activeRec.color : '#1e293b'}` }} />
              </div>
              <div style={{ fontSize: 7, color: '#1e293b' }}>{labProductionMs/1000}с</div>
            </div>
            {/* Lab node */}
            <div style={{ flex: 1, padding: '8px 6px', borderRadius: 8, textAlign: 'center', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.22)', opacity: canProduce ? 1 : 0.35 }}>
              <div style={{ fontSize: 14 }}>🔬</div>
              <div style={{ fontSize: 7, color: '#4338ca', fontWeight: 700, marginTop: 2, textTransform: 'uppercase' }}>Завод</div>
              <div style={{ fontSize: 14, color: '#818cf8', fontWeight: 900 }}>Ур.{itemLevel}</div>
              <div style={{ fontSize: 7, color: '#312e81', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{labCfg?.name}</div>
            </div>
            {/* Arrow 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, opacity: canProduce ? 1 : 0.15 }}>
              <div style={{ fontSize: 8, color: '#334155', fontWeight: 700 }}>{ratePerTick}×</div>
              <div style={{ width: 24, height: 2, background: canProduce ? `linear-gradient(90deg,#818cf8,${activeRec.color})` : '#1e293b', borderRadius: 1, position: 'relative' }}>
                <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: `5px solid ${canProduce ? activeRec.color : '#1e293b'}` }} />
              </div>
              <div style={{ fontSize: 7, color: '#1e293b' }}>выход</div>
            </div>
            {/* Ingot node */}
            <div style={{ flex: 1, padding: '8px 6px', borderRadius: 8, textAlign: 'center', background: `${activeRec.color}0f`, border: `1px solid ${activeRec.color}30`, opacity: canProduce ? 1 : 0.35 }}>
              <div style={{ fontSize: 14 }}>{activeRec.icon}</div>
              <div style={{ fontSize: 7, color: activeRec.color + '99', fontWeight: 700, marginTop: 2, textTransform: 'uppercase' }}>Слиток</div>
              <div style={{ fontSize: 14, color: activeRec.color, fontWeight: 900 }}>{labIngots?.[labRecipe] ?? 0}</div>
              <div style={{ fontSize: 7, color: activeRec.color + '55' }}>накоплено</div>
            </div>
          </div>
        </div>
      )}

      {/* ━━━ ORE BUFFER ━━━ */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(99,102,241,0.10)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 9, color: '#334155', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>⛏ Буфер руды</div>
            <div style={{ fontSize: 10, color: '#1e293b' }}>
              {canProduce
                ? `хватит на ${cyclesLeft} ${cyclesLeft===1?'цикл':cyclesLeft<5?'цикла':'циклов'} · ${orePerMin} ед./мин расход`
                : oreAvail > 0
                  ? `нужно ещё ${orePerIngot - oreAvail} ед. для старта`
                  : 'бункер пуст — нужны дроны от добытчика'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: barColor, lineHeight: 1 }}>{oreAvail}</span>
            <span style={{ fontSize: 11, color: '#1e293b' }}> / 50</span>
          </div>
        </div>

        <div style={{ position: 'relative', height: 20, borderRadius: 10, overflow: 'hidden', background: 'rgba(3,6,16,0.85)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${oreFrac * 100}%`, transition: 'width 0.5s ease',
            borderRadius: 10,
            background: oreFrac > 0.55
              ? 'linear-gradient(90deg, #15803d, #4ade80)'
              : oreFrac > 0.25
                ? 'linear-gradient(90deg, #b45309, #fbbf24)'
                : 'linear-gradient(90deg, #991b1b, #ef4444)',
            boxShadow: oreFrac > 0.05 ? `0 0 14px ${barColor}40` : 'none',
          }} />
          <div style={{ position: 'absolute', top: 3, bottom: 3, left: `${(orePerIngot/50)*100}%`, width: 2, background: 'rgba(255,255,255,0.25)', borderRadius: 1 }} />
          {ratePerTick > 1 && (
            <div style={{ position: 'absolute', top: 3, bottom: 3, left: `${Math.min(99, (orePerCycle/50)*100)}%`, width: 2, background: 'rgba(255,255,255,0.4)', borderRadius: 1 }} />
          )}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: oreFrac > 0.3 ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.12)' }}>
            {Math.round(oreFrac * 100)}%
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 8 }}>
          <span style={{ color: '#1e293b' }}>мин. {orePerIngot} ед.</span>
          {ratePerTick > 1 && <span style={{ color: '#334155' }}>1 тик = {orePerCycle} ед.</span>}
          <span style={{ color: canProduce ? '#166534' : '#7f1d1d', fontWeight: 700 }}>{canProduce ? '✓ достаточно' : '✗ мало'}</span>
        </div>
      </div>

      {/* ━━━ INGOT INVENTORY ━━━ */}
      <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(99,102,241,0.10)' }}>
        <div style={{ fontSize: 9, color: '#334155', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>
          Хранилище слитков
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {_LAB_RECIPES.map(r => {
            const count    = labIngots?.[r.id] ?? 0;
            const isActive = labRecipe === r.id;
            return (
              <div key={r.id} style={{
                borderRadius: 12, overflow: 'hidden',
                border: `1.5px solid ${isActive ? r.color + '66' : 'rgba(15,23,42,0.7)'}`,
                background: isActive
                  ? `linear-gradient(160deg, ${r.color}1c 0%, rgba(5,8,18,0.9) 100%)`
                  : 'rgba(5,8,18,0.55)',
                boxShadow: isActive && canProduce ? `0 4px 22px ${r.color}22` : 'none',
                transition: 'all 0.3s',
              }}>
                <div style={{ height: 3, background: isActive ? `linear-gradient(90deg, ${r.color}77, ${r.color})` : 'rgba(15,23,42,0.5)' }} />
                <div style={{ padding: '10px 8px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 26, marginBottom: 4, filter: isActive ? 'none' : 'grayscale(1) opacity(0.2)' }}>{r.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, color: isActive ? r.color : '#0f172a' }}>{count}</div>
                  <div style={{ fontSize: 8, color: isActive ? '#475569' : '#0f172a', marginTop: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{r.name}</div>
                  {isActive && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '3px 8px', borderRadius: 10, background: `${r.color}15`, border: `1px solid ${r.color}30` }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: canProduce ? r.color : '#1e293b', boxShadow: canProduce ? `0 0 ${pulse?8:3}px ${r.color}` : 'none', display: 'inline-block', transition: 'box-shadow 1.4s', flexShrink: 0 }} />
                      <span style={{ fontSize: 8, color: canProduce ? r.color : '#334155', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {canProduce ? `+${ratePerTick}/тик · ${ingotsPerMin}/мин` : 'ожидание руды'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ━━━ RECIPE SELECTOR ━━━ */}
      <div style={{ padding: '14px 18px 18px', background: 'rgba(3,6,16,0.4)' }}>
        <div style={{ fontSize: 9, color: '#334155', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>
          {labRecipe ? '⚙ Сменить рецепт' : '⚙ Выбрать рецепт производства'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
          {_LAB_RECIPES.map(r => {
            const isActive = labRecipe === r.id;
            return (
              <button
                key={r.id}
                onClick={() => { onSetRecipe?.(r.id); onClose(); }}
                style={{
                  position: 'relative', borderRadius: 12,
                  padding: '14px 6px 12px',
                  background: isActive ? `${r.color}1c` : 'rgba(8,12,22,0.6)',
                  border: `2px solid ${isActive ? r.color + '77' : 'rgba(20,30,50,0.6)'}`,
                  cursor: 'pointer', textAlign: 'center',
                  fontFamily: 'monospace', outline: 'none', overflow: 'hidden',
                  boxShadow: isActive ? `0 6px 26px ${r.color}28, inset 0 1px 0 ${r.color}22` : 'none',
                  transition: 'all 0.18s',
                }}
              >
                {isActive && (
                  <div style={{ position: 'absolute', top: 7, right: 8, width: 7, height: 7, borderRadius: '50%', background: r.color, boxShadow: `0 0 8px ${r.color}` }} />
                )}
                {/* Shine stripe when active */}
                {isActive && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${r.color}55, transparent)` }} />
                )}
                <div style={{ fontSize: 30, marginBottom: 6 }}>{r.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: isActive ? r.color : '#1e293b', marginBottom: 3 }}>{r.name}</div>
                <div style={{ fontSize: 8, color: '#1e293b', lineHeight: 1.4 }}>{r.ore}</div>
                {isActive && (
                  <div style={{ marginTop: 7, display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 10, background: `${r.color}1a`, color: r.color, fontSize: 8, fontWeight: 700 }}>
                    ✓ активен
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => { onSetRecipe?.(null); onClose(); }}
          style={{
            width: '100%', padding: '10px',
            borderRadius: 9, cursor: 'pointer',
            background: !labRecipe ? 'rgba(51,65,85,0.3)' : 'rgba(5,8,18,0.4)',
            border: `1px solid ${!labRecipe ? '#47556955' : 'rgba(10,15,26,0.7)'}`,
            color: !labRecipe ? '#64748b' : '#1e293b',
            fontSize: 11, fontWeight: 600, fontFamily: 'monospace',
            transition: 'all 0.15s',
          }}
        >
          ⏸ &nbsp; Остановить производство
        </button>
      </div>
    </div>
  );
}

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
  hp = null,          // { current, max } from objectHp
  onRepair,           // (itemId, itemType) => void
  labRecipe = null,   // 'iron' | 'silver' | 'copper' | null
  onSetRecipe,        // (recipe) => void
  labOreAmount = 0,   // current ore in buffer for this lab
  labIngots = null,   // { iron, silver, copper } ingot counts
  orePerIngot = 5,    // ore units required per ingot
  labProductionMs = 10_000, // production interval in ms
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

  // ── HP / Repair state ──────────────────────────────────────────────────────
  const hpPct      = hp && hp.max > 0 ? Math.max(0, Math.min(1, hp.current / hp.max)) : null;
  const isDamaged  = hpPct !== null && hpPct < 1;
  const isDestroyed = hpPct !== null && hpPct <= 0;
  const repairHp   = hp ? hp.max - hp.current : 0;
  const repairPts  = Math.ceil(repairHp * 0.5); // 1 point per 2 HP (matches hpSystem.REPAIR_COST_PER_HP)
  const hpBarColor = !hpPct ? '#e03030' : hpPct > 0.6 ? '#22dd44' : hpPct > 0.3 ? '#f5c400' : '#e03030';
  const relatedDrones = drones.filter(d => d.fromId === itemId || d.toId === itemId);
  function getBuildingLabel(id) {
    const item = placedItems.find(i => i.id === id);
    if (!item) return `#${id}`;
    return BUILDING_LABELS[item.type] ?? item.type;
  }

  const Icon = BUILDING_ICONS[itemType] ?? FaHammer;

  return (
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

        {/* ── HP bar section (shown when damaged) ── */}
        {isDamaged && (
          <div style={{
            padding: '10px 18px',
            borderBottom: '1px solid rgba(99,102,241,0.18)',
          }}>
            <div style={{
              fontSize: 10, color: '#475569', letterSpacing: 1,
              marginBottom: 6, fontWeight: 700,
            }}>
              {isDestroyed ? '⚠ РАЗРУШЕНО' : 'ПРОЧНОСТЬ'}
            </div>
            {/* Track */}
            <div style={{
              height: 8, background: 'rgba(255,255,255,0.08)',
              borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{
                width: `${Math.round(hpPct * 100)}%`,
                height: '100%',
                background: hpBarColor,
                borderRadius: 3,
                boxShadow: `0 0 6px ${hpBarColor}88`,
                transition: 'width 0.15s ease',
              }} />
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginTop: 4, fontSize: 10, color: '#64748b',
            }}>
              <span>{Math.round(hp.current)}/{hp.max} HP</span>
              <span style={{ color: isDestroyed ? '#f87171' : '#94a3b8' }}>
                {isDestroyed ? 'Нет функций' : `−${Math.round(repairHp)} HP`}
              </span>
            </div>
          </div>
        )}

        {/* ── Lab Factory — full production dashboard ── */}
        {itemType === 'lab-factory' && (
          <LabDashboard
            labRecipe={labRecipe}
            labOreAmount={labOreAmount}
            labIngots={labIngots}
            orePerIngot={orePerIngot}
            labProductionMs={labProductionMs}
            itemLevel={itemLevel}
            onSetRecipe={onSetRecipe}
            onClose={onClose}
          />
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
        <div style={{ padding: '12px 18px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!LINK_TYPES.has(itemType) && !isDestroyed && (
            <Btn color="#60a5fa" onClick={onMove}>
              <FaArrowsAlt /> Переместить
            </Btn>
          )}
          <Btn color="#f87171" onClick={onSell}>
            <FaTrash /> Удалить
          </Btn>
          {nextLevel && upgradeProgress === null && !coinUpgradeNext && !isDestroyed && (
            <Btn color="#4ade80" disabled={!canDoUpgrade} onClick={canDoUpgrade ? onUpgrade : undefined}>
              <FaArrowUp /> Улучшить
            </Btn>
          )}
          {coinUpgradeNext && upgradeProgress === null && !isDestroyed && (
            <Btn color="#fbbf24" disabled={!coinUpgradeNext.canAfford} onClick={coinUpgradeNext.canAfford ? onUpgrade : undefined}>
              <FaCoins /> Улучшить
            </Btn>
          )}
          {isDamaged && onRepair && (
            <Btn
              color={isDestroyed ? '#f43f5e' : '#fb923c'}
              onClick={() => onRepair(itemId, itemType)}
            >
              <FaHammer /> {isDestroyed ? `Восстановить (${repairPts} ⭐)` : `Починить (${repairPts} ⭐)`}
            </Btn>
          )}
        </div>

      </div>
    </div>
  );
}
