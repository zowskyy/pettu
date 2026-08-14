import { describe, it, expect } from 'vitest';
import {
  applyCareActionToStats,
  getCareActionEffect,
  CARE_ACTION_EFFECTS,
} from '../../lib/companionEngine/careActions';
import { createDefaultStats, performCareAction, createInitialEngineState } from '../../lib/companionEngine';
import { calculateMood } from '../../lib/companionEngine/mood';
import { canPerformCareAction, createEmptyCooldownState } from '../../lib/companionEngine/cooldowns';
import { applyDailyDecay, countMissedPeriods, getLocalPeriodKey } from '../../lib/companionEngine/dailyReset';
import { calculateLevelFromXp } from '../../lib/companionEngine/experience';

describe('careActions', () => {
  it('feed applies correct deltas', () => {
    const stats = createDefaultStats();
    const result = applyCareActionToStats(stats, 'feed');
    expect(result.joy).toBe(stats.joy + 10);
    expect(result.energy).toBe(stats.energy + 5);
    expect(result.bond).toBe(stats.bond + 5);
    expect(result.xp).toBe(stats.xp + 8);
  });

  it('play reduces energy', () => {
    const stats = createDefaultStats();
    const result = applyCareActionToStats(stats, 'play');
    expect(result.joy).toBe(stats.joy + 15);
    expect(result.energy).toBe(stats.energy - 10);
  });

  it('all action effects match spec', () => {
    expect(CARE_ACTION_EFFECTS.feed).toEqual({ type: 'feed', joy: 10, energy: 5, bond: 5, xp: 8 });
    expect(CARE_ACTION_EFFECTS.play).toEqual({ type: 'play', joy: 15, energy: -10, bond: 8, xp: 10 });
    expect(CARE_ACTION_EFFECTS.groom).toEqual({ type: 'groom', joy: 8, bond: 3, xp: 6 });
    expect(CARE_ACTION_EFFECTS.rest).toEqual({ type: 'rest', energy: 15, bond: 4, xp: 6 });
  });
});

describe('cooldowns', () => {
  it('blocks action within 4 hours', () => {
    const now = new Date('2026-08-14T12:00:00Z');
    const cooldowns = createEmptyCooldownState();
    cooldowns.lastActionAt.feed = '2026-08-14T10:00:00Z';
    expect(canPerformCareAction(cooldowns, 'feed', now)).toBe(false);
  });

  it('allows action after 4 hours', () => {
    const now = new Date('2026-08-14T15:00:00Z');
    const cooldowns = createEmptyCooldownState();
    cooldowns.lastActionAt.feed = '2026-08-14T10:00:00Z';
    expect(canPerformCareAction(cooldowns, 'feed', now)).toBe(true);
  });
});

describe('dailyReset', () => {
  it('applies joy and energy decay with floor', () => {
    const result = applyDailyDecay({ joy: 30, energy: 30, bond: 50 });
    expect(result.joy).toBe(25);
    expect(result.energy).toBe(25);
    expect(result.bond).toBe(50);
  });

  it('bond never decreases', () => {
    const result = applyDailyDecay({ joy: 100, energy: 100, bond: 80 });
    expect(result.bond).toBe(80);
  });
});

describe('mood', () => {
  it('returns Needs Attention when joy is low', () => {
    expect(calculateMood({ joy: 30, energy: 70, bond: 50 })).toBe('Needs Attention');
  });

  it('returns Thriving at high meters', () => {
    expect(calculateMood({ joy: 85, energy: 75, bond: 75 })).toBe('Thriving');
  });
});

describe('experience', () => {
  it('starts at level 1', () => {
    expect(calculateLevelFromXp(0)).toBe(1);
  });
});

describe('performCareAction integration', () => {
  it('returns cooldown failure on replay', () => {
    const now = new Date('2026-08-14T12:00:00Z');
    const periodKey = getLocalPeriodKey(now, 'UTC');
    const state = createInitialEngineState(periodKey);

    const first = performCareAction(state, 'feed', now, 'UTC');
    expect(first.ok).toBe(true);

    if (first.ok) {
      const second = performCareAction(first.state, 'feed', now, 'UTC');
      expect(second.ok).toBe(false);
      if (!second.ok) expect(second.reason).toBe('cooldown');
    }
  });
});
