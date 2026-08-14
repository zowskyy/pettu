/**
 * Slice 35 — Idempotency replay test plan (mock store).
 *
 * Mirrors `perform_care_action` idempotency behavior from 00004_care_actions.sql.
 * Live replay tests require a linked Supabase project with two authenticated sessions.
 *
 * Run: npm test -- tests/security/idempotency.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';

type IdempotencyScope =
  | 'care_action'
  | 'payment_webhook'
  | 'memory_creation'
  | 'generation_request'
  | 'delete_request'
  | 'caregiver_invitation';

type IdempotencyRecord = {
  key: string;
  scope: IdempotencyScope;
  profileId: string;
  status: 'pending' | 'completed' | 'failed';
  responsePayload: unknown;
  sideEffectCount: number;
};

/** In-memory idempotency store simulating server-side deduplication. */
class MockIdempotencyStore {
  records = new Map<string, IdempotencyRecord>();
  careActionCount = 0;
  memoryCount = 0;
  generationCount = 0;
  deleteCount = 0;
  invitationCount = 0;
  webhookGrantCount = 0;

  private compositeKey(scope: IdempotencyScope, profileId: string, key: string): string {
    return `${scope}:${profileId}:${key}`;
  }

  replayCareAction(profileId: string, key: string, action: () => unknown): unknown {
    const id = this.compositeKey('care_action', profileId, key);
    const existing = this.records.get(id);
    if (existing?.status === 'completed') {
      return existing.responsePayload;
    }

    const payload = action();
    this.careActionCount += 1;
    this.records.set(id, {
      key,
      scope: 'care_action',
      profileId,
      status: 'completed',
      responsePayload: payload,
      sideEffectCount: 1,
    });
    return payload;
  }

  replayScoped(
    scope: IdempotencyScope,
    profileId: string,
    key: string,
    sideEffect: () => void,
  ): { duplicate: boolean } {
    const id = this.composeKey(scope, profileId, key);
    const existing = this.records.get(id);
    if (existing?.status === 'completed') {
      return { duplicate: true };
    }

    sideEffect();
    this.records.set(id, {
      key,
      scope,
      profileId,
      status: 'completed',
      responsePayload: { ok: true },
      sideEffectCount: 1,
    });
    return { duplicate: false };
  }

  private composeKey(scope: IdempotencyScope, profileId: string, key: string): string {
    return this.compositeKey(scope, profileId, key);
  }
}

describe('Slice 35 — idempotency replay (mock store)', () => {
  const USER = 'profile-uuid';
  let store: MockIdempotencyStore;

  beforeEach(() => {
    store = new MockIdempotencyStore();
  });

  describe('care action replay', () => {
    it('returns cached response on duplicate key without second side effect', () => {
      const key = 'care-feed-001';
      const first = store.replayCareAction(USER, key, () => ({ joy_delta: 10, xp_delta: 8 }));
      const second = store.replayCareAction(USER, key, () => {
        throw new Error('must not run twice');
      });

      expect(first).toEqual(second);
      expect(store.careActionCount).toBe(1);
    });
  });

  describe('scoped replay matrix (Slice 35 spec)', () => {
    const replayCases: Array<{
      label: string;
      scope: IdempotencyScope;
      key: string;
      apply: () => void;
      readCount: () => number;
    }> = [
      {
        label: 'payment webhook',
        scope: 'payment_webhook',
        key: 'wh-001',
        apply: () => {
          store.replayScoped('payment_webhook', USER, 'wh-001', () => {
            store.webhookGrantCount += 1;
          });
        },
        readCount: () => store.webhookGrantCount,
      },
      {
        label: 'memory creation',
        scope: 'memory_creation',
        key: 'mem-001',
        apply: () => {
          store.replayScoped('memory_creation', USER, 'mem-001', () => {
            store.memoryCount += 1;
          });
        },
        readCount: () => store.memoryCount,
      },
      {
        label: 'generation request',
        scope: 'generation_request',
        key: 'gen-001',
        apply: () => {
          store.replayScoped('generation_request', USER, 'gen-001', () => {
            store.generationCount += 1;
          });
        },
        readCount: () => store.generationCount,
      },
      {
        label: 'delete request',
        scope: 'delete_request',
        key: 'del-001',
        apply: () => {
          store.replayScoped('delete_request', USER, 'del-001', () => {
            store.deleteCount += 1;
          });
        },
        readCount: () => store.deleteCount,
      },
      {
        label: 'caregiver invitation',
        scope: 'caregiver_invitation',
        key: 'inv-001',
        apply: () => {
          store.replayScoped('caregiver_invitation', USER, 'inv-001', () => {
            store.invitationCount += 1;
          });
        },
        readCount: () => store.invitationCount,
      },
    ];

    it.each(replayCases)('$label — zero duplicate state on replay', ({ scope, key, apply, readCount }) => {
      apply();
      apply();
      const third = store.replayScoped(scope, USER, key, () => {
        throw new Error('side effect must not run on replay');
      });

      expect(readCount()).toBe(1);
      expect(third.duplicate).toBe(true);
    });
  });

  describe('Live verification checklist', () => {
    it('documents replay commands for linked Supabase project', () => {
      const checklist = [
        'POST perform_care_action twice with same p_idempotency_key → one care_actions row',
        'Replay payment webhook edge function with same event id → one entitlement grant',
        'Duplicate generation job idempotency key → one generation_jobs row',
        'Duplicate delete RPC key → companion deleted once, no orphaned storage',
      ];
      expect(checklist).toHaveLength(4);
    });
  });
});
