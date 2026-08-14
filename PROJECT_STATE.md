# Pet Echo — Project State

**Last updated:** Slices 01–10 complete  
**Branch:** `cursor/slices-01-10-91c8`  
**Repository:** `/workspace`

---

## Current Phase

**Phase 5 — Companion Domain Engine** (Slices 09–12)

Slices 01–10 complete. Next: Slice 11 (Daily state / offline-safe time engine).

---

## Current Slice

| Field | Value |
|-------|-------|
| **Slice ID** | 11 |
| **Title** | Daily state / offline-safe time engine |
| **Status** | Not started |

---

## Completed Slices

| Slice | Title | Verification |
|-------|-------|--------------|
| 01 | Control documents | 10 docs created; state readable from this file |
| 02 | Repository & stack | Expo SDK 57, directory structure, `npx expo start` boots |
| 03 | Three environments | `.env.development/staging/production`, secret grep gate passes |
| 04 | Navigation shell | Auth state machine routes; `/companion` redirects when unauth/onboarding |
| 05 | Authentication | Apple/Google/Magic Link UI, session restore hook, logout, delete entry |
| 06 | RLS foundation | Policies on all tables; owner/caregiver helper functions |
| 07 | Schema | `00001_initial_schema.sql` — core + infra tables |
| 08 | Private storage | 5 private buckets in `00003_storage_buckets.sql` |
| 09 | Deterministic engine | `lib/companionEngine/` — 45 unit tests pass, no AI |
| 10 | Care actions | `perform_care_action` RPC with 4h cooldown + idempotency |

---

## Next Slice

| Field | Value |
|-------|-------|
| **Slice ID** | 11 |
| **Title** | Daily state / offline-safe time engine |
| **Deliverables** | Wire `processDailyReset` to backend; 5-day decay verification |

---

## Known Bugs

| Bug | Severity | Notes |
|-----|----------|-------|
| OAuth requires real Supabase project | **Resolved** | Cloud project linked; email OTP login ready |
| RLS cross-account test not run live | Medium | Policies applied; Slice 06 A/B test pending two test accounts |

---

## Known Limitations

| Limitation | Notes |
|------------|-------|
| No linked Supabase project | Migrations written but not applied to remote DB |
| Sentry/PostHog not wired | Planned Slice 33 |
| Onboarding is scaffold only | Full flow in Slice 13 |
| Care actions client not wired to RPC | Server function exists; Home UI in Slice 20 |

---

## Environment Status

| Environment | Status | Notes |
|-------------|--------|-------|
| `development` | **Live** | Project `qtpsjrqvjfhplhcvphev` — schema applied, auth ready |
| `staging` | Template only | Create separate Supabase project when ready |
| `production` | Template only | Create separate Supabase project when ready |

**Setup guide:** `docs/SUPABASE_CLOUD_SETUP.md` (Option C — Supabase Cloud)

**Commands after linking:**
```bash
npm run check-supabase-env   # verify .env.development
npx supabase link --project-ref YOUR_REF
npm run db:push              # apply migrations
```

---

## Migration Status

| Item | Status |
|------|--------|
| `00001_initial_schema.sql` | **Applied** |
| `00002_rls_enable.sql` | **Applied** |
| `00003_storage_buckets.sql` | **Applied** |
| `00004_care_actions.sql` | **Applied** |
| `00005_rls_policies.sql` | **Applied** |
| Applied to remote DB | **Yes** (via SQL Editor, verified 2026-08-14) |
| Rollback tested | Not yet |

**Live verification:** `profiles`, `companions`, `care_actions`, `generation_jobs`, `idempotency_keys` return `[]` (tables exist). `perform_care_action` RPC returns `Not authenticated` (function exists).

---

## Test Status

| Layer | Status | Notes |
|-------|--------|-------|
| Unit tests (companion engine) | **45 passing** | `npm test` |
| Expo boot | **Passing** | Web bundle succeeds |
| Secret grep | **Passing** | `npm run check-secrets` |
| Integration / RLS live | Not run | Requires Supabase project |
| E2E | Not implemented | Slice 34+ |

---

## Deployment Status

| Target | Status |
|--------|--------|
| EAS development build | Not configured |
| EAS staging build | Not configured |
| EAS production build | Not configured |
| Supabase edge functions | Not deployed |
| App Store / Play Store | Not submitted |

---

## Changelog

| Slice | Date | Summary |
|-------|------|---------|
| 01 | 2026-08-14 | Control documents |
| 02 | 2026-08-14 | Expo SDK 57 repo scaffold |
| 03 | 2026-08-14 | Environment templates + secret gate |
| 04 | 2026-08-14 | Navigation shell + auth state machine |
| 05 | 2026-08-14 | Auth screens + session bootstrap |
| 06 | 2026-08-14 | RLS policies + helper functions |
| 07 | 2026-08-14 | Full database schema migration |
| 08 | 2026-08-14 | Private storage buckets |
| 09 | 2026-08-14 | Deterministic companion engine + tests |
| 10 | 2026-08-14 | Server-side care action RPC with cooldown |
