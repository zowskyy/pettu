import type { CareActionType } from './types';
import { CARE_ACTION_TYPES } from './types';

export const PAW_POINTS_DAILY_CARE_COMPLETE = 10;
export const PAW_POINTS_PER_MEMORY = 5;
export const PAW_POINTS_DAILY_MAX = 15;

export function isDailyCareComplete(completedActions: CareActionType[]): boolean {
  return CARE_ACTION_TYPES.every((action) => completedActions.includes(action));
}

export function calculateDailyCarePawPoints(
  completedActions: CareActionType[],
): number {
  return isDailyCareComplete(completedActions) ? PAW_POINTS_DAILY_CARE_COMPLETE : 0;
}

export function calculateMemoryPawPoints(memoryCount: number): number {
  return Math.max(0, memoryCount) * PAW_POINTS_PER_MEMORY;
}

export function capDailyPawPoints(
  alreadyEarnedToday: number,
  additionalPoints: number,
): { awarded: number; totalToday: number } {
  const remaining = Math.max(0, PAW_POINTS_DAILY_MAX - alreadyEarnedToday);
  const awarded = Math.min(remaining, Math.max(0, additionalPoints));

  return {
    awarded,
    totalToday: alreadyEarnedToday + awarded,
  };
}

export function awardPawPoints(
  currentBalance: number,
  alreadyEarnedToday: number,
  additionalPoints: number,
): {
  pawPoints: number;
  awarded: number;
  totalToday: number;
} {
  const capped = capDailyPawPoints(alreadyEarnedToday, additionalPoints);

  return {
    pawPoints: currentBalance + capped.awarded,
    awarded: capped.awarded,
    totalToday: capped.totalToday,
  };
}

export function recordCompletedCareAction(
  completedActions: CareActionType[],
  action: CareActionType,
): CareActionType[] {
  if (completedActions.includes(action)) {
    return completedActions;
  }

  return [...completedActions, action];
}
