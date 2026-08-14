import { describe, expect, it } from 'vitest';
import {
  awardPawPoints,
  calculateDailyCarePawPoints,
  calculateMemoryPawPoints,
  capDailyPawPoints,
  isDailyCareComplete,
  PAW_POINTS_DAILY_MAX,
  recordCompletedCareAction,
} from '../../lib/companionEngine/rewards';

describe('rewards', () => {
  it('awards 10 paw points when all four care actions are complete', () => {
    const completed = recordCompletedCareAction([], 'feed');
    const withPlay = recordCompletedCareAction(completed, 'play');
    const withGroom = recordCompletedCareAction(withPlay, 'groom');
    const withRest = recordCompletedCareAction(withGroom, 'rest');

    expect(isDailyCareComplete(withRest)).toBe(true);
    expect(calculateDailyCarePawPoints(withRest)).toBe(10);
  });

  it('awards 5 paw points per memory', () => {
    expect(calculateMemoryPawPoints(2)).toBe(10);
  });

  it('caps daily paw points at 15', () => {
    expect(capDailyPawPoints(0, 10)).toEqual({ awarded: 10, totalToday: 10 });
    expect(capDailyPawPoints(10, 10)).toEqual({ awarded: 5, totalToday: 15 });
    expect(capDailyPawPoints(15, 5)).toEqual({ awarded: 0, totalToday: 15 });
  });

  it('adds capped paw points to the balance', () => {
    const result = awardPawPoints(100, 10, 10);

    expect(result.awarded).toBe(5);
    expect(result.totalToday).toBe(PAW_POINTS_DAILY_MAX);
    expect(result.pawPoints).toBe(105);
  });
});
