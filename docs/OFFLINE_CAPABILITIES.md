# Offline Capabilities — Pet Echo

**Slice 37** — Documented offline behavior. Only capabilities listed as **Verified** have been exercised on device; others reflect intended design pending EAS APK manual QA.

---

## Summary

Pet Echo is **online-first**. The companion engine runs deterministically on the client for UI previews, but **authoritative state** (XP, meters, Paw Points, inventory, memories, subscriptions) lives in Supabase and requires network for writes.

| Area | Offline read (cached) | Offline write | Verified |
|------|----------------------|---------------|----------|
| Auth session restore | Partial — SecureStore token if previously logged in | No new login | Pending APK |
| Home / companion state | Last fetched snapshot in React Query cache | No care actions persisted | Pending APK |
| Care actions (Feed/Play/Groom/Rest) | Show last-known meters | Queued **not implemented** — action fails gracefully | Pending APK |
| Onboarding photo upload | No | Fails with user-visible error | Pending APK |
| Memory timeline | Cached page if previously loaded | No create/edit/delete | Pending APK |
| Shop / billing | No | No | N/A |
| Push notifications | N/A | N/A | N/A |

---

## Scenarios (Slice 37 test matrix)

### 1. Launch offline (cold start)

- **Expected:** Splash → auth shell if valid session in SecureStore; otherwise login screen with connectivity message on auth attempts.
- **Verified:** Not yet — requires EAS dev APK + airplane mode.

### 2. Open Home offline

- **Expected:** Display cached companion snapshot from React Query if available; show offline banner; disable care buttons or show retry on RPC failure.
- **Verified:** Not yet.

### 3. Care action offline

- **Expected:** Optimistic UI optional; RPC fails → revert meters; show "You're offline" toast; **no duplicate local state** written to Zustand as source of truth.
- **Verified:** Not yet.

### 4. Connection lost mid-action

- **Expected:** In-flight `perform_care_action` RPC errors; idempotency key prevents double-apply on retry when network returns.
- **Verified:** Unit-tested idempotency mock (`tests/security/idempotency.test.ts`); live RPC pending.

### 5. Connection lost mid-upload

- **Expected:** Upload aborts; no partial companion photo row without storage object; user can retry from onboarding/upload screen.
- **Verified:** Not yet.

### 6. App killed mid-upload

- **Expected:** No orphaned storage without DB row (server-side job cleanup); user resumes upload flow on next launch.
- **Verified:** Not yet.

### 7. Connection restored

- **Expected:** React Query refetches companion state; Home overrides any stale Zustand UI cache; pending actions **not** auto-replayed unless explicit queue is added (out of v1 scope).
- **Verified:** Not yet.

---

## What we do **not** claim

- Full offline care with later sync (no outbox queue in v1).
- Offline memory creation or AI dialogue generation.
- Offline shop purchases or subscription changes.

---

## Implementation hooks

| Component | Path | Offline note |
|-----------|------|--------------|
| Supabase client | `src/lib/supabase.ts` | Network errors surface to UI |
| Companion fetch | `src/services/companionService.ts` | Returns null on error |
| React Query | app providers | `networkMode: 'online'` default |
| Engine (local) | `lib/companionEngine/` | Deterministic preview only — not authoritative |

---

## Verification commands

```bash
# Document + unit coverage for offline-adjacent logic
npm test -- tests/security/idempotency.test.ts

# Manual (EAS dev APK required)
# 1. Enable airplane mode
# 2. Cold start → Home → attempt care action
# 3. Disable airplane mode → confirm refetch overrides UI
```

Update this doc with **Verified** checkmarks after Slice 37 manual QA on API 34+ emulator or device.
