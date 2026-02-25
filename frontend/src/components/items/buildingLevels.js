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
  // Level unlocks a better ore type AND increases the mining rate.
  // oreType / oreIcon are used by the Extractor visual and info badge.
  'extractor': [
    {
      level: 1, name: 'Базовый',
      pointsCost: 0,   xpRequired: 0,
      rateMultiplier: 1.0,  scaleBonus: 0,    glowIntensity: 0,
      accentColor: '#52525b',
      oreType: 'Уголь',   oreIcon: '⬛',
      description: 'Добывает уголь — 3 ед./ч',
    },
    {
      level: 2, name: 'Улучшенный',
      pointsCost: 10,  xpRequired: 200,
      upgradeDurationMs: 30_000,  // 30 seconds
      rateMultiplier: 1.5,  scaleBonus: 0.04, glowIntensity: 0.12,
      accentColor: '#b45309',
      oreType: 'Железо',  oreIcon: '🟤',
      description: 'Добывает железо — 4.5 ед./ч',
    },
    {
      level: 3, name: 'Продвинутый',
      pointsCost: 28,  xpRequired: 800,
      upgradeDurationMs: 60_000,  // 60 seconds
      rateMultiplier: 2.0,  scaleBonus: 0.08, glowIntensity: 0.28,
      accentColor: '#94a3b8',
      oreType: 'Серебро', oreIcon: '🔘',
      description: 'Добывает серебро — 6 ед./ч',
    },
    {
      level: 4, name: 'Мощный',
      pointsCost: 65,  xpRequired: 2500,
      upgradeDurationMs: 120_000,  // 2 minutes
      rateMultiplier: 3.0,  scaleBonus: 0.13, glowIntensity: 0.45,
      accentColor: '#eab308',
      oreType: 'Золото',  oreIcon: '🟡',
      description: 'Добывает золото — 9 ед./ч',
    },
    {
      level: 5, name: 'Легендарный',
      pointsCost: 150, xpRequired: 8000,
      upgradeDurationMs: 300_000,  // 5 minutes
      rateMultiplier: 5.0,  scaleBonus: 0.20, glowIntensity: 0.65,
      accentColor: '#38bdf8',
      oreType: 'Алмаз',   oreIcon: '💎',
      description: 'Добывает алмазы — 15 ед./ч',
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
      upgradeDurationMs: 0,
      description: '3 строителя — максимальная производительность',
    },
  ],
};
