# Pet Echo — Android-Native Plan

**Product:** Pet Echo (Pettu)  
**Platform:** Android (Google Play) — primary and only launch target  
**Stack:** Expo SDK 57 / React Native / EAS Build  
**Last updated:** 2026-08-14

---

## 1. Strategy

Pet Echo ships to Google Play first. iOS (App Store) and web clients are deferred until after a stable Android production release. All slice verification for Android-targeted work runs against **EAS-built APKs or AABs**, never Expo Go.

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Distribution | Google Play | Single store focus reduces release overhead |
| Build system | EAS Build (required) | Native modules (auth, billing, FCM) need dev client / release builds |
| Verification surface | Installed APK | Expo Go cannot exercise Google Sign-In, Play Billing, or FCM |
| Auth (Android) | Google Sign-In primary, email OTP fallback | No Sign in with Apple on Android |
| Payments | Google Play Billing | Server grants via Play RTDN / webhook |
| Push | Firebase Cloud Messaging (FCM) | Required for daily care and memory reminders on Android |

---

## 2. Compile Gate (Slices 02A–02D)

These slices gate all downstream Android work. No feature slice that touches native Android capabilities may start until **02D** is complete.

### SLICE 02A — EAS Android project configuration

**Deliverables:**
- `eas.json` with `development`, `preview`, and `production` Android profiles
- EAS project linked (`eas init` / `app.json` `extra.eas.projectId`)
- Android package name locked: `com.petecho.app`
- `EXPO_PUBLIC_APP_ENV` injected per profile

**Verify:**
```bash
eas whoami
cat eas.json | grep -A5 '"android"'
npx expo config --type public | grep android.package
```
All commands succeed; package name matches `com.petecho.app`.

---

### SLICE 02B — Android manifest & SDK compliance

**Deliverables:**
- `app.json` / `app.config.ts` Android block: `compileSdkVersion` / `targetSdkVersion` ≥ 34
- `minSdkVersion` ≥ 24 (Expo default unless docs require higher)
- Deep link scheme: `petecho://auth/callback`
- `google-services.json` placeholder path documented (real file via EAS secret, not committed)
- Permissions declared only as needed: `INTERNET`, `CAMERA`, `READ_MEDIA_IMAGES`, notifications

**Verify:**
```bash
npx expo prebuild --platform android --no-install
grep -E 'targetSdkVersion|compileSdkVersion' android/build.gradle android/app/build.gradle
```
Target SDK ≥ 34 confirmed in generated Gradle files.

---

### SLICE 02C — First EAS development APK build

**Deliverables:**
- EAS `development` profile build with `developmentClient: true`
- Build completes on EAS cloud (not local Gradle unless EAS unavailable)
- Build artifact URL recorded in `PROJECT_STATE.md`

**Verify:**
```bash
eas build --profile development --platform android --non-interactive
```
Build status `FINISHED`; `.apk` artifact downloadable from EAS dashboard.

---

### SLICE 02D — APK install & boot gate

**Deliverables:**
- APK installed on Android emulator or physical device
- App launches to auth shell (Slice 04 navigation)
- No redbox / native crash on cold start
- Document device/emulator API level used for verification

**Verify:**
```bash
# After download from EAS
adb install -r pet-echo-dev.apk
adb shell am start -n com.petecho.app/.MainActivity
adb logcat -d | grep -iE 'fatal|crash'   # must be empty for Pet Echo process
```
App renders welcome/auth screen; session bootstrap does not crash before Supabase config loads.

**Gate rule:** Slices 03+ Android verification must reference an EAS dev APK build ID, not `npx expo start` alone.

---

## 3. Build Pipeline

### 3.1 EAS profiles → Google Play tracks

| EAS profile | `EXPO_PUBLIC_APP_ENV` | Output | Google Play track |
|-------------|----------------------|--------|-------------------|
| `development` | `development` | APK (dev client) | — (direct install) |
| `preview` | `staging` | AAB | Internal testing |
| `preview` (promoted) | `staging` | AAB | Closed testing |
| `production` | `production` | AAB | Production |

**Promotion path:** internal → closed → production. Each promotion requires a green verification checklist (see §5).

### 3.2 Commands

```bash
# Dev client (compile gate + daily native testing)
eas build --profile development --platform android

# Staging → Play internal track
eas build --profile preview --platform android
eas submit --platform android --profile production --track internal

# Production release
eas build --profile production --platform android
eas submit --platform android --profile production --track production
```

### 3.3 CI integration (planned)

On merge to `main`:
1. Lint, typecheck, unit tests
2. Supabase staging deploy (migrations + edge functions)
3. `eas build --profile preview --platform android --non-interactive`
4. Manual approval before production submit (Slice 43)

---

## 4. Slice Verification Doctrine

### 4.1 What counts as verified

| Method | Allowed for | Not sufficient for |
|--------|-------------|-------------------|
| `npx expo start` + web | Logic-only unit paths, TypeScript compile | Google Sign-In, Play Billing, FCM, secure storage parity |
| Android emulator + dev APK | All Android slices | — |
| Physical device + dev/preview APK | Auth, payments, notifications, camera | — |

**Hard rule:** Any slice touching auth, payments, push notifications, camera, or secure storage is verified only on an **EAS-built APK** installed on emulator or device.

### 4.2 Per-slice Android checklist (append to slice verify block)

```
[ ] EAS dev/preview APK build ID recorded in PROJECT_STATE.md
[ ] Tested on API 34+ emulator or physical device
[ ] Cold start → kill → relaunch passes
[ ] No native module errors in logcat
```

### 4.3 Expo Go explicitly excluded

Expo Go does not ship `@react-native-google-signin/google-signin`, Play Billing libraries, or project-specific FCM configuration. Do not mark Android native slices complete based on Expo Go runs.

---

## 5. Auth (Google Play / Supabase)

### 5.1 Provider priority (Android)

1. **Google Sign-In** — primary button on welcome screen
2. **Email OTP** — fallback ("Continue with email")
3. **Apple** — not shown on Android (iOS post-launch)

### 5.2 Supabase configuration

| Item | Value |
|------|-------|
| Auth providers enabled | Google, Email |
| Android OAuth client | Google Cloud Console → Android client with SHA-1 from EAS credentials |
| Redirect URLs | `petecho://auth/callback`, Supabase callback URL |
| Deep link | `petecho://` scheme in `app.json` |

### 5.3 Implementation notes

- Use `@react-native-google-signin/google-signin` (or Expo config plugin equivalent checked against current SDK docs)
- Exchange Google ID token with Supabase `signInWithIdToken({ provider: 'google', token })`
- Session in Expo SecureStore; restore on cold launch (Slice 05)
- Email OTP via Supabase `signInWithOtp` — no magic-link deep link required on Android if using 6-digit code entry

### 5.4 Verification (Slice 05+, APK only)

```
[ ] Google Sign-In completes on dev APK
[ ] Email OTP completes on dev APK
[ ] Kill app → relaunch → session restored
[ ] Logout clears session
[ ] No Apple Sign-In button visible on Android
```

---

## 6. Payments (Google Play Billing)

### 6.1 Client

- Library: `react-native-iap` or Expo-recommended Play Billing wrapper (confirm against SDK 57 docs at implementation)
- Products created in Play Console: premium subscription SKU(s)
- Purchase flow UI in Profile / Shop (Slice 27+)

### 6.2 Server

- Edge function: `iap-webhook` validates Play Developer API notifications (RTDN)
- Entitlements written only after server verification — never from client-reported success
- Idempotency keys on webhook processing (Slice 12)

### 6.3 Play Console setup

| Step | Detail |
|------|--------|
| Merchant account | Play Console payments profile complete |
| Subscription products | Base plans, free trial if any, grace period configured |
| License testers | Added for internal/closed tracks |
| Real-time developer notifications | Pub/Sub topic → edge function URL |

### 6.4 Verification (Slice 27+, closed track APK)

```
[ ] Purchase sandbox/subscription in license tester account
[ ] Entitlement appears in backend within 60s of webhook
[ ] Replay webhook with same event ID — no duplicate grant
[ ] Cancel subscription — entitlement revoked per policy
```

---

## 7. Notifications (FCM)

### 7.1 Setup

| Component | Action |
|-----------|--------|
| Firebase project | Create; add Android app with `com.petecho.app` |
| `google-services.json` | Uploaded as EAS secret; referenced in build |
| FCM v1 | Server sends via service account (edge function) |
| Client | `expo-notifications` + FCM credentials via EAS |

### 7.2 Product rules

- Max 1 notification per day per user (care or memory reminder)
- Respect `notification_preferences` table
- Log delivery in `notification_delivery_log`

### 7.3 Verification (Slice 31+, dev/preview APK)

```
[ ] Permission prompt on Android 13+ (POST_NOTIFICATIONS)
[ ] FCM token registered to backend on login
[ ] Test push received on physical device (emulator FCM limited)
[ ] Tap notification deep-links to correct screen
[ ] Opt-out in settings suppresses delivery
```

---

## 8. Google Play Store Compliance

### 8.1 Target API

- **`targetSdkVersion` ≥ 34** at all times (Play policy)
- Re-check Expo SDK release notes on every upgrade

### 8.2 Data safety form

Declare in Play Console:

| Data type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Photos | Yes | No (AI provider processor) | Companion generation, memories |
| Email | Yes | No | Account, Family Care invites |
| App activity | Yes | No | Analytics (PostHog), crash (Sentry) |
| Device IDs | Yes | No | Push (FCM), analytics |

Link privacy policy URL (Slice 44). Account deletion must be available in-app and documented in listing.

### 8.3 Store assets (Android-only for v1)

- Feature graphic 1024×500
- Phone screenshots (minimum 2, 16:9 or 9:16)
- 512×512 icon
- Short + full description
- Content rating questionnaire
- Subscription disclosure text

---

## 9. Environment & Secrets (Android-specific)

| Secret / file | Where stored | Used by |
|---------------|--------------|---------|
| `google-services.json` | EAS secret | FCM, Google Sign-In |
| Google Play service account JSON | EAS submit + Supabase edge secret | `eas submit`, RTDN verification |
| `EXPO_PUBLIC_SUPABASE_*` | EAS env per profile | Client |
| FCM service account | Supabase edge secret | Push sender function |

Never commit service account JSON or `google-services.json` with production keys.

---

## 10. Risk Register (Android)

| Risk | Mitigation |
|------|------------|
| Verification drift (Expo Go vs APK) | Compile gate 02D; doctrine in §4 |
| Play policy rejection (target API) | 02B Gradle check; CI grep |
| Google Sign-In SHA mismatch | Register EAS keystore SHA-1 in Google Cloud |
| Billing webhook delay | Polling fallback + idempotent webhook handler |
| FCM on emulator | Require physical device for notification slice sign-off |

---

## 11. References

- `PROJECT_BLUEPRINT.md` — product scope and Android auth journey
- `DEPLOYMENT.md` — EAS profiles, Play tracks, CI
- `PROJECT_STATE.md` — live slice status and build IDs
- `PETTU_BUILD_SPEC.md` — feature slices 03–46
- `docs/SUPABASE_CLOUD_SETUP.md` — Supabase project linking
