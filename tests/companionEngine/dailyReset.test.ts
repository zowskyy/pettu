import { describe, expect, it } from 'vitest';
import {
  applyDailyDecay,
  applyMissedDailyDecay,
  countMissedPeriods,
  getLocalPeriodKey,
  processDailyReset,
} from '../../lib/companionEngine/dailyReset';
import { createInitialEngineState } from '../../lib/companionEngine';

describe('dailyReset', () => {
  it('uses 4 AM local as the period boundary', () => {
    const beforeReset = new Date('2026-08-14T07:59:00.000Z');
    const afterReset = new Date('2026-08-14T08:00:00.000Z');

    expect(getLocalPeriodKey(beforeReset, 'America/New_York')).toBe('2026-08-13');
    expect(getLocalPeriodKey(afterReset, 'America/New_York')).toBe('2026-08-14');
  });

  it('applies daily decay with floors and preserves bond', () => {
    const next = applyDailyDecay({ joy: 50, energy: 50, bond: 70 });

    expect(next).toEqual({ joy: 42, energy: 45, bond: 70 });
  });

  it('never drops joy or energy below 25', () => {
    const next = applyDailyDecay({ joy: 28, energy: 26, bond: 40 });

    expect(next.joy).toBe(25);
    expect(next.energy).toBe(25);
    expect(next.bond).toBe(40);
  });

  it('counts missed periods between last processed and now', () => {
    expect(countMissedPeriods('2026-08-10', new Date('2026-08-15T12:00:00.000Z'), 'UTC')).toBe(5);
    expect(countMissedPeriods('2026-08-15', new Date('2026-08-15T12:00:00.000Z'), 'UTC')).toBe(0);
    expect(countMissedPeriods(null, new Date('2026-08-15T12:00:00.000Z'), 'UTC')).toBe(0);
  });

  it('applies decay once per missed period', () => {
    const once = applyMissedDailyDecay({ joy: 50, energy: 50, bond: 60 }, 1);
    const five = applyMissedDailyDecay({ joy: 50, energy: 50, bond: 60 }, 5);

    expect(once).toEqual({ joy: 42, energy: 45, bond: 60 });
    expect(five).toEqual({ joy: 25, energy: 25, bond: 60 });
  });

  it('processes five missed days on access', () => {
    const state = createInitialEngineState('2026-08-10');
    const next = processDailyReset(state, new Date('2026-08-15T12:00:00.000Z'), 'UTC');

    expect(next.stats.joy).toBe(30);
    expect(next.stats.energy).toBe(45);
    expect(next.stats.bond).toBe(state.stats.bond);
    expect(next.lastProcessedPeriod).toBe('2026-08-15');
    expect(next.daily.completedActions).toEqual([]);
    expect(next.daily.pawPointsEarnedToday).toBe(0);
  });
});
