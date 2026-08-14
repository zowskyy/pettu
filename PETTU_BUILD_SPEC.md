# PET ECHO — AI AGENT BUILD SPEC
**Format:** AEF (Architect-Engineer Framework), Salami Method
**Total slices:** 46 (grouped into 12 phases)
**Rule for the agent:** never receive "build Pet Echo." Receive one slice at a time. Verify. Update `PROJECT_STATE.md`. Stop. Await the next slice.

---

## 0. Agent Operating Contract

Every slice runs this loop, no exceptions:

```
READ PROJECT_STATE.md
      ↓
PLAN THIS SLICE ONLY
      ↓
CHECK CURRENT SDK/LIBRARY DOCS (Expo, Supabase, payments, notifications, AI provider)
      ↓
IMPLEMENT
      ↓
RUN THE APP
      ↓
RUN TESTS
      ↓
INDEPENDENT AUDIT (not by the implementer)
      ↓
FIX FAILURES → RE-VERIFY
      ↓
UPDATE PROJECT_STATE.md
      ↓
COMMIT: "Slice [ID]: [Title]"
      ↓
STOP
```

A slice is **complete** only when all nine are true:
1. Compiles
2. Runs
3. Happy path works
4. Failure paths work
5. Security rules verified (not just present)
6. Persists correctly after restart
7. Tests pass
8. Implementation documented
9. `PROJECT_STATE.md` updated

No slice is marked done on "looks correct." Verification means executing the command, not reading the code.

---

## 1. Control Documents & Repository (Slices 01–02)

**SLICE 01 — Control documents**
- Create: `PROJECT_BLUEPRINT.md`, `PROJECT_STATE.md`, `PROJECT_RISK_ASSESSMENT.md`, `ARCHITECTURE.md`, `SECURITY_MODEL.md`, `DATABASE_MODEL.md`, `API_CONTRACT.md`, `AI_SYSTEM.md`, `TEST_PLAN.md`, `DEPLOYMENT.md`
- `PROJECT_STATE.md` must contain: current phase, current slice, completed slices, known bugs, known limitations, environment status, migration status, test status, deployment status, next slice
- Verify: file exists, agent can read it back and correctly summarize current state from it alone

**SLICE 02 — Repository & stack**
- Structure: `app/ components/ features/ hooks/ lib/ services/ stores/ types/ constants/ assets/ tests/ supabase/{migrations,functions,seed}/ docs/ scripts/`
- Stack: Expo (current stable SDK template — check docs, don't hardcode version), React Native, TypeScript, Expo Router, Zustand, TanStack Query, Supabase, Sentry, PostHog
- Verify: `npx expo start` boots a blank shell with zero errors

---

## 2. Environments (Slice 03)

**SLICE 03 — Three environments**
- `development`, `staging`, `production` — never develop against production
- Client env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SENTRY_DSN`, `POSTHOG_KEY`
- Server-only secrets (never in Expo public vars): `SUPABASE_SERVICE_ROLE_KEY`, `AI_PROVIDER_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Security gate: grep the client bundle for any server secret before marking done

---

## 3. App Shell & Auth (Slices 04–06)

**SLICE 04 — Navigation shell**
- Routes: `_layout.tsx, index.tsx, (auth)/, (onboarding)/, (tabs)/{home,memories,shop,profile}.tsx, companion/`
- State machine: Unauthenticated → Auth → (Authenticated, incomplete onboarding) → Onboarding → (Authenticated, complete) → Home
- Verify: attempt direct deep-link to `/companion` while unauthenticated and while onboarding-incomplete — both must redirect, not render

**SLICE 05 — Authentication**
- Apple, Google, Email magic link, session restoration, logout, account deletion entry point
- Auto-create `profiles` row on registration: `id, display_name, timezone, created_at, updated_at` — no pet data here
- Verify: kill app mid-session, relaunch, session restores without re-login

**SLICE 06 — RLS foundation**
- Every table gets explicit authorization before any UI touches it
- Rule: `user → can access companion? → owner OR authorized caregiver → allowed operation?`
- Owner: read/write/delete/billing/members. Caregiver: read/care/add memories. Unauthenticated: nothing.
- Verify: create two test accounts (A, B); confirm A cannot read/write/delete any of B's rows via direct API call, not just via UI

---

## 4. Database & Storage (Slices 07–08)

**SLICE 07 — Schema**
- Core: `profiles, companions, companion_photos, memories, care_actions, inventory_items, companion_members, subscriptions`
- Infra: `ai_generations, generation_jobs, entitlements, purchase_events, notification_preferences, notification_delivery_log, recap_records, audit_events, idempotency_keys`
- Verify: migrations run clean on a fresh database, forward and rollback

**SLICE 08 — Private storage**
- Buckets: `pet-training-photos, pet-memory-photos, generated-companions, generated-recaps, exports` — none public
- Signed URLs only
- Verify: attempt unauthenticated direct fetch of a bucket object URL — must fail

---

## 5. Companion Domain Engine (Slices 09–12)

**SLICE 09 — Deterministic engine core**
- `companionEngine/{careActions,mood,experience,levels,dailyReset,rewards,cooldowns}.ts`
- Owns: Joy, Energy, Bond, XP, Level, Paw Points, Mood, Cooldowns, Daily completion
- Hard rule: AI never writes these values directly
- Verify: unit tests cover every state transition with no AI dependency in the test path

**SLICE 10 — Care actions**
- Feed: +10 Joy / +5 Energy / +5 Bond / +8 XP
- Play: +15 Joy / -10 Energy / +8 Bond / +10 XP
- Groom: +8 Joy / +3 Bond / +6 XP
- Rest: +15 Energy / +4 Bond / +6 XP
- 4-hour cooldown enforced server-side
- Verify: replay the same action from the client twice within cooldown window — second call must be rejected server-side even if client is modified/bypassed

**SLICE 11 — Daily state / offline-safe time engine**
- 4 AM local (user's stored timezone): Joy -8, Energy -5; Joy min 25, Energy min 25; Bond never decreases
- On access: `last_processed_period → current local period → calculate missed periods → apply deterministic changes → persist`
- Verify: simulate a companion untouched for 5 days, then open app — state reflects exactly 5 periods of decay, not 1, not 0

**SLICE 12 — Idempotency**
- Idempotency key required on: care action, purchase, subscription webhook, generation request, memory creation, delete, caregiver invitation
- Verify: replay each of the above with the same key — result returned identically, no duplicate XP/currency/records

---

## 6. Onboarding & Photo Pipeline (Slices 13–15)

**SLICE 13 — Onboarding flow**
- Steps: Welcome → Auth → Pet type → Pet identity → Photos → Personality → Favorite things → Quirk → Nickname → Art style → Creation → Reveal
- Photo rule: exactly 5 required to proceed, up to 10 total, minimum 3 clear facial photos
- Verify: attempt to advance with 4 photos or 2 facial photos — blocked with clear error

**SLICE 14 — Photo validation**
- Check: file type, size, orientation, dimensions, duplicate detection, upload retry, upload cancellation
- Verify: feed a corrupt file, an oversized file, and a duplicate — all three handled without crash

**SLICE 15 — Photo processing pipeline**
- `Camera/Library → Validate → Normalize orientation → Resize/compress → Strip metadata → Private storage → Generation job`
- Original assets kept separate from generated assets
- Verify: inspect stored file — no EXIF/location metadata present

---

## 7. AI Layer (Slices 16–24)

**SLICE 16 — AI abstraction layer**
- `services/ai/{AIProvider,ImageGenerationService,DialogueService,CaptionService,RecapService}.ts` + `providers/`
- Screens call `generateCompanion() / generateDialogue() / generateCaption() / generateRecap()` — never a provider SDK directly
- Verify: swap the underlying provider in `providers/` — zero changes required in any screen

**SLICE 17 — Generation job system**
- States: `queued → processing → succeeded / failed / cancelled / expired`
- No screen blocks synchronously waiting on an image generation call
- Verify: kill network mid-generation — job transitions to `failed`, not stuck in `processing` forever (add a timeout/expiry sweep)

**SLICE 18 — Companion generation**
- Input: species, pet photos, personality, favorite things, quirk, nickname, art style
- Styles: Cozy Storybook, Playful 3D, Pixel Adventure
- Verify: one successful generation per style, artifact stored, generation record linked

**SLICE 19 — Reveal screen**
- Show generated companion, name, short intro, "Start Caring" CTA
- On failure: retry path; on provider outage: companion creation record must not be corrupted
- Verify: force a provider failure — user can retry without data loss or duplicate companion record

**SLICE 20 — Home screen (authoritative state)**
- Companion, dialogue, Feed/Play/Groom/Rest, Joy/Energy/Bond/XP/Level
- Home reads authoritative state from backend; Zustand is UI-state only, never source of truth
- Verify: modify Zustand state directly in dev tools — backend state on next fetch overrides it

**SLICE 21 — Mood engine**
- States: Thriving, Happy, Calm, Sleepy, Needs Attention, Cozy, Playful — deterministic thresholds from spec
- Maps to: animation, background, dialogue tone, suggested action
- Verify: force each meter combination via test data — correct mood returned every time

**SLICE 22 — Constrained AI dialogue**
- AI receives only: companion traits, current mood, recent action, optional memory
- Must return strict JSON: `{mood, message, memory_reference_id, suggested_action}`
- Validate: valid JSON, ≤160 chars, ≤2 sentences, allowed mood, allowed action, no medical advice, no consciousness claims, no biological suffering language
- On AI failure: deterministic fallback dialogue; care action still succeeds
- Verify: feed malformed/oversized/unsafe model output through the validator — all rejected, fallback triggers, care action unaffected

**SLICE 23 — Memories**
- Timeline, add memory (photo/title/date/note), caption, favorite, delete — paginated, not full-load
- Verify: load timeline with 500+ memories — no full-table fetch, pagination confirmed via network log

**SLICE 24 — Memory captions & monthly recap**
- Caption input: photo + user note only, ≤180 chars, must not invent events not in note/photo
- Recap: triggers at 3+ memories/month, 3–5 memories, short paragraph, share image; export gated by entitlement
- Verify: caption generated from an ambiguous photo does not introduce facts absent from the user note

---

## 8. Economy, Payments, Family (Slices 25–29)

**SLICE 25 — Paw Points**
- 10/completed daily care, 5/memory, 15-point daily max — server-side only
- Verify: attempt to submit `paw_points: 1000` from client — rejected, server-calculated value used

**SLICE 26 — Inventory & cosmetics**
- Catalog, ownership, purchase, equip/unequip, render
- Free catalog: blue bandana, yellow raincoat, red bow tie, plant-filled room, starry night room, beach room
- Verify: equip an item not owned by the account — rejected server-side

**SLICE 27 — Entitlements**
- Central checks, not per-screen: `canUploadMemory, canGenerateCompanion, canGenerateRecap, canExportRecap, canUsePremiumCosmetics, canCreateSecondCompanion, canUseFamilyCare`
- Verify: revoke entitlement mid-session — gated action fails on next server call even if client cache says otherwise

**SLICE 28 — Payments**
- Catalog, checkout, confirmation, webhooks, subscription state, entitlements, cancellation, restoration
- Client-reported purchase success is never the final authority — only verified provider webhook events
- Before implementing: agent must check current Apple/Google digital-goods rules and payment provider's current mobile requirements — do not hardcode from this spec
- Verify: simulate a client claiming success with no matching webhook — entitlement not granted

**SLICE 29 — Family Care**
- Only after single-user ownership is fully secure (post Slice 06 verification)
- Flow: Owner → invite → caregiver → accept → membership
- Caregiver can: view/feed/play/groom/rest/add memory. Owner only: delete companion, delete account, billing, manage caregivers
- Verify: caregiver account attempts delete-companion or billing action — rejected server-side

---

## 9. Notifications, Profile, Deletion (Slices 30–32)

**SLICE 30 — Notifications**
- Daily care reminder, memory reminder — respects permission, timezone, preferences, max 1/day
- Verify: deny notification permission — zero notifications sent, no crash/retry loop

**SLICE 31 — Profile**
- Account, my companions, notification settings, subscription, privacy/data, help, delete companion, delete account

**SLICE 32 — Deletion correctness**
- Companion delete: name confirmation → cancel jobs → delete generated assets → photos → memories → care history → inventory → memberships → companion row
- Account delete: cancel subscription → delete all owned companions → delete all storage → delete profile → invalidate sessions
- Verify: after each deletion, run a direct database/storage query confirming zero orphaned rows or files remain

---

## 10. Observability (Slice 33)

**SLICE 33 — Analytics & monitoring**
- Events: `onboarding_started/completed, pet_photo_uploaded, companion_created, companion_reveal_viewed, care_action_completed, daily_care_completed, memory_created, memory_shared, shop_viewed, item_purchased_with_paw_points, subscription_started/canceled, companion_deleted, account_deleted, generation_started/succeeded/failed, upload_failed, care_action_failed, payment_failed, notification_sent/failed`
- Sentry: crashes, exceptions, failed requests, nav errors, AI failures, payment failures
- PostHog: retention, conversion, feature usage, funnels
- Hard rule: never log private pet photos or memory contents
- Verify: grep Sentry/PostHog payloads for photo URLs or memory text — none present

---

## 11. Security, Idempotency, AI-failure, Offline, Persistence Testing (Slices 34–39)

**SLICE 34 — Cross-account security test**
- Two accounts (A, B). Test A against B's: companion, photos, memories, care actions, subscription, deletion — all must fail
- Then test caregiver restriction boundaries

**SLICE 35 — Idempotency replay test**
- Replay: care action, payment webhook, memory creation, generation request, delete request, caregiver invitation — zero duplicate state changes

**SLICE 36 — AI failure simulation**
- Simulate: provider timeout, 500, invalid JSON, malformed response, empty response, overlong response, unsafe response, rate limit, network interruption
- Pass condition: app remains functional in every case, fallback dialogue/behavior triggers correctly

**SLICE 37 — Offline testing**
- Launch offline, open Home offline, care action offline, connection lost mid-action, connection lost mid-upload, app killed mid-upload, connection restored
- Document exactly which functionality is offline-capable — do not claim offline support that wasn't tested

**SLICE 38 — Persistence gate (mandatory)**
- For XP, level, meters, Paw Points, inventory, memories, subscriptions, caregiver membership: perform action → kill app → restart → read backend → confirm state correct

**SLICE 39 — Performance pass**
- Measure: cold launch, Home load, memory timeline load, image upload, companion generation, dialogue generation, care action latency, DB queries
- Optimize only after measuring, not before

---

## 12. Accessibility, Device Matrix, Beta, Launch (Slices 40–46)

**SLICE 40 — Accessibility**
- Font scaling, screen readers, touch target size, contrast, reduced motion, loading/error states

**SLICE 41 — Device matrix**
- Android small/large screen, iPhone small/large screen, slow network, fast network, offline, background/resume, fresh install, upgrade install

**SLICE 42 — Beta**
- Small controlled release. Do not optimize for revenue yet.
- Measure: onboarding completion, companion creation success, D1/D7 retention, daily care completion, memory creation, generation success rate, crash rate

**SLICE 43 — Production readiness gate**
Do not ship until every item is true:
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

**SLICE 44 — Store submission**
- Icon, splash, screenshots, description, keywords, privacy policy, terms, support URL, account deletion instructions, subscription disclosures, data-use disclosures, age rating, Apple config, Google Play config
- Use EAS for production builds

**SLICE 45 — Post-launch loop**
- `Monitor → measure → identify bottleneck → make one change → measure again`
- Explicitly out of scope, do not build reactively: voice, AR, social feed, PvP, breeding, NFTs, web, desktop, open chat

**SLICE 46 — Dependency graph (reference only, not a slice to execute)**
```
CONTRACT → REPO → EXPO → SUPABASE → DB → RLS → STORAGE → AUTH
→ COMPANION ENGINE → CARE ENGINE → TIME ENGINE → ONBOARDING
→ PHOTO PIPELINE → AI JOBS → GENERATION → HOME → MOOD → DIALOGUE
→ MEMORIES → RECAPS → PAW POINTS → COSMETICS → ENTITLEMENTS
→ PAYMENTS → FAMILY CARE → NOTIFICATIONS → DELETION → ANALYTICS
→ OBSERVABILITY → SECURITY TEST → E2E → BETA → STORE → PRODUCTION → MONITORING
```

---

## How to hand this to the agent

Do not paste the whole file into one prompt. Per session:

1. Agent reads `PROJECT_STATE.md`.
2. You say: **"Execute Slice [N]. Verify it. Update PROJECT_STATE.md. Stop."**
3. Agent runs the full loop in Section 0.
4. You review the verification evidence — not a summary of it, the actual test output.
5. Next session, next slice.

Slices 06, 09–12, and 34–38 are the ones most worth personally auditing rather than trusting agent self-report — they're the security/economy/persistence spine everything else depends on.
