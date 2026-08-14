import { describe, expect, it } from 'vitest';
import {
  canPerformCareAction,
  createEmptyCooldownState,
  getCooldownRemainingMs,
  isActionOnCooldown,
  recordCareActionCooldown,
} from '../../lib/companionEngine/cooldowns';
import { COOLDOWN_MS } from '../../lib/companionEngine/types';

describe('cooldowns', () => {
  const now = new Date('2026-08-14T12:00:00.000Z');

  it('allows first action when no prior timestamp exists', () => {
    const cooldowns = createEmptyCooldownState();

    expect(canPerformCareAction(cooldowns, 'feed', now)).toBe(true);
    expect(isActionOnCooldown(null, now)).toBe(false);
  });

  it('blocks an action within the 4-hour cooldown window', () => {
    const cooldowns = recordCareActionCooldown(createEmptyCooldownState(), 'feed', now);
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    expect(canPerformCareAction(cooldowns, 'feed', twoHoursLater)).toBe(false);
    expect(isActionOnCooldown(cooldowns.lastActionAt.feed, twoHoursLater)).toBe(true);
  });

  it('allows an action after the cooldown expires', () => {
    const cooldowns = recordCareActionCooldown(createEmptyCooldownState(), 'feed', now);
    const fourHoursLater = new Date(now.getTime() + COOLDOWN_MS);

    expect(canPerformCareAction(cooldowns, 'feed', fourHoursLater)).toBe(true);
    expect(getCooldownRemainingMs(cooldowns.lastActionAt.feed, fourHoursLater)).toBe(0);
  });

  it('tracks cooldowns independently per action type', () => {
    const cooldowns = recordCareActionCooldown(createEmptyCooldownState(), 'feed', now);
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    expect(canPerformCareAction(cooldowns, 'feed', oneHourLater)).toBe(false);
    expect(canPerformCareAction(cooldowns, 'play', oneHourLater)).toBe(true);
  });
});
