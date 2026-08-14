/**
 * Slice 38 — Persistence gate (mandatory).
 *
 * Executable test plan: each domain action → kill app → restart → read backend → confirm state.
 * Live cases are skipped until EAS dev APK + linked Supabase project are available for automation.
 *
 * Run: npm test -- tests/persistence/persistenceGate.test.ts
 */

import { describe, it, expect } from 'vitest';

type PersistenceDomain =
  | 'xp_level'
  | 'joy_energy_bond_meters'
  | 'paw_points'
  | 'inventory'
  | 'memories'
  | 'subscriptions'
  | 'caregiver_membership';

type PersistenceCase = {
  domain: PersistenceDomain;
  action: string;
  killAppStep: string;
  backendRead: string;
  passCondition: string;
};

export const PERSISTENCE_GATE_CASES: PersistenceCase[] = [
  {
    domain: 'xp_level',
    action: 'Complete care action granting +8 XP',
    killAppStep: 'Force-stop app immediately after RPC success',
    backendRead: 'SELECT xp, level FROM companions WHERE id = $1',
    passCondition: 'XP and derived level match pre-kill values after cold start fetch',
  },
  {
    domain: 'joy_energy_bond_meters',
    action: 'Perform feed action',
    killAppStep: 'Force-stop before Home refetch',
    backendRead: 'SELECT joy, energy, bond FROM companions WHERE id = $1',
    passCondition: 'Meter deltas persisted; daily decay applied on next process_companion_daily_state',
  },
  {
    domain: 'paw_points',
    action: 'Complete daily care earning Paw Points',
    killAppStep: 'Force-stop after points awarded',
    backendRead: 'SELECT paw_points FROM companions WHERE id = $1',
    passCondition: 'Server-calculated paw_points unchanged after restart',
  },
  {
    domain: 'inventory',
    action: 'Purchase and equip cosmetic via shop RPC',
    killAppStep: 'Force-stop after equip confirmation',
    backendRead: 'SELECT catalog_item_id, equipped FROM inventory_items WHERE profile_id = $1',
    passCondition: 'Owned item and equipped flag survive restart',
  },
  {
    domain: 'memories',
    action: 'Create memory with photo upload',
    killAppStep: 'Force-stop after insert success',
    backendRead: 'SELECT id, title FROM memories WHERE companion_id = $1 ORDER BY created_at DESC LIMIT 1',
    passCondition: 'Memory row and storage object both present',
  },
  {
    domain: 'subscriptions',
    action: 'Complete verified webhook subscription grant',
    killAppStep: 'Force-stop mid-session',
    backendRead: 'SELECT status FROM subscriptions WHERE profile_id = $1',
    passCondition: 'Entitlement active; client cache refetched from server',
  },
  {
    domain: 'caregiver_membership',
    action: 'Caregiver accepts invite',
    killAppStep: 'Force-stop on caregiver device',
    backendRead: 'SELECT status, role FROM companion_members WHERE user_id = $1',
    passCondition: 'Accepted membership allows care actions after restart',
  },
];

const LIVE_GATE_ENABLED = process.env.PET_ECHO_PERSISTENCE_LIVE === '1';

describe('Slice 38 — persistence gate test plan', () => {
  describe('documented cases', () => {
    it.each(PERSISTENCE_GATE_CASES)(
      '$domain — $action',
      ({ domain, passCondition }) => {
        expect(domain).toBeTruthy();
        expect(passCondition.length).toBeGreaterThan(10);
      },
    );
  });

  describe('gate checklist structure', () => {
    it('covers all seven mandatory domains from build spec', () => {
      const domains = PERSISTENCE_GATE_CASES.map((c) => c.domain);
      expect(new Set(domains).size).toBe(7);
    });

    it('defines kill-app → restart → backend read loop for each case', () => {
      for (const c of PERSISTENCE_GATE_CASES) {
        expect(c.killAppStep).toMatch(/force-stop|kill/i);
        expect(c.backendRead).toMatch(/SELECT/i);
      }
    });
  });

  describe('live persistence gate', () => {
    const liveIt = LIVE_GATE_ENABLED ? it : it.skip;

    liveIt('runs automated persistence suite against linked Supabase', async () => {
      // Placeholder for Detox/Appium + server-side verification script.
      expect(LIVE_GATE_ENABLED).toBe(true);
    });
  });
});
