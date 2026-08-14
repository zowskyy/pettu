# Pet Echo — Test Plan

**Last updated:** Slice 01  
**Frameworks (planned):** Jest (unit), Supabase test harness (integration), Maestro or Detox (E2E)  
**Rule:** A slice is not complete until its verification criteria from `PETTU_BUILD_SPEC.md` pass with executed evidence.

---

## 1. Test Pyramid

```
        ┌─────────┐
        │   E2E   │  Critical user journeys, security matrix
        ├─────────┤
        │ Integr. │  API + RLS + edge functions + storage
        ├─────────┤
        │  Unit   │  Engine, validators, pure logic
        └─────────┘
```

| Layer | Target coverage focus | When introduced |
|-------|----------------------|---------------|
| Unit | `companionEngine/`, AI validators, utils | Slice 09+ |
| Integration | Supabase RLS, edge functions, webhooks | Slice 06+ |
| E2E | Onboarding, care loop, payments | Slice 34+ |
| Security | Cross-account, idempotency, caregiver bounds | Slices 06, 34, 35 |
| Performance | Latency baselines | Slice 39 |

---

## 2. Environments for Testing

| Env | Purpose |
|-----|---------|
| Local + Supabase CLI | Unit + integration during development |
| Staging | E2E, payment sandbox, AI provider staging keys |
| Production | Smoke tests only post-release; no destructive tests |

Test accounts: minimum two (`user_a`, `user_b`) plus one caregiver account linked to A's companion.

---

## 3. Slice-by-Slice Test Matrix

### Phase 1 — Foundation (Slices 01–03)

| Slice | Verification | Type |
|-------|--------------|------|
| 01 | All 10 control docs exist; `PROJECT_STATE.md` summarizes correctly | Manual / doc |
| 02 | `npx expo start` zero errors | Smoke |
| 03 | Grep client bundle for server secrets — none found | Security |

### Phase 2 — Auth & RLS (Slices 04–06)

| Slice | Tests |
|-------|-------|
| 04 | Deep-link `/companion` unauthenticated → redirect; onboarding-incomplete → redirect |
| 05 | Sign in each provider; kill app → relaunch → session restored; profile row created |
| 06 | **RLS:** A cannot CRUD B's data via direct REST; automated script with two JWTs |

### Phase 3 — Database & Storage (Slices 07–08)

| Slice | Tests |
|-------|-------|
| 07 | Migrations forward on fresh DB; rollback clean |
| 08 | Unauthenticated storage URL fetch → 403/401 |

### Phase 4 — Companion Engine (Slices 09–12)

| Slice | Tests |
|-------|-------|
| 09 | Unit: every care action delta, mood threshold, XP level-up — **no AI in test path** |
| 10 | Integration: replay care action within cooldown → 429; modified client cannot bypass |
| 11 | Unit: 5 missed daily periods → exact decay values; bond unchanged; mins enforced |
| 12 | Integration: replay each idempotent operation → identical response, no duplicate state |

### Phase 5 — Onboarding & Photos (Slices 13–15)

| Slice | Tests |
|-------|-------|
| 13 | E2E: block advance with 4 photos; block with 2 facial photos |
| 14 | Unit/integration: corrupt file, oversized file, duplicate → handled without crash |
| 15 | Integration: stored file has no EXIF/GPS metadata |

### Phase 6 — AI Layer (Slices 16–24)

| Slice | Tests |
|-------|-------|
| 16 | Unit: mock provider swap; screens import only `services/ai/*` |
| 17 | Integration: kill network mid-job → terminal `failed`/`expired`, not stuck |
| 18 | Integration: one successful generation per art style; artifact + record linked |
| 19 | E2E: force provider failure → retry without duplicate companion |
| 20 | E2E: mutate Zustand in devtools → next fetch restores backend state |
| 21 | Unit: force each meter combo → correct mood enum |
| 22 | Unit: malformed/oversized/unsafe AI output → rejected; fallback; care succeeds |
| 23 | Integration: 500+ memories → paginated requests only (network log) |
| 24 | Unit: caption from ambiguous photo does not invent facts |

### Phase 7 — Economy & Family (Slices 25–29)

| Slice | Tests |
|-------|-------|
| 25 | Integration: client sends `paw_points: 1000` → rejected; server value used |
| 26 | Integration: equip unowned item → rejected |
| 27 | Integration: revoke entitlement → next server call fails despite client cache |
| 28 | Integration: client claims purchase success, no webhook → no entitlement |
| 29 | Integration: caregiver delete companion / billing → 403 |

### Phase 8 — Notifications & Deletion (Slices 30–32)

| Slice | Tests |
|-------|-------|
| 30 | E2E: deny notification permission → zero sends, no crash loop |
| 31 | Manual: profile screens navigable; settings persist |
| 32 | Integration: post-delete DB + storage queries → zero orphans |

### Phase 9 — Observability (Slice 33)

| Slice | Tests |
|-------|-------|
| 33 | Grep Sentry/PostHog payloads → no photo URLs or memory text |

### Phase 10 — Hardening (Slices 34–39)

| Slice | Tests |
|-------|-------|
| 34 | **Full cross-account security matrix** (automated) |
| 35 | **Idempotency replay matrix** (all operation types) |
| 36 | **AI failure simulation** (9 failure modes) |
| 37 | **Offline matrix** (document actual capabilities) |
| 38 | **Persistence gate** (kill app after each state change) |
| 39 | Performance benchmarks recorded |

### Phase 11 — Launch (Slices 40–44)

| Slice | Tests |
|-------|-------|
| 40 | Accessibility: VoiceOver/TalkBack, font scaling, contrast |
| 41 | Device matrix: small/large phones, slow network, background/resume |
| 42 | Beta metrics collection (not pass/fail gates) |
| 43 | Production readiness checklist — all boxes true |
| 44 | Store submission assets complete |

---

## 4. Unit Test Specifications

### 4.1 `companionEngine/` (Slice 09)

```
careActions.test.ts
  - feed: joy +10, energy +5, bond +5, xp +8
  - play: joy +15, energy -10, bond +8, xp +10
  - groom: joy +8, bond +3, xp +6
  - rest: energy +15, bond +4, xp +6
  - meters clamp 0–100

mood.test.ts
  - each threshold boundary → correct mood

dailyReset.test.ts
  - 5 periods missed → joy -40 (capped at min 25), energy -25 (min 25)
  - bond unchanged

cooldowns.test.ts
  - action within 4h → blocked
```

### 4.2 AI validators (Slice 22)

```
dialogueValidator.test.ts
  - valid JSON passes
  - invalid JSON → reject
  - >160 chars → reject
  - >2 sentences → reject
  - medical advice string → reject
  - consciousness claim → reject
  - invalid mood enum → reject
```

### 4.3 Paw Points (Slice 25)

```
rewards.test.ts
  - daily care complete → 10 points
  - memory created → 5 points
  - daily max 15 enforced
```

---

## 5. Integration Test Specifications

### 5.1 RLS cross-account (Slice 06, 34)

Script: `tests/security/cross-account.test.ts`

For each table with user data:
1. Authenticate as User A, create resource
2. Authenticate as User B, attempt SELECT / INSERT / UPDATE / DELETE
3. Assert 403 or empty result for all B→A attempts

Tables: `companions`, `companion_photos`, `memories`, `care_actions`, `inventory_items`, `subscriptions`, `entitlements`, `generation_jobs`

### 5.2 Idempotency replay (Slice 35)

For each operation type:
1. Send request with `Idempotency-Key: test-key-1`
2. Record state (XP, points, row counts)
3. Replay identical request
4. Assert: same response body, zero state delta

### 5.3 Webhook processing (Slice 28)

1. Send valid webhook with event ID `evt_1` → entitlement granted
2. Replay `evt_1` → no duplicate entitlement
3. Send client-only "purchase success" API → no entitlement

---

## 6. E2E Test Scenarios

### 6.1 Happy path onboarding → first care

```
1. Launch app → Welcome
2. Sign in (test account)
3. Complete onboarding with 5 photos (3 facial)
4. Wait for generation job (poll)
5. Reveal → Start Caring
6. Perform Feed
7. Verify meters updated on screen
8. Kill app → relaunch → meters persisted
```

### 6.2 Memory timeline pagination

```
1. Seed 500 memories (staging script)
2. Open Memories tab
3. Assert network: no single request returns >20 rows
4. Scroll to load more → additional paginated requests
```

### 6.3 Caregiver boundary

```
1. Owner invites caregiver
2. Caregiver accepts
3. Caregiver performs Play → success
4. Caregiver attempts Delete Companion → blocked in UI and API
```

---

## 7. Security Test Checklist

- [ ] JWT tampering (modified `sub`) → rejected
- [ ] Expired JWT → 401
- [ ] Direct REST with another user's resource ID → empty/403
- [ ] Storage public URL → inaccessible
- [ ] Service role key absent from client bundle
- [ ] SQL injection in text fields → parameterized queries hold
- [ ] Caregiver cannot escalate to owner role via PATCH

---

## 8. AI Failure Test Matrix (Slice 36)

| # | Simulated failure | Expected behavior |
|---|-------------------|-------------------|
| 1 | Provider timeout | Fallback dialogue; job → failed |
| 2 | HTTP 500 | Retry then failed; fallback |
| 3 | Invalid JSON | Fallback dialogue |
| 4 | Empty response | Fallback |
| 5 | Overlong response (>160) | Rejected → fallback |
| 6 | Unsafe content (medical) | Rejected → fallback |
| 7 | Rate limit 429 | Backoff; fallback for sync |
| 8 | Network interrupt mid-job | Job terminal state within TTL |
| 9 | Wrong mood enum | Rejected → fallback |

**Pass:** App functional in all 9 cases; care action unaffected.

---

## 9. Persistence Gate (Slice 38)

For each state type, execute: **action → kill app → restart → fetch backend → assert match**

| State | Action to test |
|-------|----------------|
| XP / level | Care action |
| Meters | Care action + daily reset |
| Paw Points | Daily care + memory |
| Inventory | Purchase + equip |
| Memories | Create memory |
| Subscription | Webhook grant |
| Caregiver membership | Accept invite |

---

## 10. Performance Baselines (Slice 39)

Record p50 / p95 on reference device:

| Metric | Target (initial) |
|--------|------------------|
| Cold launch | < 3s |
| Home load | < 1.5s |
| Care action round-trip | < 800ms |
| Memory page (20 items) | < 1s |
| Photo upload (5MB) | < 10s on 4G |
| Dialogue generation | < 3s (or fallback at 8s) |
| Companion generation | < 120s (async, non-blocking) |

Optimize only after measurement.

---

## 11. CI Pipeline (planned)

```yaml
# .github/workflows/test.yml (Slice 02+)
jobs:
  lint:       # eslint + tsc
  unit:       # jest companionEngine, validators
  integration: # supabase start + migration + RLS tests
  e2e:        # staging only, on release branch
```

**Gate:** No merge to main with failing unit or integration tests.

---

## 12. Test Data & Seeding

`supabase/seed/` provides:
- Two test users with known credentials (dev/staging only)
- One companion per user with ready status
- Sample memories for pagination tests
- Never seed production

---

## 13. Current Test Status

See `PROJECT_STATE.md` — no tests implemented until Slice 02+.
