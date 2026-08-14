import { describe, expect, it } from 'vitest';
import {
  addXp,
  applyXpToStats,
  calculateLevelFromXp,
} from '../../lib/companionEngine/experience';
import {
  getXpForLevel,
  getXpToNextLevel,
  LEVEL_THRESHOLDS,
  MAX_LEVEL,
} from '../../lib/companionEngine/levels';

describe('levels', () => {
  it('defines monotonically increasing thresholds', () => {
    for (let index = 1; index < LEVEL_THRESHOLDS.length; index += 1) {
      expect(LEVEL_THRESHOLDS[index]).toBeGreaterThan(LEVEL_THRESHOLDS[index - 1]);
    }
  });

  it('returns threshold xp for each level', () => {
    expect(getXpForLevel(1)).toBe(0);
    expect(getXpForLevel(2)).toBe(50);
    expect(getXpForLevel(MAX_LEVEL)).toBe(LEVEL_THRESHOLDS[MAX_LEVEL - 1]);
  });

  it('returns xp required to reach the next level', () => {
    expect(getXpToNextLevel(1)).toBe(50);
    expect(getXpToNextLevel(MAX_LEVEL)).toBeNull();
  });
});

describe('experience', () => {
  it('calculates level from cumulative xp', () => {
    expect(calculateLevelFromXp(0)).toBe(1);
    expect(calculateLevelFromXp(49)).toBe(1);
    expect(calculateLevelFromXp(50)).toBe(2);
    expect(calculateLevelFromXp(4370)).toBe(MAX_LEVEL);
    expect(calculateLevelFromXp(99999)).toBe(MAX_LEVEL);
  });

  it('adds xp and reports level gains', () => {
    expect(addXp(40, 20)).toEqual({ xp: 60, level: 2, levelsGained: 1 });
    expect(addXp(0, 8)).toEqual({ xp: 8, level: 1, levelsGained: 0 });
  });

  it('updates stats xp and level together', () => {
    const stats = applyXpToStats(
      { joy: 50, energy: 50, bond: 50, xp: 45, level: 1, pawPoints: 0 },
      10,
    );

    expect(stats.xp).toBe(55);
    expect(stats.level).toBe(2);
  });
});
