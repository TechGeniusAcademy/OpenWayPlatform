// ─── Building Level Configurations ───────────────────────────────────────────
//
// Each building type has an ordered array of level configs.
// Level 1 is always the default (zero cost, zero XP required).
//
// Fields per level:
//   level             – integer (1–4)
//   name              – Russian display name
//   pointsCost        – city points (баллы) consumed on upgrade
//   xpRequired        – minimum platform XP the user must have
//   rateMultiplier    – multiplier applied to production / pass-through rate
//   capacityMultiplier– multiplier applied to storage capacity
//   coinsPerPoint     – (town-hall only) coins needed to earn 1 point
//   scaleBonus        – how much bigger the model gets  (0 = no change)
//   accentColor       – hex color used for the main glowing accent element
//   description       – short Russian description of the improvement

export const LEVEL_CONFIGS = {

  // ── Money Factory (4 levels) ──────────────────────────────────────────────
  'money-factory': [
    {
      level: 1, name: 'Базовый',
      pointsCost: 0,  xpRequired: 0,
      rateMultiplier: 1.0, scaleBonus: 0, glowIntensity: 0,
      accentColor: '#22c55e',
      description: 'Стандартное производство — 10 монет/ч',
    },
    {
      level: 2, name: 'Улучшенный',
      pointsCost: 8,  xpRequired: 150,
      rateMultiplier: 1.5, scaleBonus: 0.04, glowIntensity: 0.10,
      accentColor: '#4ade80',
      description: '+50% монет в час → 15 монет/ч',
    },
    {
      level: 3, name: 'Продвинутый',
      pointsCost: 25, xpRequired: 600,
      rateMultiplier: 2.5, scaleBonus: 0.09, glowIntensity: 0.28,
      accentColor: '#fbbf24',
      description: '+150% монет в час → 25 монет/ч',
    },
    {
      level: 4, name: 'Легендарный',
      pointsCost: 70, xpRequired: 2500,
      rateMultiplier: 4.0, scaleBonus: 0.15, glowIntensity: 0.55,
      accentColor: '#f97316',
      description: '+300% монет в час → 40 монет/ч',
    },
  ],

  // ── Solar Panel (4 levels) ────────────────────────────────────────────────
  'solar-panel': [
    {
      level: 1, name: 'Базовый',
      pointsCost: 0,  xpRequired: 0,
      rateMultiplier: 1.0, scaleBonus: 0, glowIntensity: 0,
      accentColor: '#0ea5e9',
      description: 'Стандартная генерация энергии',
    },
    {
      level: 2, name: 'Улучшенный',
      pointsCost: 6,  xpRequired: 100,
      rateMultiplier: 1.6, scaleBonus: 0.04, glowIntensity: 0.10,
      accentColor: '#22d3ee',
      description: '+60% выработки энергии',
    },
    {
      level: 3, name: 'Продвинутый',
      pointsCost: 22, xpRequired: 500,
      rateMultiplier: 2.8, scaleBonus: 0.09, glowIntensity: 0.28,
      accentColor: '#a855f7',
      description: '+180% выработки энергии',
    },
    {
      level: 4, name: 'Легендарный',
      pointsCost: 65, xpRequired: 2000,
      rateMultiplier: 4.5, scaleBonus: 0.15, glowIntensity: 0.55,
      accentColor: '#f59e0b',
      description: '+350% выработки энергии',
    },
  ],

  // ── Energy Storage (3 levels) ─────────────────────────────────────────────
  'energy-storage': [
    {
      level: 1, name: 'Базовый',
      pointsCost: 0,  xpRequired: 0,
      capacityMultiplier: 1.0, scaleBonus: 0, glowIntensity: 0,
      accentColor: '#a855f7',
      description: 'Стандартная ёмкость',
    },
    {
      level: 2, name: 'Расширенный',
      pointsCost: 10, xpRequired: 250,
      capacityMultiplier: 2.5, scaleBonus: 0.06, glowIntensity: 0.18,
      accentColor: '#c084fc',
      description: '×2.5 ёмкость хранилища',
    },
    {
      level: 3, name: 'Мощный',
      pointsCost: 35, xpRequired: 1000,
      capacityMultiplier: 5.0, scaleBonus: 0.13, glowIntensity: 0.45,
      accentColor: '#fbbf24',
      description: '×5 ёмкость хранилища',
    },
  ],

  // ── Town Hall (3 levels) ──────────────────────────────────────────────────
  'town-hall': [
    {
      level: 1, name: 'Базовый',
      pointsCost: 0,  xpRequired: 0,
      coinsPerPoint: 1000, scaleBonus: 0, glowIntensity: 0,
      accentColor: '#fbbf24',
      description: '1 балл за 1 000 монет',
    },
    {
      level: 2, name: 'Развитый',
      pointsCost: 12, xpRequired: 350,
      coinsPerPoint: 650, scaleBonus: 0.06, glowIntensity: 0.15,
      accentColor: '#f59e0b',
      description: '1 балл за 650 монет',
    },
    {
      level: 3, name: 'Процветающий',
      pointsCost: 45, xpRequired: 1800,
      coinsPerPoint: 300, scaleBonus: 0.13, glowIntensity: 0.38,
      accentColor: '#fb923c',
      description: '1 балл за 300 монет',
    },
  ],

  // ── Street Lamp (2 levels) ────────────────────────────────────────────────
  'street-lamp': [
    {
      level: 1, name: 'Базовый',
      pointsCost: 0, xpRequired: 0,
      scaleBonus: 0, glowIntensity: 0,
      accentColor: '#fde68a',
      description: 'Стандартное ночное освещение',
    },
    {
      level: 2, name: 'Яркий',
      pointsCost: 4, xpRequired: 75,
      scaleBonus: 0.05, glowIntensity: 0.20,
      accentColor: '#fbbf24',
      description: 'Больший радиус и яркость',
    },
  ],

  // ── Splitter (3 levels) ───────────────────────────────────────────────────
  'splitter': [
    {
      level: 1, name: 'Базовый',
      pointsCost: 0,  xpRequired: 0,
      rateMultiplier: 1.0, scaleBonus: 0, glowIntensity: 0,
      accentColor: '#f59e0b',
      description: 'Стандартное распределение',
    },
    {
      level: 2, name: 'Улучшенный',
      pointsCost: 10, xpRequired: 200,
      rateMultiplier: 2.0, scaleBonus: 0.05, glowIntensity: 0.18,
      accentColor: '#fb923c',
      description: '160 монет/ч суммарно (2x80)',
    },
    {
      level: 3, name: 'Продвинутый',
      pointsCost: 30, xpRequired: 800,
      rateMultiplier: 8.0, scaleBonus: 0.10, glowIntensity: 0.42,
      accentColor: '#fbbf24',
      description: '640 монет/ч суммарно (2x320)',
    },
  ],

  // ── Extractor / Добытчик руды (5 levels) ──────────────────────────────────
  // Mines whatever ore deposit it sits on. Higher levels = higher rate.
  // oreType / oreIcon are stored on the placed item (item.oreType), NOT in the
  // level config — so the badge always shows the correct deposit type.
  'extractor': [
    {
      level: 1, name: 'Базовый',
      pointsCost: 0,   xpRequired: 0,
      rateMultiplier: 1.0,  scaleBonus: 0,    glowIntensity: 0,
      accentColor: '#52525b',
      description: 'Базовая добыча — 3 ед./ч',
    },
    {
      level: 2, name: 'Улучшенный',
      pointsCost: 10,  xpRequired: 200,
      upgradeDurationMs: 30_000,
      rateMultiplier: 1.5,  scaleBonus: 0.04, glowIntensity: 0.12,
      accentColor: '#b45309',
      description: 'Добыча ×1.5 быстрее — 4.5 ед./ч',
    },
    {
      level: 3, name: 'Продвинутый',
      pointsCost: 28,  xpRequired: 800,
      upgradeDurationMs: 60_000,
      rateMultiplier: 2.0,  scaleBonus: 0.08, glowIntensity: 0.28,
      accentColor: '#94a3b8',
      description: 'Добыча ×2.0 быстрее — 6 ед./ч',
    },
    {
      level: 4, name: 'Мощный',
      pointsCost: 65,  xpRequired: 2500,
      upgradeDurationMs: 120_000,
      rateMultiplier: 3.0,  scaleBonus: 0.13, glowIntensity: 0.45,
      accentColor: '#eab308',
      description: 'Добыча ×3.0 быстрее — 9 ед./ч',
    },
    {
      level: 5, name: 'Легендарный',
      pointsCost: 150, xpRequired: 8000,
      upgradeDurationMs: 300_000,
      rateMultiplier: 5.0,  scaleBonus: 0.20, glowIntensity: 0.65,
      accentColor: '#38bdf8',
      description: 'Добыча ×5.0 быстрее — 15 ед./ч',
    },
  ],

  // ── Merger (3 levels) ─────────────────────────────────────────────────────
  'merger': [
    {
      level: 1, name: 'Базовый',
      pointsCost: 0,  xpRequired: 0,
      rateMultiplier: 1.0, scaleBonus: 0, glowIntensity: 0,
      accentColor: '#8b5cf6',
      description: 'Стандартное объединение',
    },
    {
      level: 2, name: 'Улучшенный',
      pointsCost: 10, xpRequired: 200,
      rateMultiplier: 2.0, scaleBonus: 0.05, glowIntensity: 0.18,
      accentColor: '#a855f7',
      description: '160 монет/ч',
    },
    {
      level: 3, name: 'Продвинутый',
      pointsCost: 30, xpRequired: 800,
      rateMultiplier: 8.0, scaleBonus: 0.10, glowIntensity: 0.42,
      accentColor: '#fbbf24',
      description: '640 монет/ч',
    },
  ],

  // ── Coal Generator (Угольный генератор) — 3 levels ─────────────────────────
  'coal-generator': [
    {
      level: 1, name: 'Базовый',
      pointsCost: 0,  xpRequired: 0,
      rateMultiplier: 1.0, scaleBonus: 0, glowIntensity: 0,
      accentColor: '#f97316',
      description: 'Сжигает уголь — 8 топлива/ч',
    },
    {
      level: 2, name: 'Улучшенный',
      pointsCost: 12, xpRequired: 300,
      upgradeDurationMs: 45_000,
      rateMultiplier: 1.5, scaleBonus: 0.05, glowIntensity: 0.15,
      accentColor: '#fb923c',
      description: '+50% топлива → 12 топлива/ч',
    },
    {
      level: 3, name: 'Промышленный',
      pointsCost: 40, xpRequired: 1200,
      upgradeDurationMs: 90_000,
      rateMultiplier: 2.5, scaleBonus: 0.12, glowIntensity: 0.40,
      accentColor: '#ef4444',
      description: '+150% топлива → 20 топлива/ч',
    },
  ],

  // ── Builder's House (Дом строителя) — 3 levels, each adds +1 builder ────────
  'builder-house': [
    {
      level: 1, name: 'Маленький дом',
      pointsCost: 0,   xpRequired: 0,
      buildersCount: 1, scaleBonus: 0, glowIntensity: 0,
      accentColor: '#f59e0b',
      upgradeDurationMs: 20_000,
      description: '1 строитель — может строить 1 объект за раз',
    },
    {
      level: 2, name: 'Средний дом',
      pointsCost: 15,  xpRequired: 300,
      buildersCount: 2, scaleBonus: 0.06, glowIntensity: 0.15,
      accentColor: '#fbbf24',
      upgradeDurationMs: 40_000,
      description: '2 строителя — можно строить 2 объекта за раз',
    },
    {
      level: 3, name: 'Большой дом',
      pointsCost: 40,  xpRequired: 1000,
      buildersCount: 3, scaleBonus: 0.12, glowIntensity: 0.30,
      accentColor: '#f97316',
      upgradeDurationMs: 80_000,
      description: '3 строителя — максимальная производительность',
    },
  ],

  // ── Military Hangar (3 levels) ───────────────────────────────────────────────
  'hangar': [
    {
      level: 1, name: 'Полевой ангар',
      pointsCost: 0,   xpRequired: 0,
      maxFighters: 1,  scaleBonus: 0, glowIntensity: 0,
      accentColor: '#6366f1',
      upgradeDurationMs: 30_000,
      description: 'Вмещает 1 истребитель',
    },
    {
      level: 2, name: 'Боевая база',
      pointsCost: 20,  xpRequired: 500,
      maxFighters: 2,  scaleBonus: 0.06, glowIntensity: 0.15,
      accentColor: '#8b5cf6',
      upgradeDurationMs: 60_000,
      description: 'Вмещает 2 истребителя',
    },
    {
      level: 3, name: 'Военная крепость',
      pointsCost: 55,  xpRequired: 2000,
      maxFighters: 3,  scaleBonus: 0.12, glowIntensity: 0.35,
      accentColor: '#a855f7',
      upgradeDurationMs: 120_000,
      description: 'Вмещает 3 истребителя',
    },
  ],

  // ── Lab Factory (6 levels) ───────────────────────────────────────────────
  // rateMultiplier = ingot output per production tick (every 10 s, costs ORE_PER_INGOT ore each)
  'lab-factory': [
    {
      level: 1, name: 'Базовая лаборатория',
      pointsCost: 0,   xpRequired: 0,
      rateMultiplier: 1.0, scaleBonus: 0, glowIntensity: 0,
      accentColor: '#52525b',
      description: '1 слиток / тик · 6 слитков/мин',
    },
    {
      level: 2, name: 'Улучшенная',
      pointsCost: 15,  xpRequired: 400,
      upgradeDurationMs: 30_000,
      rateMultiplier: 2.0, scaleBonus: 0.04, glowIntensity: 0.12,
      accentColor: '#94a3b8',
      description: '2 слитка / тик · 12 слитков/мин',
    },
    {
      level: 3, name: 'Продвинутая',
      pointsCost: 35,  xpRequired: 1200,
      upgradeDurationMs: 60_000,
      rateMultiplier: 3.0, scaleBonus: 0.08, glowIntensity: 0.25,
      accentColor: '#4ade80',
      description: '3 слитка / тик · 18 слитков/мин',
    },
    {
      level: 4, name: 'Мощная',
      pointsCost: 80,  xpRequired: 3500,
      upgradeDurationMs: 120_000,
      rateMultiplier: 5.0, scaleBonus: 0.13, glowIntensity: 0.40,
      accentColor: '#fbbf24',
      description: '5 слитков / тик · 30 слитков/мин',
    },
    {
      level: 5, name: 'Высокотехнологичная',
      pointsCost: 150, xpRequired: 8000,
      upgradeDurationMs: 240_000,
      rateMultiplier: 8.0, scaleBonus: 0.18, glowIntensity: 0.55,
      accentColor: '#f97316',
      description: '8 слитков / тик · 48 слитков/мин',
    },
    {
      level: 6, name: 'Легендарная',
      pointsCost: 300, xpRequired: 20_000,
      upgradeDurationMs: 480_000,
      rateMultiplier: 12.0, scaleBonus: 0.24, glowIntensity: 0.80,
      accentColor: '#38bdf8',
      description: '12 слитков / тик · 72 слитка/мин',
    },
  ],

  // ── Pump / Насос (1 level — always stays at level 1) ──────────────────────
  'pump': [
    {
      level: 1, name: 'Насос',
      pointsCost: 0, xpRequired: 0,
      rateMultiplier: 1.0, scaleBonus: 0, glowIntensity: 0,
      accentColor: '#38bdf8',
      description: 'Базовый водяной насос — устанавливается на водоём',
    },
  ],

  // ── Pump Factory / Насосная станция (5 levels) ────────────────────────────
  'pump-factory': [
    {
      level: 1, name: 'Базовая',
      pointsCost: 0,   xpRequired: 0,
      capacityMultiplier: 1.0, waterCapacity: 200,
      scaleBonus: 0, glowIntensity: 0,
      accentColor: '#38bdf8',
      description: 'Хранит до 200 л воды',
    },
    {
      level: 2, name: 'Расширенная',
      pointsCost: 15,  xpRequired: 400,
      capacityMultiplier: 2.0, waterCapacity: 400,
      scaleBonus: 0.05, glowIntensity: 0.15,
      accentColor: '#7dd3fc',
      upgradeDurationMs: 60_000,
      description: 'Хранит до 400 л воды',
    },
    {
      level: 3, name: 'Промышленная',
      pointsCost: 40,  xpRequired: 1500,
      capacityMultiplier: 4.0, waterCapacity: 800,
      scaleBonus: 0.10, glowIntensity: 0.30,
      accentColor: '#0ea5e9',
      upgradeDurationMs: 120_000,
      description: 'Хранит до 800 л воды',
    },
    {
      level: 4, name: 'Мощная',
      pointsCost: 90,  xpRequired: 4000,
      capacityMultiplier: 6.0, waterCapacity: 1200,
      scaleBonus: 0.15, glowIntensity: 0.50,
      accentColor: '#06b6d4',
      upgradeDurationMs: 240_000,
      description: 'Хранит до 1 200 л воды',
    },
    {
      level: 5, name: 'Максимальная',
      pointsCost: 200, xpRequired: 10_000,
      capacityMultiplier: 7.5, waterCapacity: 1500,
      scaleBonus: 0.22, glowIntensity: 0.80,
      accentColor: '#a5f3fc',
      upgradeDurationMs: 480_000,
      description: 'Хранит до 1 500 л воды',
    },
  ],

  // ── Pump Drone / Дрон-насос (4 levels) ───────────────────────────────────
  'pump-drone': [
    {
      level: 1, name: 'Базовый',
      pointsCost: 0,   xpRequired: 0,
      rateMultiplier: 1.0, ratePerHour: 20,
      scaleBonus: 0, glowIntensity: 0,
      accentColor: '#38bdf8',
      description: 'Перевозит 20 л/ч',
    },
    {
      level: 2, name: 'Улучшенный',
      pointsCost: 12,  xpRequired: 300,
      rateMultiplier: 2.0, ratePerHour: 40,
      scaleBonus: 0.04, glowIntensity: 0.15,
      accentColor: '#7dd3fc',
      upgradeDurationMs: 45_000,
      description: 'Перевозит 40 л/ч',
    },
    {
      level: 3, name: 'Быстрый',
      pointsCost: 35,  xpRequired: 1200,
      rateMultiplier: 6.0, ratePerHour: 120,
      scaleBonus: 0.08, glowIntensity: 0.40,
      accentColor: '#0ea5e9',
      upgradeDurationMs: 90_000,
      description: 'Перевозит 120 л/ч',
    },
    {
      level: 4, name: 'Сверхбыстрый',
      pointsCost: 100, xpRequired: 5000,
      rateMultiplier: 10.0, ratePerHour: 200,
      scaleBonus: 0.15, glowIntensity: 0.70,
      accentColor: '#06b6d4',
      upgradeDurationMs: 180_000,
      description: 'Перевозит 200 л/ч',
    },
  ],

  // ── Steam Generator / Паровой генератор (4 levels) ─────────────────────────
  'steam-generator': [
    {
      level: 1, name: 'Базовый',
      pointsCost: 0,    xpRequired: 0,
      rateMultiplier: 1.0,  scaleBonus: 0,    glowIntensity: 0,
      accentColor: '#a78bfa',
      description: '100 кВт/ч · 2 угля + 1 вода → 1 пар',
    },
    {
      level: 2, name: 'Улучшенный',
      pointsCost: 18,   xpRequired: 500,
      upgradeDurationMs: 60_000,
      rateMultiplier: 2.0,  scaleBonus: 0.06, glowIntensity: 0.20,
      accentColor: '#c4b5fd',
      description: '200 кВт/ч · 4 угля + 2 воды → 2 пара',
    },
    {
      level: 3, name: 'Мощный',
      pointsCost: 50,   xpRequired: 2000,
      upgradeDurationMs: 120_000,
      rateMultiplier: 3.5,  scaleBonus: 0.12, glowIntensity: 0.40,
      accentColor: '#8b5cf6',
      description: '350 кВт/ч · 7 угля + 3.5 в → 3.5 пара',
    },
    {
      level: 4, name: 'Промышленный',
      pointsCost: 120,  xpRequired: 6000,
      upgradeDurationMs: 300_000,
      rateMultiplier: 6.0,  scaleBonus: 0.20, glowIntensity: 0.65,
      accentColor: '#7c3aed',
      description: '600 кВт/ч · 12 угля + 6 в → 6 паров',
    },
  ],
};
