# Pet Echo — Project Blueprint

**Product:** Pet Echo  
**Codename:** Pettu  
**Platform:** iOS & Android (Expo / React Native)  
**Last updated:** Slice 01

---

## 1. Vision

Pet Echo is an AI-powered pet companion app that lets people turn photos of their real pets into a personalized digital companion. The companion reflects the pet's personality, responds to daily care, remembers moments over time, and grows with the user through a deterministic care economy — never through opaque AI manipulation of game state.

The product promise: *"Your pet, remembered and cared for — every day."*

Pet Echo is not a chatbot, social network, or medical advisor. It is a warm, bounded companion experience grounded in the user's own photos and memories.

---

## 2. Target Users

| Segment | Need | How Pet Echo serves it |
|---------|------|------------------------|
| Pet owners (primary) | Daily emotional connection to their pet | Care loop, mood, dialogue, memories |
| Busy caregivers | Lightweight ritual without guilt | 4 care actions, daily reminders, offline-safe decay |
| Multi-household families | Shared care without shared billing risk | Family Care (owner + caregivers) |
| Premium subscribers | Deeper creation & export | Second companion, recaps, premium cosmetics |

---

## 3. Core User Journeys

### 3.1 First-time onboarding → companion reveal

```
Welcome → Sign in (Apple / Google / Email magic link)
  → Pet type → Pet identity (name, species)
  → Upload 5–10 photos (≥3 clear facial)
  → Personality traits → Favorite things → Quirk → Nickname
  → Art style (Cozy Storybook | Playful 3D | Pixel Adventure)
  → Async companion generation (job queue)
  → Reveal screen → "Start Caring"
```

**Success criteria:** User completes onboarding with a generated companion artifact stored and linked; no duplicate companion rows on retry.

### 3.2 Daily care loop

```
Open Home (authoritative backend state)
  → View companion, mood, meters (Joy / Energy / Bond / XP / Level)
  → Read AI dialogue (or deterministic fallback)
  → Perform Feed / Play / Groom / Rest (4-hour cooldown, server-enforced)
  → Earn Paw Points (server-calculated, capped)
  → Optional: add a memory from the day
```

**Success criteria:** Care action persists after app kill; cooldown cannot be bypassed from a modified client.

### 3.3 Memory timeline

```
Memories tab → Paginated timeline
  → Add memory (photo, title, date, note)
  → Optional AI caption (≤180 chars, no invented facts)
  → Favorite / share / delete
  → Monthly recap (3+ memories/month, entitlement-gated export)
```

**Success criteria:** 500+ memories load via pagination only; captions never introduce facts absent from user note/photo.

### 3.4 Shop & economy

```
Shop tab → Browse catalog (free + premium cosmetics)
  → Purchase with Paw Points or subscription entitlements
  → Equip / unequip owned items
  → Rooms and accessories render on Home
```

**Success criteria:** Equipping unowned items rejected server-side; Paw Points never client-writable.

### 3.5 Family Care

```
Owner invites caregiver by email
  → Caregiver accepts → companion_members row (role: caregiver)
  → Caregiver: view, care actions, add memories
  → Owner only: billing, delete companion, manage members, delete account
```

### 3.6 Account lifecycle

```
Profile → Subscription management / notification prefs / privacy
  → Delete companion (name confirmation, cascade cleanup)
  → Delete account (cancel subscription, purge all data, invalidate sessions)
```

---

## 4. Core Features (MVP scope)

| Feature | Description | Authority |
|---------|-------------|-----------|
| Auth | Apple, Google, email magic link; session restore | Supabase Auth |
| Companion creation | Photo pipeline + AI image generation (3 art styles) | Edge functions + job queue |
| Care engine | Feed / Play / Groom / Rest with cooldowns & meters | Deterministic server engine |
| Mood engine | 7 moods from meter thresholds | Deterministic (no AI) |
| AI dialogue | Constrained JSON responses per care context | AI provider via abstraction layer |
| Memories | Timeline, captions, favorites, monthly recap | Supabase + storage |
| Paw Points | Daily care + memory rewards, 15/day cap | Server-only |
| Cosmetics | Bandanas, coats, rooms; equip/unequip | Inventory + entitlements |
| Subscriptions | Apple/Google IAP + webhooks | Provider webhooks only |
| Family Care | Owner + caregiver roles | RLS + companion_members |
| Notifications | Daily care + memory reminders, max 1/day | Edge functions + preferences |
| Deletion | Companion & account cascade with zero orphans | Edge functions + storage purge |

### Explicitly out of scope (v1)

Voice, AR, social feed, PvP, breeding, NFTs, web client, desktop client, open-ended chat.

---

## 5. Product Principles

1. **Backend is source of truth** — Zustand holds UI state only; meters, XP, inventory, and entitlements always come from the server.
2. **AI never writes game state** — Joy, Energy, Bond, XP, Level, Paw Points, and cooldowns are deterministic engine outputs.
3. **Bounded AI** — Dialogue, captions, and recaps are validated; failures fall back to deterministic content without blocking care.
4. **Privacy by default** — All storage buckets private; signed URLs only; no pet photos or memory text in analytics.
5. **Idempotent mutations** — Care actions, purchases, generations, deletes, and invitations are replay-safe.
6. **Owner vs caregiver** — Billing and destructive actions are owner-only, enforced at RLS and API layers.

---

## 6. Success Metrics

### Launch (Beta — Slice 42)

| Metric | Target | Instrument |
|--------|--------|------------|
| Onboarding completion rate | ≥ 60% of sign-ups | PostHog funnel |
| Companion generation success rate | ≥ 90% | `generation_succeeded / generation_started` |
| D1 retention | ≥ 35% | PostHog cohort |
| D7 retention | ≥ 15% | PostHog cohort |
| Daily care completion (D1 users) | ≥ 50% | `daily_care_completed` events |
| Memory creation (W1 users) | ≥ 25% create ≥1 memory | `memory_created` |
| Crash-free sessions | ≥ 99.5% | Sentry |

### Post-launch (ongoing)

| Metric | Purpose |
|--------|---------|
| Care action latency p95 | Engine performance |
| Generation job time p95 | AI pipeline health |
| Webhook confirmation rate | Payment integrity |
| RLS violation attempts (blocked) | Security posture |
| Orphaned storage objects after delete | Deletion correctness |
| AI fallback rate | Provider reliability |

---

## 7. Monetization Model

- **Free tier:** One companion, free cosmetics catalog, basic memories, daily care.
- **Premium subscription:** Second companion, premium cosmetics, recap export, Family Care.
- **Paw Points:** Earned in-app only (not purchasable with real money in v1); spent on free-catalog cosmetics.

All entitlement grants flow from verified provider webhooks — never from client-reported purchase success.

---

## 8. Compliance & Trust

- Privacy policy and terms required before store submission (Slice 44).
- Account deletion instructions in-app and in store listings.
- No medical advice, consciousness claims, or biological suffering language in AI outputs.
- Age rating appropriate for general audiences (pet care simulation, no UGC exposure to other users).

---

## 9. Slice Roadmap Reference

This blueprint covers the full 46-slice build defined in `PETTU_BUILD_SPEC.md`. Current execution position is tracked in `PROJECT_STATE.md`.
