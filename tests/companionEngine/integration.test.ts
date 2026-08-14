import { describe, expect, it } from 'vitest';
import {
  createInitialEngineState,
  performCareAction,
} from '../../lib/companionEngine';

describe('companionEngine integration', () => {
  const timezone = 'UTC';
  const periodKey = '2026-08-14';

  it('performs a full daily care loop without AI involvement', () => {
    let state = createInitialEngineState(periodKey);
    let now = new Date('2026-08-14T12:00:00.000Z');

    const actions = ['feed', 'play', 'groom', 'rest'] as const;

    for (const action of actions) {
      const result = performCareAction(state, action, now, timezone);
      expect(result.ok).toBe(true);
      if (result.ok) {
        state = result.state;
      }
      now = new Date(now.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000);
    }

    expect(state.stats.joy).toBeGreaterThan(70);
    expect(state.stats.xp).toBe(8 + 10 + 6 + 6);
    expect(state.daily.completedActions).toEqual(['feed', 'play', 'groom', 'rest']);
    expect(state.daily.pawPointsEarnedToday).toBe(10);
    expect(state.stats.pawPoints).toBe(10);
  });

  it('rejects duplicate actions inside the cooldown window', () => {
    const state = createInitialEngineState(periodKey);
    const now = new Date('2026-08-14T12:00:00.000Z');
    const first = performCareAction(state, 'feed', now, timezone);
    expect(first.ok).toBe(true);

    const second = performCareAction(first.ok ? first.state : state, 'feed', now, timezone);
    expect(second).toEqual({ ok: false, reason: 'cooldown' });
  });

  it('applies missed daily decay before performing care', () => {
    const state = createInitialEngineState('2026-08-10');
    const now = new Date('2026-08-15T12:00:00.000Z');
    const result = performCareAction(state, 'feed', now, timezone);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.stats.joy).toBe(40);
      expect(result.state.stats.energy).toBe(50);
      expect(result.state.stats.bond).toBe(55);
      expect(result.mood).toBe('Calm');
    }
  });
});

const COOLDOWN_HOURS = 4;
