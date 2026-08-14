# Production Readiness Gate — Pet Echo

**Slice 43** — Do not ship to Google Play production until every item below is true. Derived from `PETTU_BUILD_SPEC.md` Slice 43.

---

## Build & code quality

- [ ] TypeScript passes (`npx tsc --noEmit`)
- [ ] Lint passes (`npm run lint`)
- [ ] Unit tests pass (`npm test`)
- [ ] Integration tests pass (Supabase-linked CI or manual matrix)
- [ ] E2E tests pass (Detox/Appium — when implemented)

---

## Security & data

- [ ] RLS tests pass — live two-account matrix (`tests/security/rls.test.ts` + manual)
- [ ] Storage security verified — private buckets, signed URLs, no public pet photos
- [ ] Idempotency replay tests pass (`tests/security/idempotency.test.ts` + live RPC)
- [ ] Webhook replay tests pass — duplicate payment events do not double-grant
- [ ] Deletion tests pass — zero orphaned rows/storage after companion/account delete
- [ ] AI failure tests pass (`tests/ai/failureSimulation.test.ts`)
- [ ] Offline tests completed — see `docs/OFFLINE_CAPABILITIES.md` Verified column
- [ ] Payment tests pass — client success without webhook does not grant entitlement

---

## Android release

- [ ] Android build succeeds — `npm run build:android:prod` → AAB
- [ ] EAS dev APK boot gate passed (Slice 02D)
- [ ] Device matrix signed off — `docs/DEVICE_MATRIX.md`
- [ ] ProGuard/R8 rules verified for release build

---

## Environment & secrets

- [ ] Production env configured — separate Supabase project
- [ ] Production secrets configured — EAS secrets, no keys in repo (`npm run check-secrets`)
- [ ] FCM / Firebase configured for production package `com.petecho.app`
- [ ] Google Play Billing linked to production package

---

## Legal, support & store

- [ ] Privacy policy ready — hosted URL
- [ ] Terms ready — hosted URL
- [ ] Support system ready — email or help center URL
- [ ] Store assets ready — icon, screenshots, feature graphic
- [ ] Analytics verified — PostHog production project, no PII/photo leakage
- [ ] Crash reporting verified — Sentry production DSN, sampling configured

---

## Deferred (post-Android v1)

- [ ] iOS build succeeds — not required for Google Play v1
- [ ] App Store submission — deferred

---

## Sign-off record

| Gate | Owner | Date | Evidence link |
|------|-------|------|---------------|
| Engineering | | | CI run / test output |
| Security (Slices 34–35 live) | | | |
| QA (Device matrix) | | | |
| Release | | | EAS build ID |

Update `PROJECT_STATE.md` when this checklist reaches 100%.
