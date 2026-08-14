export * from './types';
export * from './careActions';
export * from './mood';
export * from './experience';
export * from './levels';
export * from './dailyReset';
export * from './rewards';
export * from './cooldowns';

import { applyCareActionToStats } from './careActions';
import { canPerformCareAction, recordCareActionCooldown } from './cooldowns';
import { processDailyReset } from './dailyReset';
import { calculateMood } from './mood';
import {
  awardPawPoints,
  calculateDailyCarePawPoints,
  recordCompletedCareAction,
} from './rewards';
import type {
  CareActionType,
  CompanionEngineState,
  CompanionStats,
} from './types';
import { createEmptyCooldownState } from './cooldowns';

export function createDefaultStats(): CompanionStats {
  return {
    joy: 70,
    energy: 70,
    bond: 50,
    xp: 0,
    level: 1,
    pawPoints: 0,
  };
}

export function createInitialEngineState(
  periodKey: string,
): CompanionEngineState {
  return {
    stats: createDefaultStats(),
    cooldowns: createEmptyCooldownState(),
    daily: {
      periodKey,
      completedActions: [],
      pawPointsEarnedToday: 0,
    },
    lastProcessedPeriod: periodKey,
  };
}

export type PerformCareActionResult =
  | { ok: true; state: CompanionEngineState; mood: ReturnType<typeof calculateMood> }
  | { ok: false; reason: 'cooldown' };

export function performCareAction(
  state: CompanionEngineState,
  action: CareActionType,
  now: Date,
  timezone: string,
): PerformCareActionResult {
  const resetState = processDailyReset(state, now, timezone);

  if (!canPerformCareAction(resetState.cooldowns, action, now)) {
    return { ok: false, reason: 'cooldown' };
  }

  const stats = applyCareActionToStats(resetState.stats, action);

  const completedActions = recordCompletedCareAction(
    resetState.daily.completedActions,
    action,
  );
  const dailyCarePoints = calculateDailyCarePawPoints(completedActions);
  const previousDailyCarePoints = calculateDailyCarePawPoints(
    resetState.daily.completedActions,
  );
  const incrementalPoints = dailyCarePoints - previousDailyCarePoints;
  const pawPointAward = awardPawPoints(
    resetState.stats.pawPoints,
    resetState.daily.pawPointsEarnedToday,
    incrementalPoints,
  );

  const nextState: CompanionEngineState = {
    ...resetState,
    stats: {
      ...stats,
      pawPoints: pawPointAward.pawPoints,
    },
    cooldowns: recordCareActionCooldown(resetState.cooldowns, action, now),
    daily: {
      ...resetState.daily,
      completedActions,
      pawPointsEarnedToday: pawPointAward.totalToday,
    },
  };

  return {
    ok: true,
    state: nextState,
    mood: calculateMood(nextState.stats),
  };
}
