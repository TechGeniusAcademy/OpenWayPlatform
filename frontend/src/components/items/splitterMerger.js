// ─── Splitter & Merger — item configs + conveyor rules ──────────────────────
import { registerTransferRule, registerConveyorLimits } from '../systems/conveyor.js';

export const SPLITTER_CONFIG = {
  workArea: { width: 8, depth: 8, color: '#f59e0b', opacity: 0.14, label: 'Зона распределителя' },
  badgeHeight: 6,
};

export const MERGER_CONFIG = {
  workArea: { width: 8, depth: 8, color: '#8b5cf6', opacity: 0.14, label: 'Зона соединителя' },
  badgeHeight: 6,
};

// ── Slot limits ──────────────────────────────────────────────────────────────
registerConveyorLimits('splitter', { maxIn: 1, maxOut: 2 });
registerConveyorLimits('merger',   { maxIn: 2, maxOut: 1 });

// ── Splitter: incoming ────────────────────────────────────────────────────────
registerTransferRule('money-factory',  'splitter', { resource: 'coins', ratePerHour: 10, color: '#fbbf24', icon: '🪙', label: 'Монеты', unit: 'монет/ч' });
registerTransferRule('energy-storage', 'splitter', { resource: 'coins', ratePerHour: 20, color: '#fbbf24', icon: '🪙', label: 'Монеты', unit: 'монет/ч' });
registerTransferRule('merger',         'splitter', { resource: 'coins', ratePerHour: 10, color: '#fbbf24', icon: '🪙', label: 'Монеты', unit: 'монет/ч' });

// ── Splitter: outgoing ────────────────────────────────────────────────────────
// base 40/h × rateMultiplier per output → total 80 / 160 / 640 coins/h (2 outputs)
registerTransferRule('splitter', 'town-hall',      { resource: 'coins', ratePerHour: 40, color: '#fbbf24', icon: '🪙', label: 'Монеты', unit: 'монет/ч' });
registerTransferRule('splitter', 'energy-storage', { resource: 'coins', ratePerHour: 40, color: '#fbbf24', icon: '🪙', label: 'Монеты', unit: 'монет/ч' });
registerTransferRule('splitter', 'merger',         { resource: 'coins', ratePerHour: 40, color: '#fbbf24', icon: '🪙', label: 'Монеты', unit: 'монет/ч' });
registerTransferRule('splitter', 'splitter',       { resource: 'coins', ratePerHour: 40, color: '#fbbf24', icon: '🪙', label: 'Монеты', unit: 'монет/ч' });
// ── Merger: incoming ──────────────────────────────────────────────────────────
// ratePerHour must match the SOURCE building's base production rate so that
// Pass 1 (rate = ratePerHour × source.rateMultiplier) stays correct.
// Pass-through sources (splitter, merger) are handled in Pass 2 and use the
// OUTGOING cap already defined above — so no separate override needed for them.
registerTransferRule('money-factory',  'merger', { resource: 'coins', ratePerHour: 10, color: '#fbbf24', icon: '🪙', label: 'Монеты', unit: 'монет/ч' });
registerTransferRule('energy-storage', 'merger', { resource: 'coins', ratePerHour: 20, color: '#fbbf24', icon: '🪙', label: 'Монеты', unit: 'монет/ч' });
// splitter→merger: keep at 40 (same as all other splitter outputs) — do NOT re-register here
// because that would overwrite the correct cap of 40 set in "Splitter: outgoing" above.
// merger→merger incoming is covered by the merger outgoing section below.
// ── Merger: outgoing ──────────────────────────────────────────────────────────
// base 80/h × rateMultiplier → total cap: Lv1=80, Lv2=160, Lv3=640 coins/h
registerTransferRule('merger', 'town-hall',      { resource: 'coins', ratePerHour: 80, color: '#fbbf24', icon: '🪙', label: 'Монеты', unit: 'монет/ч' });
registerTransferRule('merger', 'energy-storage', { resource: 'coins', ratePerHour: 80, color: '#fbbf24', icon: '🪙', label: 'Монеты', unit: 'монет/ч' });
registerTransferRule('merger', 'splitter',       { resource: 'coins', ratePerHour: 80, color: '#fbbf24', icon: '🪙', label: 'Монеты', unit: 'монет/ч' });
registerTransferRule('merger', 'merger',         { resource: 'coins', ratePerHour: 80, color: '#fbbf24', icon: '🪙', label: 'Монеты', unit: 'монет/ч' });
