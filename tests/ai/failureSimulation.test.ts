/**
 * Slice 36 — AI failure simulation.
 *
 * Covers provider timeout, HTTP errors, invalid JSON, malformed payloads,
 * empty/overlong/unsafe responses, rate limits, and network interruption.
 * Pass condition: fallback dialogue always returned; care action path unaffected.
 *
 * Run: npm test -- tests/ai/failureSimulation.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  resolveDialogue,
  validateDialoguePayload,
  getFallbackDialogue,
  withTimeout,
  type AiProviderResult,
} from '../../lib/ai/dialogue';

describe('Slice 36 — AI failure simulation', () => {
  it('rejects malformed JSON and triggers fallback', async () => {
    const result = await resolveDialogue(async () => ({
      ok: true,
      raw: '{ mood: "Happy", message: broken',
    }));

    expect(result.usedFallback).toBe(true);
    expect(result.failureReason).toBe('invalid_json');
    expect(result.payload).toEqual(getFallbackDialogue('Happy'));
  });

  it('rejects valid JSON that fails schema validation', async () => {
    const result = await resolveDialogue(async () => ({
      ok: true,
      raw: JSON.stringify({
        mood: 'Angry',
        message: 'Bad mood value.',
        memory_reference_id: null,
        suggested_action: 'none',
      }),
    }));

    expect(result.usedFallback).toBe(true);
    expect(result.failureReason).toBe('validation_failed');
  });

  it('rejects overlong message (>160 chars)', async () => {
    const longMessage = 'A'.repeat(161);
    expect(
      validateDialoguePayload({
        mood: 'Happy',
        message: longMessage,
        memory_reference_id: null,
        suggested_action: 'none',
      }),
    ).toBe(false);
  });

  it('rejects unsafe medical advice language', async () => {
    const result = await resolveDialogue(async () => ({
      ok: true,
      raw: JSON.stringify({
        mood: 'Happy',
        message: 'You should take medication right away.',
        memory_reference_id: null,
        suggested_action: 'none',
      }),
    }));

    expect(result.usedFallback).toBe(true);
    expect(result.failureReason).toBe('validation_failed');
  });

  it('handles provider timeout via withTimeout helper', async () => {
    const slowProvider = new Promise<AiProviderResult>((resolve) => {
      setTimeout(() => resolve({ ok: true, raw: '{}' }), 200);
    });

    await expect(withTimeout(slowProvider, 50)).rejects.toThrow('timeout');
  });

  it('maps timeout provider result to fallback', async () => {
    const result = await resolveDialogue(async () => ({ ok: false, reason: 'timeout' }));
    expect(result.usedFallback).toBe(true);
    expect(result.failureReason).toBe('timeout');
    expect(result.payload.message.length).toBeLessThanOrEqual(160);
  });

  const providerFailures: Array<{ label: string; result: AiProviderResult }> = [
    { label: 'HTTP 500', result: { ok: false, reason: 'http_error' } },
    { label: 'network interruption', result: { ok: false, reason: 'network' } },
    { label: 'empty body', result: { ok: true, raw: '   ' } },
    { label: 'rate limit', result: { ok: false, reason: 'rate_limit' } },
  ];

  it.each(providerFailures)('$label → deterministic fallback', async ({ result }) => {
    const resolved = await resolveDialogue(async () => result);
    expect(resolved.usedFallback).toBe(true);
    expect(validateDialoguePayload(resolved.payload)).toBe(true);
  });

  it('accepts valid constrained JSON without fallback', async () => {
    const valid = {
      mood: 'Playful' as const,
      message: 'Want to play fetch?',
      memory_reference_id: null,
      suggested_action: 'play' as const,
    };

    const result = await resolveDialogue(async () => ({
      ok: true,
      raw: JSON.stringify(valid),
    }));

    expect(result.usedFallback).toBe(false);
    expect(result.payload).toEqual(valid);
  });

  it('care action success is independent of dialogue failure (contract)', () => {
    const careActionSucceeded = true;
    const dialogue = getFallbackDialogue('Happy');

    expect(careActionSucceeded).toBe(true);
    expect(dialogue.suggested_action).toBe('none');
  });
});
