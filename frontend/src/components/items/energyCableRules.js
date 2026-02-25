// ─── Energy Cable rules ───────────────────────────────────────────────────────
//
// Defines which buildings can be connected via energy cables.
// Import this file as a side-effect to register the rules.

import { registerCableRule } from '../systems/energyCable.js';

// Солнечная панель → Хранилище энергии
// Электроэнергия накапливается в хранилище.
registerCableRule('solar-panel', 'energy-storage', {
  resource:    'solar',
  ratePerHour: 10,
  color:       '#facc15',   // yellow
  icon:        '⚡',
  label:       'Электроэнергия',
  unit:        'кВт/ч',
});

// Солнечная панель → Монетная фабрика (питание)
// Кабель даёт фабрике статус "работает" (power).
registerCableRule('solar-panel', 'money-factory', {
  resource:    'power',
  ratePerHour: 0,           // только статус "запитан", ресурс не накапливается
  color:       '#facc15',
  icon:        '⚡',
  label:       'Питание',
  unit:        'кВт/ч',
});

// Солнечная панель → Фонарный столб (питание)
// Кабель подаёт питание в фонарь для ночного освещения.
registerCableRule('solar-panel', 'street-lamp', {
  resource:    'power',
  ratePerHour: 2,           // 2 кВт потребляет один фонарь
  color:       '#fde047',   // warm yellow
  icon:        '💡',
  label:       'Освещение',
  unit:        'кВт/ч',
});
