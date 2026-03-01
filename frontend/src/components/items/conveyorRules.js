// ─── Conveyor transfer rules ──────────────────────────────────────────────────
//
// Add new entries here to enable conveyors between different building types.
// Each call to registerTransferRule creates a directed edge in the transfer graph.

import {
  registerTransferRule,
  registerConveyorOutPort,
  registerConveyorOutSide,
  registerConveyorLimits,
} from '../systems/conveyor.js';

// ─── Drone slot limits ────────────────────────────────────────────────────────
// Storage and town-hall are delivery hubs — they can accept drones from many
// sources simultaneously.
registerConveyorLimits('energy-storage', { maxOut: 4,  maxIn: 20 });
registerConveyorLimits('town-hall',      { maxOut: 1,  maxIn: 20 });
// Money factory can send drones to many targets — coins split evenly.
registerConveyorLimits('money-factory',  { maxOut: 10, maxIn: 1  });


// ─── Money Factory: output port & side constraint ───────────────────────────
//
// PORT — смещение точки подключения ленты относительно центра здания.
//   dx — вправо/влево,  dz — вперёд/назад  (мировые единицы).
//   Меняй эти числа пока лента не будет выходить из нужного отверстия фасада.
const FACTORY_PORT_DX = 0;    // ◄── твоя настройка (по горизонтали)
const FACTORY_PORT_DZ = 2.5;  // ◄── твоя настройка (глубина выхода)

// SIDE — разрешённое направление выхода (единичный вектор в мировых осях).
//   { dx: 0, dz: 1 }  = лента может уходить только вперёд (+Z)
//   { dx: 1, dz: 0 }  = только вправо (+X),  { dx: -1, dz: 0 } = только влево
//   Dot-порог 0.5 → допуск ±60° вокруг выбранного направления.
const FACTORY_SIDE_DX = 0;    // ◄── твоя настройка
const FACTORY_SIDE_DZ = 1;    // ◄── твоя настройка

registerConveyorOutPort('money-factory', { dx: FACTORY_PORT_DX, dz: FACTORY_PORT_DZ });
registerConveyorOutSide('money-factory', { dx: FACTORY_SIDE_DX, dz: FACTORY_SIDE_DZ });

// Монетная фабрика → Хранилище энергии
// Монеты движутся с завода в хранилище.
registerTransferRule('money-factory', 'energy-storage', {
  resource:    'coins',
  ratePerHour: 10,
  color:       '#fbbf24',   // gold yellow
  icon:        '🪙',
  label:       'Монеты',
  unit:        'монет/ч',
});

// Солнечная панель → Хранилище энергии
// Электроэнергия поступает напрямую в хранилище.
registerTransferRule('solar-panel', 'energy-storage', {
  resource:    'solar',
  ratePerHour: 5,
  color:       '#38bdf8',   // sky blue
  icon:        '⚡',
  label:       'Электричество',
  unit:        'кВт/ч',
});

// Денежная фабрика → Ратуша
// Монеты идут прямо в ратушу для конвертации в очки.
registerTransferRule('money-factory', 'town-hall', {
  resource:    'coins',
  ratePerHour: 10,
  color:       '#fbbf24',
  icon:        '🪙',
  label:       'Монеты',
  unit:        'монет/ч',
});

// Хранилище энергии → Ратуша
// Запасённые монеты можно доставить в ратушу.
registerTransferRule('energy-storage', 'town-hall', {
  resource:    'coins',
  ratePerHour: 20,
  color:       '#fbbf24',
  icon:        '🪙',
  label:       'Монеты',
  unit:        'монет/ч',
});

// Экстрактор → Хранилище энергии
// Добытая руда передаётся в хранилище.
registerTransferRule('extractor', 'energy-storage', {
  resource:    'ore',
  ratePerHour: 3,     // base rate — scaled by extractor level in calcConveyorRates
  color:       '#a8874a',
  icon:        '⛏️',
  label:       'Руда',
  unit:        'ед./ч',
});
