// ─── Conveyor transfer rules ──────────────────────────────────────────────────
//
// Add new entries here to enable conveyors between different building types.
// Each call to registerTransferRule creates a directed edge in the transfer graph.

import { registerTransferRule } from '../systems/conveyor.js';

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
