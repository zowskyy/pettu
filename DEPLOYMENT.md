# Pet Echo — Deployment Guide

**Last updated:** Android-native strategy (2026-08-14)  
**Platform:** Android (Google Play) — primary and only launch target  
**Build system:** EAS Build (required for all verification)  
**Backend:** Supabase (hosted Postgres, Auth, Storage, Edge Functions)

---

## 1. Platform Strategy

Pet Echo deploys to **Google Play only** for v1. All slice verification that touches native capabilities (auth, billing, push, camera) runs on **EAS-built APKs/AABs** — Expo Go is not a valid verification surface.

### 1.1 Google Play release tracks

| Track | EAS profile | Purpose | Promotion |
|-------|-------------|---------|-----------|
| **Internal testing** | `preview` | Team QA, compile-gate sign-off | First staging AAB |
| **Closed testing** | `preview` | License testers, billing sandbox | After internal checklist green |
| **Production** | `production` | Public release | After closed checklist + Slice 43 gate |

**Path:** internal → closed → production. No skip.

### 1.2 EAS Build requirement

| Activity | EAS required? |
|----------|---------------|
| Compile gate (02A–02D) | Yes — dev APK |
| Auth / Google Sign-In verification | Yes — dev APK |
| Google Play Billing verification | Yes — closed-track AAB |
| FCM push verification | Yes — dev/preview APK on device |
| TypeScript / unit tests only | No — local `npm test` |
| Supabase migrations / edge functions | No — Supabase CLI |

Record each verification build ID in `PROJECT_STATE.md`.

### 1.3 Android-specific services

| Service | Purpose | Setup location |
|---------|---------|----------------|
| **FCM** | Daily care + memory push | Firebase project; `google-services.json` via EAS secret |
| **Google Play Billing** | Premium subscription | Play Console products + RTDN → `iap-webhook` |
| **Target API 34+** | Play policy compliance | `app.json` / Gradle; verified in Slice 02B |
| **Data safety form** | Play Console disclosure | Photos, email, analytics, AI processing — Slice 44 |

Full Android plan: `docs/ANDROID_PLAN.md`.

---

## 2. Environment Overview

| Environment | Supabase project | EAS profile | Distribution |
|-------------|------------------|-------------|--------------|
| **development** | `pet-echo-dev` | `development` | EAS dev APK (direct install) |
| **staging** | `pet-echo-staging` | `preview` | Google Play internal → closed |
| **production** | `pet-echo-prod` | `production` | Google Play production |

**Hard rule:** Never develop or run migrations against production. Promote schema dev → staging → prod.

---

## 3. Environment Variables

### 3.1 Client (Expo — safe to bundle)

Set per environment in EAS secrets or `.env.{development,staging,production}`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://{project-ref}.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...   # anon key
EXPO_PUBLIC_APP_ENV=development|staging|production
SENTRY_DSN=https://...@sentry.io/...
POSTHOG_KEY=phc_...
```

### 3.2 Server-only (Supabase Edge Function secrets)

Configure via Supabase Dashboard → Project Settings → Edge Functions → Secrets:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJ...
AI_PROVIDER_KEY=sk-...
AI_PROVIDER=openai
STRIPE_SECRET_KEY=sk_live_...        # production only
STRIPE_WEBHOOK_SECRET=whsec_...
APPLE_SHARED_SECRET=...               # iOS post-launch only
GOOGLE_SERVICE_ACCOUNT_JSON={...}     # Play RTDN + eas submit
FCM_SERVICE_ACCOUNT_JSON={...}        # Push sender (edge function)
```

### 3.3 Secret hygiene

- Never prefix server secrets with `EXPO_PUBLIC_`
- Never commit `.env` files with real secrets
- Slice 03 gate: `grep -r "service_role\|sk_live\|sk_test" dist/` on client bundle before release

---

## 4. Repository Setup (Slice 02)

```bash
# Scaffold (Slice 02)
npx create-expo-app@latest pet-echo --template tabs
cd pet-echo
npx expo install expo-router zustand @tanstack/react-query @supabase/supabase-js
```

Directory structure per `ARCHITECTURE.md`.

---

## 5. Supabase Deployment

### 5.1 Project provisioning

1. Create three Supabase projects (dev, staging, prod) in separate organizations or clearly named.
2. Enable Auth providers: **Google**, **Email (OTP)**. Apple deferred (iOS post-launch).
3. Configure redirect URLs for each environment:
   - Dev: `exp://localhost:8081`, custom scheme `petecho://`
   - Staging/Prod: `petecho://auth/callback`

### 5.2 Local development

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize (Slice 02)
supabase init

# Start local stack
supabase start

# Apply migrations (Slice 07+)
supabase db push

# Serve edge functions locally
supabase functions serve --env-file .env.local
```

### 5.3 Migrations workflow

```bash
# Create migration
supabase migration new create_companions_table

# Test locally
supabase db reset          # fresh DB + migrations + seed

# Deploy to remote
supabase link --project-ref {staging-ref}
supabase db push

# Verify on staging before prod
supabase link --project-ref {prod-ref}
supabase db push
```

**Order:** dev (local) → staging → production  
**Rollback:** Maintain down migrations; test rollback on staging before prod deploy.

### 5.4 Edge functions deployment

```bash
# Deploy single function
supabase functions deploy care-action --project-ref {ref}

# Deploy all
supabase functions deploy --project-ref {ref}
```

Functions and secrets are per Supabase project — deploy to all three environments.

### 5.5 Storage buckets

Create via migration or dashboard (Slice 08):

| Bucket | Public | Policies |
|--------|--------|----------|
| `pet-training-photos` | No | Member read/write |
| `pet-memory-photos` | No | Member read/write |
| `generated-companions` | No | Member read |
| `generated-recaps` | No | Member read |
| `exports` | No | Owner read |

### 5.6 Auth configuration (Android v1)

- Email OTP templates customized
- Google: OAuth Android client ID with EAS keystore SHA-1 fingerprint
- Google Sign-In primary; email OTP fallback — no Apple provider on Android
- JWT expiry: default Supabase settings; refresh enabled

---

## 6. EAS Build & Submit (Android)

### 6.1 Initial setup

```bash
npm install -g eas-cli
eas login
eas build:configure
eas credentials --platform android   # keystore + SHA-1 for Google OAuth
```

Register the EAS keystore **SHA-1** in Google Cloud Console for the Android OAuth client.

### 6.2 `eas.json` profiles (planned)

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "env": { "EXPO_PUBLIC_APP_ENV": "development" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "app-bundle" },
      "env": { "EXPO_PUBLIC_APP_ENV": "staging" }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" },
      "env": { "EXPO_PUBLIC_APP_ENV": "production" }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

### 6.3 Build commands

```bash
# Compile gate + daily native testing (APK, direct install)
eas build --profile development --platform android

# Staging → Play internal track
eas build --profile preview --platform android
eas submit --platform android --profile production --track internal

# Promote closed → production via Play Console or:
eas submit --platform android --profile production --track production

# Production release (Slice 44)
eas build --profile production --platform android
eas submit --platform android --profile production --track production
```

### 6.4 Android SDK compliance

- `targetSdkVersion` ≥ **34** (Play policy)
- `compileSdkVersion` ≥ **34**
- Verified in compile gate Slice 02B (`npx expo prebuild --platform android`)

### 6.5 OTA updates (optional, post-launch)

```bash
eas update --branch production --message "Bug fix"
```

Use only for JS-only changes; native module changes require new EAS build.

---

## 7. CI/CD Pipeline (planned)

```yaml
# .github/workflows/deploy-staging.yml
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:unit
      - run: npm run test:integration

  deploy-supabase-staging:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: supabase link --project-ref $STAGING_REF
      - run: supabase db push
      - run: supabase functions deploy

  build-staging-android:
    needs: deploy-supabase-staging
    runs-on: ubuntu-latest
    steps:
      - run: eas build --profile preview --platform android --non-interactive
```

Production deploys: manual approval gate (Slice 43).

---

## 8. Webhook Endpoints (production URLs)

Configure in Google Play (RTDN) and Stripe (if web billing added post-launch):

```
https://{prod-ref}.supabase.co/functions/v1/iap-webhook
https://{prod-ref}.supabase.co/functions/v1/stripe-webhook
```

Staging uses staging project URLs with sandbox/test credentials.

---

## 9. Monitoring & Alerts

| Service | Setup | Alerts |
|---------|-------|--------|
| Sentry | DSN per environment in EAS secrets | Crash rate > 1% |
| PostHog | Project per environment or single with `app_env` property | Funnel drop alerts |
| Supabase | Dashboard metrics | DB CPU, connection limits |
| Uptime | Ping edge function health endpoint | 5xx rate |

---

## 10. Production Readiness Gate (Slice 43)

Before first production deploy, confirm:

```
[ ] TypeScript passes          [ ] E2E tests pass
[ ] Lint passes                [ ] RLS tests pass
[ ] Unit tests pass            [ ] Storage security verified
[ ] Integration tests pass     [ ] AI failure tests pass
[ ] Payment tests pass         [ ] Android AAB build succeeds (production profile)
[ ] Webhook replay tests pass  [ ] EAS dev APK boot verified (02D)
[ ] Deletion tests pass        [ ] Production env configured
[ ] Offline tests completed    [ ] Production secrets configured
[ ] Privacy policy ready       [ ] Analytics verified
[ ] Terms ready                [ ] Crash reporting verified
[ ] Support system ready       [ ] Play Store assets ready
[ ] FCM push verified          [ ] Data safety form submitted
[ ] Target API 34+ confirmed   [ ] Google Play Billing sandbox passed
```

---

## 11. Rollback Procedures

### 11.1 Client (Android)

- Cannot rollback installed apps — ship hotfix via EAS build or OTA (JS-only)
- Keep previous production build artifact in EAS for reference

### 11.2 Database

- Forward-fix preferred over rollback in production
- Tested down migrations available for staging
- Destructive migrations require maintenance window + backup

### 11.3 Edge functions

```bash
# Redeploy previous git tag
git checkout v1.2.3
supabase functions deploy --project-ref {prod-ref}
```

---

## 12. Google Play Submission Checklist (Slice 44)

- [ ] App icon (512×512)
- [ ] Feature graphic (1024×500)
- [ ] Phone screenshots (minimum 2)
- [ ] Short + full description
- [ ] Privacy policy URL
- [ ] Terms of service URL
- [ ] Support URL / email
- [ ] Account deletion instructions (in-app + store listing)
- [ ] Subscription disclosures (price, renewal, cancel instructions)
- [ ] **Data safety form** (photos, email, app activity, device IDs, AI processing)
- [ ] Content rating questionnaire
- [ ] **Target API 34+** confirmed in release bundle
- [ ] Google Play Billing subscription products created
- [ ] FCM configured; push tested on physical device
- [ ] Google Sign-In OAuth client with correct SHA-1

---

## 13. Current Deployment Status

| Component | Status |
|-----------|--------|
| Supabase projects | Dev linked; staging/prod templates |
| Migrations | Applied to dev |
| Edge functions | Not deployed |
| EAS project | Not configured (Slice 02A) |
| EAS dev APK | Not built (Slice 02C) |
| Play Console listing | Not created (Slice 44) |
| FCM / Firebase | Not configured |
| Google Play Billing | Not configured |

See `PROJECT_STATE.md` for live status updates each slice.

---

## 14. Domain & Branding

- App scheme: `petecho://`
- Android package: `com.petecho.app`
- Deep link callback: `petecho://auth/callback`

---

## 15. Future: iOS (post-Android launch)

Deferred until Google Play production is stable.

| Item | Notes |
|------|-------|
| App Store / TestFlight | EAS `preview` / `production` iOS profiles |
| Sign in with Apple | Required when social logins present on iOS |
| Apple IAP | App Store Connect products + `APPLE_SHARED_SECRET` |
| APNs | Push via Apple Push Notification service |
| Universal links | `app.petecho.com` |

No iOS builds, profiles, or store assets are in scope for v1.

---

## 16. Disaster Recovery

- Supabase: enable daily backups (Pro plan); test restore on staging quarterly
- Storage: companion images regenerable; user photos are critical — backup bucket replication if budget allows
- Secrets: stored in 1Password / team vault; rotation procedure documented
- Incident response: Sentry alert → triage → hotfix branch → staging verify → prod deploy
