import { describe, expect, it } from 'vitest';
import { calculateMood } from '../../lib/companionEngine/mood';

describe('mood', () => {
  it('returns Needs Attention when joy or energy is low', () => {
    expect(calculateMood({ joy: 30, energy: 70, bond: 70 })).toBe('Needs Attention');
    expect(calculateMood({ joy: 70, energy: 30, bond: 70 })).toBe('Needs Attention');
  });

  it('returns Sleepy when energy is below 50 but not critical', () => {
    expect(calculateMood({ joy: 60, energy: 45, bond: 60 })).toBe('Sleepy');
  });

  it('returns Thriving for high balanced meters', () => {
    expect(calculateMood({ joy: 85, energy: 75, bond: 80 })).toBe('Thriving');
  });

  it('returns Playful for high joy and moderate energy', () => {
    expect(calculateMood({ joy: 75, energy: 60, bond: 50 })).toBe('Playful');
  });

  it('returns Cozy for high bond with moderate meters', () => {
    expect(calculateMood({ joy: 55, energy: 50, bond: 75 })).toBe('Cozy');
  });

  it('returns Happy for solid joy', () => {
    expect(calculateMood({ joy: 65, energy: 50, bond: 50 })).toBe('Happy');
  });

  it('returns Calm as the default balanced state', () => {
    expect(calculateMood({ joy: 50, energy: 50, bond: 50 })).toBe('Calm');
  });
});
