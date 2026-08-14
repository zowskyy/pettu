# Device Matrix — Pet Echo (Android v1)

**Slice 41** — Android-only checklist for Google Play launch. iOS and web are deferred post-Android production release.

---

## Test environments

| Category | Configuration | Priority |
|----------|---------------|----------|
| Small screen | Phone ≤ 5.4" (e.g. 720×1280, API 34) | P0 |
| Large screen | Phone ≥ 6.5" or tablet (sw600dp+) | P0 |
| Slow network | 3G throttling (Chrome DevTools / adb network) | P0 |
| Fast network | Wi‑Fi / 5G | P1 |
| Offline | Airplane mode | P0 |
| Background / resume | Home → background 5 min → resume | P0 |
| Fresh install | Clean install dev/preview APK | P0 |
| Upgrade install | Previous preview → new preview | P1 |

---

## Per-configuration checklist

Run on **EAS-built APK** (not Expo Go). Record pass/fail and build ID in `PROJECT_STATE.md`.

### Boot & auth

- [ ] Cold start completes without crash
- [ ] Google Sign-In succeeds (Android)
- [ ] Email OTP fallback succeeds
- [ ] Session restore after force-stop

### Home & care

- [ ] Companion meters load from backend
- [ ] Feed / Play / Groom / Rest RPC succeeds
- [ ] Cooldown UI accurate after action
- [ ] Font scaling 1.3× — layout does not clip care buttons

### Onboarding & generation

- [ ] Photo picker and upload progress visible
- [ ] Generation job polling survives background
- [ ] Reveal screen renders on slow network

### Memories & shop

- [ ] Timeline pagination (no full-table load)
- [ ] Memory create with photo
- [ ] Shop catalog loads; purchase blocked when unentitled

### Notifications (physical device)

- [ ] Permission deny — no crash, no retry loop
- [ ] Permission grant — at most 1 daily reminder

### Offline (see `docs/OFFLINE_CAPABILITIES.md`)

- [ ] Home shows cached state or clear offline message
- [ ] Care action fails gracefully offline
- [ ] Refetch on reconnect overrides stale UI

### Accessibility (Slice 40)

- [ ] TalkBack reads Home, Login, Onboarding labels
- [ ] Touch targets ≥ 44×44 dp on primary actions
- [ ] Reduced motion — no required parallax for core flows

---

## Sign-off

| Role | Name | Date | Build ID |
|------|------|------|----------|
| QA | | | |
| Engineering | | | |

---

## Deferred (not in Android v1 matrix)

- iPhone small/large screen
- iPad layout
- Web client browsers
