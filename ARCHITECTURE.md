# Pet Echo — System Architecture

**Last updated:** Slice 01  
**Stack:** Expo (React Native) + Supabase + Edge Functions + external AI & payment providers

---

## 1. High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Expo Client (iOS / Android)                  │
│  Expo Router │ Zustand (UI) │ TanStack Query │ Sentry │ PostHog │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS (Supabase JS client)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Supabase Platform                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────┐ │
│  │   Auth   │  │ Postgres │  │ Storage  │  │ Edge Functions  │ │
│  │ (JWT)    │  │ + RLS    │  │ (private)│  │ (Deno)          │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┬────────┘ │
└──────────────────────────────────────────────────────┼──────────┘
                                                       │
              ┌────────────────────────────────────────┼────────────┐
              ▼                    ▼                   ▼            ▼
        AI Provider          Stripe / IAP       Push (APNs/FCM)   Cron
     (image + text)         (webhooks)         (notifications)   (jobs)
```

**Design principle:** The mobile client is a thin, authenticated viewer and command surface. All authoritative state mutations run through Postgres (with RLS) or Edge Functions that enforce business rules the client cannot bypass.

---

## 2. Client Architecture (Expo)

### 2.1 Directory structure (Slice 02)

```
app/                 # Expo Router file-based routes
components/          # Shared presentational components
features/            # Feature modules (home, memories, shop, onboarding, ...)
hooks/               # Shared React hooks
lib/                 # Supabase client, query client, utilities
services/            # API facades (ai/, payments/, notifications/)
stores/              # Zustand — UI state only (modals, selections, draft forms)
types/               # Shared TypeScript types
constants/           # Routes, enums, config keys
assets/              # Static images, fonts
tests/               # Unit, integration, E2E
supabase/
  migrations/        # SQL migrations
  functions/         # Edge function source (mirrored/deployed)
  seed/              # Dev seed data
docs/                # Supplementary docs
scripts/             # Build, verify, deploy helpers
```

### 2.2 Navigation & auth state machine

```
Unauthenticated
    → (auth)/ sign-in
Authenticated + onboarding incomplete
    → (onboarding)/ wizard
Authenticated + onboarding complete
    → (tabs)/ home | memories | shop | profile
    → companion/ detail routes
```

Deep links to protected routes while unauthenticated or onboarding-incomplete redirect to the appropriate gate (Slice 04).

### 2.3 State ownership

| Data | Source of truth | Client cache |
|------|-----------------|--------------|
| Joy, Energy, Bond, XP, Level, mood | Postgres via RPC / query | TanStack Query |
| Paw Points, inventory, entitlements | Postgres | TanStack Query |
| Memories, photos | Postgres + Storage signed URLs | TanStack Query (paginated) |
| Generation job status | `generation_jobs` table | Polling / subscription |
| Modal open, form draft, tab selection | — | Zustand |

---

## 3. Backend Architecture (Supabase)

### 3.1 PostgreSQL

- All domain tables with Row Level Security enabled.
- Complex mutations via Edge Functions or `SECURITY DEFINER` RPCs that validate companion membership and role.
- `idempotency_keys` table prevents duplicate side effects.

### 3.2 Storage (private buckets)

| Bucket | Contents |
|--------|----------|
| `pet-training-photos` | Onboarding upload originals (processed) |
| `pet-memory-photos` | Memory timeline photos |
| `generated-companions` | AI-generated companion art |
| `generated-recaps` | Monthly recap share images |
| `exports` | User data exports |

Access: authenticated user with companion membership + signed URL from edge function or storage policy. No public buckets.

### 3.3 Edge Functions (planned)

| Function | Responsibility |
|----------|----------------|
| `care-action` | Validate cooldown, apply engine, write `care_actions`, return new state |
| `process-daily-reset` | Batch or on-access period decay |
| `create-generation-job` | Enqueue companion/caption/recap generation |
| `generation-worker` | Call AI provider, update job, store artifact |
| `stripe-webhook` | Verify signature, update subscriptions & entitlements |
| `iap-webhook` | Apple/Google receipt validation |
| `invite-caregiver` | Create invitation, send email |
| `delete-companion` | Ordered cascade + storage purge |
| `delete-account` | Subscription cancel + full purge |
| `send-notification` | Respect preferences, log delivery |

---

## 4. AI Architecture

```
Screen / Feature
      │
      ▼
services/ai/  (AIProvider interface)
      │
      ├── ImageGenerationService  → providers/openai|replicate|...
      ├── DialogueService
      ├── CaptionService
      └── RecapService
      │
      ▼
Edge Function (generation-worker)
      │
      ├── Creates generation_jobs row (queued)
      ├── Calls provider with server API key
      ├── Validates output
      └── Writes ai_generations + storage artifact
```

- Client never holds `AI_PROVIDER_KEY`.
- Client calls `generateCompanion()` etc. — never provider SDK directly (Slice 16).
- Job lifecycle: `queued → processing → succeeded | failed | cancelled | expired`.

See `AI_SYSTEM.md` for validation rules and fallbacks.

---

## 5. Data Flow Diagrams

### 5.1 Care action

```
User taps "Feed"
  → Client generates idempotency key
  → POST /functions/v1/care-action { companion_id, action: "feed", idempotency_key }
  → Edge function:
       1. Verify JWT + companion_members (owner or caregiver)
       2. Check idempotency_keys (return cached if replay)
       3. Check cooldown in care_actions
       4. Run companionEngine.applyCareAction()
       5. Insert care_actions, update companions row
       6. Store idempotency response
  → Return { joy, energy, bond, xp, level, mood, paw_points_earned }
  → Client invalidates TanStack Query cache for companion
```

### 5.2 Companion creation

```
Onboarding complete
  → Upload photos → pet-training-photos (via signed upload URL)
  → POST create-generation-job { companion_id, style, traits, photo_ids, idempotency_key }
  → Job queued
  → Worker: provider image gen → generated-companions bucket
  → Update companions.generated_image_path, job status succeeded
  → Client polls/subscribes → Reveal screen
```

### 5.3 Payment / entitlement

```
User initiates IAP in client
  → StoreKit / Play Billing flow
  → Provider sends webhook to edge function
  → Verify signature + idempotency
  → Insert purchase_events, upsert subscriptions, upsert entitlements
  → Client refetches entitlements (optimistic UI may show pending)
```

### 5.4 Memory with caption

```
User saves memory
  → Insert memories row (idempotent)
  → Upload photo → pet-memory-photos
  → Optional: enqueue caption generation job
  → Worker: AI caption from photo + user note only
  → Validator: ≤180 chars, no invented facts
  → Update memories.caption or use fallback
```

---

## 6. Companion Engine (deterministic)

Located at `companionEngine/` (Slice 09):

```
careActions.ts   — Feed/Play/Groom/Rest deltas
mood.ts          — Threshold → mood enum
experience.ts    — XP → level curve
levels.ts        — Level definitions
dailyReset.ts    — 4 AM local decay
rewards.ts       — Paw Points rules
cooldowns.ts     — 4-hour action cooldown
```

**Hard rule:** No AI module imports `companionEngine`. No engine function calls AI.

---

## 7. Observability

| Tool | Client | Server | Data policy |
|------|--------|--------|-------------|
| Sentry | Crashes, nav errors, failed requests | Edge function exceptions | No photo URLs, no memory text |
| PostHog | Funnels, retention, feature usage | — | Event names + IDs only |

---

## 8. Environment Separation

| Env | Supabase project | EAS profile | Purpose |
|-----|------------------|-------------|---------|
| development | Dev project | development | Local + simulator |
| staging | Staging project | preview | QA, TestFlight / internal track |
| production | Prod project | production | App Store / Play Store |

Never develop against production. See `DEPLOYMENT.md`.

---

## 9. Security Boundaries

```
┌─────────────────────────────────────────┐
│  Trust: NONE — client is hostile        │
│  - All mutations validated server-side  │
│  - RLS on every table                   │
│  - Idempotency on writes                │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Trust: JWT — authenticated user        │
│  - companion_members determines scope   │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Trust: SERVICE ROLE — edge functions   │
│  - Webhooks, deletion, generation       │
│  - Never exposed to client              │
└─────────────────────────────────────────┘
```

See `SECURITY_MODEL.md` for RLS summary and role matrix.

---

## 10. Dependency Graph (build order)

```
CONTRACT → REPO → EXPO → SUPABASE → DB → RLS → STORAGE → AUTH
→ COMPANION ENGINE → CARE ENGINE → TIME ENGINE → ONBOARDING
→ PHOTO PIPELINE → AI JOBS → GENERATION → HOME → MOOD → DIALOGUE
→ MEMORIES → RECAPS → PAW POINTS → COSMETICS → ENTITLEMENTS
→ PAYMENTS → FAMILY CARE → NOTIFICATIONS → DELETION → ANALYTICS
→ OBSERVABILITY → SECURITY TEST → E2E → BETA → STORE → PRODUCTION
```
