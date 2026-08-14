# Pet Echo — Deployment Guide

**Last updated:** Slice 01  
**Platforms:** iOS (App Store), Android (Google Play)  
**Build system:** EAS Build (Expo Application Services)  
**Backend:** Supabase (hosted Postgres, Auth, Storage, Edge Functions)

---

## 1. Environment Overview

| Environment | Supabase project | EAS profile | Distribution |
|-------------|------------------|-------------|--------------|
| **development** | `pet-echo-dev` | `development` | Local simulators, dev client |
| **staging** | `pet-echo-staging` | `preview` | TestFlight, Google Play internal track |
| **production** | `pet-echo-prod` | `production` | App Store, Google Play production |

**Hard rule:** Never develop or run migrations against production. Promote schema dev → staging → prod.

---

## 2. Environment Variables

### 2.1 Client (Expo — safe to bundle)

Set per environment in EAS secrets or `.env.{development,staging,production}`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://{project-ref}.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...   # anon key
EXPO_PUBLIC_APP_ENV=development|staging|production
SENTRY_DSN=https://...@sentry.io/...
POSTHOG_KEY=phc_...
```

### 2.2 Server-only (Supabase Edge Function secrets)

Configure via Supabase Dashboard → Project Settings → Edge Functions → Secrets:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJ...
AI_PROVIDER_KEY=sk-...
AI_PROVIDER=openai
STRIPE_SECRET_KEY=sk_live_...        # production only
STRIPE_WEBHOOK_SECRET=whsec_...
APPLE_SHARED_SECRET=...
GOOGLE_SERVICE_ACCOUNT_JSON={...}
```

### 2.3 Secret hygiene

- Never prefix server secrets with `EXPO_PUBLIC_`
- Never commit `.env` files with real secrets
- Slice 03 gate: `grep -r "service_role\|sk_live\|sk_test" dist/` on client bundle before release

---

## 3. Repository Setup (Slice 02)

```bash
# Scaffold (Slice 02)
npx create-expo-app@latest pet-echo --template tabs
cd pet-echo
npx expo install expo-router zustand @tanstack/react-query @supabase/supabase-js
```

Directory structure per `ARCHITECTURE.md`.

---

## 4. Supabase Deployment

### 4.1 Project provisioning

1. Create three Supabase projects (dev, staging, prod) in separate organizations or clearly named.
2. Enable Auth providers: Apple, Google, Email (magic link).
3. Configure redirect URLs for each environment:
   - Dev: `exp://localhost:8081`, custom scheme `petecho://`
   - Staging/Prod: `petecho://auth/callback`

### 4.2 Local development

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

### 4.3 Migrations workflow

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

### 4.4 Edge functions deployment

```bash
# Deploy single function
supabase functions deploy care-action --project-ref {ref}

# Deploy all
supabase functions deploy --project-ref {ref}
```

Functions and secrets are per Supabase project — deploy to all three environments.

### 4.5 Storage buckets

Create via migration or dashboard (Slice 08):

| Bucket | Public | Policies |
|--------|--------|----------|
| `pet-training-photos` | No | Member read/write |
| `pet-memory-photos` | No | Member read/write |
| `generated-companions` | No | Member read |
| `generated-recaps` | No | Member read |
| `exports` | No | Owner read |

### 4.6 Auth configuration

- Email templates customized for magic link
- Apple: Services ID, key, bundle ID configured
- Google: OAuth client IDs for iOS and Android
- JWT expiry: default Supabase settings; refresh enabled

---

## 5. EAS Build & Submit

### 5.1 Initial setup

```bash
npm install -g eas-cli
eas login
eas build:configure
```

### 5.2 `eas.json` profiles (planned)

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "EXPO_PUBLIC_APP_ENV": "development" }
    },
    "preview": {
      "distribution": "internal",
      "env": { "EXPO_PUBLIC_APP_ENV": "staging" }
    },
    "production": {
      "autoIncrement": true,
      "env": { "EXPO_PUBLIC_APP_ENV": "production" }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "...", "ascAppId": "...", "appleTeamId": "..." },
      "android": { "serviceAccountKeyPath": "./google-service-account.json" }
    }
  }
}
```

### 5.3 Build commands

```bash
# Development client (simulators + physical devices)
eas build --profile development --platform ios
eas build --profile development --platform android

# Staging (TestFlight / internal track)
eas build --profile preview --platform all

# Production (Slice 44)
eas build --profile production --platform all
```

### 5.4 Submit to stores

```bash
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

### 5.5 OTA updates (optional, post-launch)

```bash
eas update --branch production --message "Bug fix"
```

Use only for JS-only changes; native module changes require new EAS build.

---

## 6. CI/CD Pipeline (planned)

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

  build-staging:
    needs: deploy-supabase-staging
    runs-on: ubuntu-latest
    steps:
      - run: eas build --profile preview --platform all --non-interactive
```

Production deploys: manual approval gate (Slice 43).

---

## 7. Webhook Endpoints (production URLs)

Configure in Stripe / Apple / Google dashboards:

```
https://{prod-ref}.supabase.co/functions/v1/stripe-webhook
https://{prod-ref}.supabase.co/functions/v1/iap-webhook
```

Staging uses staging project URLs with sandbox/test credentials.

---

## 8. Monitoring & Alerts

| Service | Setup | Alerts |
|---------|-------|--------|
| Sentry | DSN per environment in EAS secrets | Crash rate > 1% |
| PostHog | Project per environment or single with `app_env` property | Funnel drop alerts |
| Supabase | Dashboard metrics | DB CPU, connection limits |
| Uptime | Ping edge function health endpoint | 5xx rate |

---

## 9. Production Readiness Gate (Slice 43)

Before first production deploy, confirm:

```
[ ] TypeScript passes          [ ] E2E tests pass
[ ] Lint passes                [ ] RLS tests pass
[ ] Unit tests pass            [ ] Storage security verified
[ ] Integration tests pass     [ ] AI failure tests pass
[ ] Payment tests pass         [ ] Android build succeeds
[ ] Webhook replay tests pass  [ ] iOS build succeeds
[ ] Deletion tests pass        [ ] Production env configured
[ ] Offline tests completed    [ ] Production secrets configured
[ ] Privacy policy ready       [ ] Analytics verified
[ ] Terms ready                [ ] Crash reporting verified
[ ] Support system ready       [ ] Store assets ready
```

---

## 10. Rollback Procedures

### 10.1 Client (mobile)

- Cannot rollback installed apps — ship hotfix via EAS build or OTA (JS-only)
- Keep previous production build artifact in EAS for reference

### 10.2 Database

- Forward-fix preferred over rollback in production
- Tested down migrations available for staging
- Destructive migrations require maintenance window + backup

### 10.3 Edge functions

```bash
# Redeploy previous git tag
git checkout v1.2.3
supabase functions deploy --project-ref {prod-ref}
```

---

## 11. Store Submission Checklist (Slice 44)

- [ ] App icon (1024×1024)
- [ ] Splash screen
- [ ] Screenshots (6.7", 6.1", iPad if supported; phone + tablet Android)
- [ ] App description, keywords, subtitle
- [ ] Privacy policy URL
- [ ] Terms of service URL
- [ ] Support URL / email
- [ ] Account deletion instructions (in-app + store listing)
- [ ] Subscription disclosures (price, renewal, cancel instructions)
- [ ] Data use disclosures (photos, AI processing)
- [ ] Age rating questionnaire
- [ ] Apple Sign In configured (required if other social logins)
- [ ] Google Play data safety form
- [ ] IAP products created in App Store Connect + Play Console

---

## 12. Current Deployment Status

| Component | Status |
|-----------|--------|
| Supabase projects | Not provisioned (Slice 03) |
| Migrations | Not created (Slice 07) |
| Edge functions | Not deployed |
| EAS project | Not configured (Slice 02) |
| Store listings | Not created (Slice 44) |

See `PROJECT_STATE.md` for live status updates each slice.

---

## 13. Domain & Branding (optional)

- App scheme: `petecho://`
- Bundle ID: `com.petecho.app` (confirm before Slice 02)
- Deep link domains: `app.petecho.com` (universal links, future)

---

## 14. Disaster Recovery

- Supabase: enable daily backups (Pro plan); test restore on staging quarterly
- Storage: companion images regenerable; user photos are critical — backup bucket replication if budget allows
- Secrets: stored in 1Password / team vault; rotation procedure documented
- Incident response: Sentry alert → triage → hotfix branch → staging verify → prod deploy
