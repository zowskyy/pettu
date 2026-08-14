import { describe, expect, it } from 'vitest';
import {
  applyCareActionToStats,
  applyMeterDeltas,
  CARE_ACTION_EFFECTS,
  getCareActionEffect,
} from '../../lib/companionEngine/careActions';
import { createDefaultStats } from '../../lib/companionEngine';

describe('careActions', () => {
  it('defines exact spec deltas for each action', () => {
    expect(CARE_ACTION_EFFECTS.feed).toEqual({
      type: 'feed',
      joy: 10,
      energy: 5,
      bond: 5,
      xp: 8,
    });
    expect(CARE_ACTION_EFFECTS.play).toEqual({
      type: 'play',
      joy: 15,
      energy: -10,
      bond: 8,
      xp: 10,
    });
    expect(CARE_ACTION_EFFECTS.groom).toEqual({
      type: 'groom',
      joy: 8,
      bond: 3,
      xp: 6,
    });
    expect(CARE_ACTION_EFFECTS.rest).toEqual({
      type: 'rest',
      energy: 15,
      bond: 4,
      xp: 6,
    });
  });

  it('applies feed deltas to stats and xp', () => {
    const base = createDefaultStats();
    const next = applyCareActionToStats(base, 'feed');

    expect(next.joy).toBe(base.joy + 10);
    expect(next.energy).toBe(base.energy + 5);
    expect(next.bond).toBe(base.bond + 5);
    expect(next.xp).toBe(8);
    expect(next.level).toBe(1);
  });

  it('applies play energy penalty without dropping below zero', () => {
    const next = applyCareActionToStats(
      { joy: 50, energy: 5, bond: 50, xp: 0, level: 1, pawPoints: 0 },
      'play',
    );

    expect(next.joy).toBe(65);
    expect(next.energy).toBe(0);
    expect(next.bond).toBe(58);
    expect(next.xp).toBe(10);
  });

  it('clamps meters to 0-100', () => {
    const next = applyMeterDeltas(
      { joy: 95, energy: 95, bond: 98 },
      getCareActionEffect('feed'),
    );

    expect(next.joy).toBe(100);
    expect(next.energy).toBe(100);
    expect(next.bond).toBe(100);
  });
});
