import type { CareActionType, CooldownState } from './types';
import { COOLDOWN_MS } from './types';

export function isActionOnCooldown(
  lastActionAt: string | null,
  now: Date,
): boolean {
  if (lastActionAt === null) {
    return false;
  }

  const elapsed = now.getTime() - new Date(lastActionAt).getTime();
  return elapsed < COOLDOWN_MS;
}

export function getCooldownRemainingMs(
  lastActionAt: string | null,
  now: Date,
): number {
  if (lastActionAt === null) {
    return 0;
  }

  const remaining = COOLDOWN_MS - (now.getTime() - new Date(lastActionAt).getTime());
  return Math.max(0, remaining);
}

export function canPerformCareAction(
  cooldowns: CooldownState,
  action: CareActionType,
  now: Date,
): boolean {
  return !isActionOnCooldown(cooldowns.lastActionAt[action], now);
}

export function recordCareActionCooldown(
  cooldowns: CooldownState,
  action: CareActionType,
  now: Date,
): CooldownState {
  return {
    lastActionAt: {
      ...cooldowns.lastActionAt,
      [action]: now.toISOString(),
    },
  };
}

export function createEmptyCooldownState(): CooldownState {
  return {
    lastActionAt: {
      feed: null,
      play: null,
      groom: null,
      rest: null,
    },
  };
}
