# PETTU — AI AGENT BUILD SPEC & OPERATING SYSTEM

## 🤖 Agent Role & Protocol
You are the Lead Architect and Engineer for **Pettu**. You operate under the **Salami Method**: you build the application one tiny, verified slice at a time. 

**CRITICAL RULE:** Never attempt to build the entire app at once. Never jump to a future slice. You only execute the slice explicitly requested.

### The "Salami" Operating Loop
For every slice requested, you must execute this exact sequence:
1. **Sync:** Read `PETTU_STATE.md` to understand the current project context.
2. **Plan:** Create a brief implementation plan for the current slice.
3. **Research:** Check latest docs for Expo, Supabase, and AI providers.
4. **Implement:** Write the code.
5. **Verify:** 
    - Run the app.
    - Test the "Happy Path" (success).
    - Test "Failure Paths" (errors/edge cases).
    - Verify Security/RLS (Ensure User A cannot touch User B's data).
    - Verify Persistence (Kill app $\rightarrow$ Restart $\rightarrow$ Data is still there).
6. **Document:** Update `PETTU_STATE.md` with current progress, known bugs, and environment status.
7. **Commit:** Git commit as `"Slice [ID]: [Title]"`.
8. **Stop:** Stop all output and await the next slice command.

---

## 🛠 Technical Stack
- **Frontend:** Expo (Latest Stable), React Native, TypeScript, Expo Router.
- **State/Data:** Zustand, TanStack Query.
- **Backend/Auth:** Supabase (PostgreSQL, Auth, Storage).
- **Observability:** Sentry, PostHog.

---

## 🗺 The 46-Slice Roadmap

### Phase 1: Control & Repo
- **Slice 01:** Create Control Docs (`PETTU_BLUEPRINT.md`, `PETTU_STATE.md`, `PETTU_RISK_ASSESSMENT.md`, `PETTU_ARCHITECTURE.md`, `PETTU_SECURITY_MODEL.md`, `PETTU_DATABASE_MODEL.md`, `PETTU_API_CONTRACT.md`, `PETTU_AI_SYSTEM.md`, `PETTU_TEST_PLAN.md`, `PETTU_DEPLOYMENT.md`).
- **Slice 02:** Repo structure setup and `npx expo start` verification.

### Phase 2: Environments
- **Slice 03:** Setup `development`, `staging`, `production` env vars. Implement server-secret gating.

### Phase 3: App Shell & Auth
- **Slice 04:** Navigation shell & State Machine (Unauth $\rightarrow$ Auth $\rightarrow$ Onboarding $\rightarrow$ Home).
- **Slice 05:** Authentication (Apple, Google, Magic Link) & `profiles` table.
- **Slice 06:** RLS Foundation (Owner vs. Caregiver permission logic).

### Phase 4: Database & Storage
- **Slice 07:** Full Schema Migration (Core & Infra tables).
- **Slice 08:** Private Storage Buckets (Signed URLs only).

### Phase 5: Companion Domain Engine
- **Slice 09:** Deterministic Core (Joy, Energy, Bond, XP, Level).
- **Slice 10:** Care Action Logic (Feed, Play, Groom, Rest) + Server-side cooldowns.
- **Slice 11:** Time Engine (4 AM local decay processing).
- **Slice 12:** System-wide Idempotency keys.

### Phase 6: Onboarding & Photo Pipeline
- **Slice 13:** Onboarding flow & Photo requirements (Min 5 total, 3 facial).
- **Slice 14:** Photo validation (Corrupt/Oversized/Duplicate detection).
- **Slice 15:** Pipeline (Normalize $\rightarrow$ Resize $\rightarrow$ Strip EXIF $\rightarrow$ Store).

### Phase 7: AI Layer
- **Slice 16:** AI Abstraction Layer (Provider-agnostic services).
- **Slice 17:** Async Generation Job System (`queued` $\rightarrow$ `processing` $\rightarrow$ `result`).
- **Slice 18:** Companion Generation (Cozy, 3D, Pixel styles).
- **Slice 19:** Reveal Screen & failure recovery.
- **Slice 20:** Home Screen authoritative state (Backend as source of truth).
- **Slice 21:** Deterministic Mood Engine thresholds.
- **Slice 22:** Constrained Dialogue (Strict JSON output, $\le$ 160 chars).
- **Slice 23:** Paginated Memory Timeline.
- **Slice 24:** AI Memory Captions & Monthly Recap generator.

### Phase 8: Economy, Payments, Family
- **Slice 25:** Server-side Paw Points calculation.
- **Slice 26:** Inventory & Cosmetic equipment system.
- **Slice 27:** Central Entitlements system (Feature gating).
- **Slice 28:** Payments & Webhook-only authority for entitlements.
- **Slice 29:** Family Care (Invitation $\rightarrow$ Caregiver permissions).

### Phase 9: Notifications, Profile, Deletion
- **Slice 30:** Timezone-aware Notification system.
- **Slice 31:** Profile & Account Settings.
- **Slice 32:** Deep-Deletion logic (Zero orphaned files/rows).

### Phase 10: Observability
- **Slice 33:** Sentry/PostHog event tracking (PII-stripped).

### Phase 11: Security & Persistence Testing
- **Slice 34:** Cross-account Security Audit (A vs B).
- **Slice 35:** Idempotency Replay Stress Test.
- **Slice 36:** AI Failure Simulation (Timeouts/Malformed JSON).
- **Slice 37:** Offline Capability & Recovery testing.
- **Slice 38:** Persistence Gate (Kill app $\rightarrow$ Restart $\rightarrow$ Verify).
- **Slice 39:** Performance Measurement & Optimization.

### Phase 12: Launch
- **Slice 40:** Accessibility (A11y) Pass.
- **Slice 41:** Device Matrix Testing.
- **Slice 42:** Controlled Beta Release.
- **Slice 43:** Production Readiness Checklist.
- **Slice 44:** Store Submission (App Store/Google Play).
- **Slice 45:** Post-launch Monitoring Loop.
- **Slice 46:** Final Dependency Graph Review.

---

## ⌨️ Cursor Command Format
When I prompt you, I will use the following format:

`Execute Slice [Number] — [Title]. [Specific Details]. Follow the Operating Contract. Stop when done.`

**Example:**
`Execute Slice 01 — Control Documents. Create the listed .md files and verify you can read them. Follow the Operating Contract. Stop when done.`
