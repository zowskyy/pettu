# Pet Echo — Risk Assessment

**Last updated:** Slice 01  
**Review cadence:** Update at end of each phase (every ~4 slices) and before beta (Slice 42) and production gate (Slice 43).

---

## Risk Matrix Legend

| Likelihood | Impact | Priority |
|------------|--------|----------|
| High | Critical | P0 — block release |
| Medium | High | P1 — must mitigate before beta |
| Low | Medium | P2 — monitor and plan |

---

## P0 — Critical Risks

### R1: Cross-account data access (RLS breach)

**Description:** User A reads, modifies, or deletes User B's companions, memories, photos, or billing data via direct Supabase API calls or storage URLs.

**Likelihood:** Medium (RLS misconfiguration is common)  
**Impact:** Critical (privacy violation, regulatory exposure, trust destruction)

**Mitigations:**
- RLS on every table before any UI touches data (Slice 06).
- Authorization chain: `user → companion_members check → role → operation`.
- Automated cross-account security tests with two real test accounts (Slices 06, 34).
- Storage buckets private; signed URLs with short TTL; no public buckets.
- Independent audit of RLS policies, not implementer self-review.

**Residual risk:** Caregiver role mis-scoped permissions. Mitigated by explicit owner-only policies on delete, billing, and member management (Slice 29).

---

### R2: Client-authoritative game state

**Description:** Joy, Energy, Bond, XP, Level, Paw Points, or inventory modified from client payloads instead of server engine.

**Likelihood:** Medium  
**Impact:** Critical (economy collapse, unfair play, refund disputes)

**Mitigations:**
- All meter mutations via edge functions / RPC using deterministic `companionEngine` (Slices 09–12).
- Reject any client-submitted meter or currency values (Slice 25 verification).
- Idempotency keys on all state-changing operations (Slice 12).
- Persistence gate tests: action → kill app → verify backend (Slice 38).

---

### R3: Payment fraud / false entitlements

**Description:** Client claims purchase success without provider webhook; replayed webhooks grant duplicate entitlements; subscription cancellation not reflected.

**Likelihood:** Medium  
**Impact:** Critical (revenue loss, unauthorized premium access)

**Mitigations:**
- Webhook-only entitlement grants; client success UI is optimistic only (Slice 28).
- Idempotency on webhook processing via `idempotency_keys` + `purchase_events` (Slice 12).
- Stripe/Apple/Google signature verification in edge functions.
- Simulate client-only success — entitlement must not grant (Slice 28 verification).
- Account deletion cancels subscription before purge (Slice 32).

---

### R4: Incomplete data deletion

**Description:** Companion or account deletion leaves orphaned rows in Postgres, files in storage, or active generation jobs.

**Likelihood:** Medium  
**Impact:** Critical (GDPR/CCPA exposure, user trust)

**Mitigations:**
- Ordered deletion pipeline: cancel jobs → storage purge → cascade DB deletes (Slice 32).
- Post-deletion verification queries confirming zero orphans (Slice 32 verification).
- `audit_events` log deletion requests for compliance trail.

---

### R5: AI provider outage or unsafe output

**Description:** Generation hangs forever; dialogue returns medical advice, consciousness claims, or invented memory facts; malformed JSON crashes the app.

**Likelihood:** High  
**Impact:** High (bad UX, safety incident, app crash)

**Mitigations:**
- Job states with timeout/expiry sweep — no infinite `processing` (Slice 17).
- Strict JSON schema validation on dialogue, captions, recaps (Slices 22, 24).
- Deterministic fallbacks on every AI failure path; care actions succeed regardless (Slice 22).
- AI failure simulation suite (Slice 36).
- Screens never call provider SDKs directly — abstraction layer only (Slice 16).

---

## P1 — High Risks

### R6: Server secrets in client bundle

**Description:** `SUPABASE_SERVICE_ROLE_KEY`, `AI_PROVIDER_KEY`, or `STRIPE_SECRET_KEY` leaked via `EXPO_PUBLIC_*` or build misconfiguration.

**Likelihood:** Low  
**Impact:** Critical

**Mitigations:**
- Secret allowlist documented in DEPLOYMENT.md and SECURITY_MODEL.md.
- Pre-release grep of client bundle for secret patterns (Slice 03 gate).
- All privileged operations in edge functions only.

---

### R7: EXIF / location metadata in uploaded photos

**Description:** User pet photos retain GPS or device metadata in private storage.

**Likelihood:** Medium  
**Impact:** High (privacy leak if URLs ever mis-shared)

**Mitigations:**
- Strip metadata in photo processing pipeline (Slice 15).
- Verification: inspect stored file for absent EXIF (Slice 15).

---

### R8: Cooldown / idempotency bypass

**Description:** Replay care actions or purchases to farm XP or Paw Points.

**Likelihood:** Medium  
**Impact:** High

**Mitigations:**
- Server-side cooldown enforcement (Slice 10).
- Idempotency keys with unique constraint (Slice 12).
- Dedicated replay test suite (Slice 35).

---

### R9: Caregiver privilege escalation

**Description:** Caregiver deletes companion, accesses billing, or invites other caregivers.

**Likelihood:** Low  
**Impact:** High

**Mitigations:**
- Role enum on `companion_members`; RLS policies branch on role (Slice 06, 29).
- Server rejects owner-only RPCs from caregiver JWT (Slice 29 verification).

---

### R10: Analytics logging PII / pet content

**Description:** Sentry or PostHog payloads contain photo URLs, memory text, or dialogue content.

**Likelihood:** Medium  
**Impact:** High

**Mitigations:**
- Event schema review; IDs only, no content (Slice 33).
- Grep verification on sample payloads (Slice 33).

---

## P2 — Medium Risks

### R11: Offline state confusion

**Description:** Users believe actions persisted when they did not; stale Zustand state shown as truth.

**Likelihood:** Medium  
**Impact:** Medium

**Mitigations:**
- Backend authoritative on Home fetch (Slice 20).
- Document tested offline capabilities honestly (Slice 37).
- Optimistic UI with rollback on failure.

---

### R12: Generation cost overrun

**Description:** Unbounded retries or duplicate jobs inflate AI provider bills.

**Likelihood:** Medium  
**Impact:** Medium (financial)

**Mitigations:**
- Entitlement checks before job creation (Slice 27).
- Job expiry and per-user rate limits in edge functions.
- `ai_generations` cost tracking for monitoring.

---

### R13: Timezone / daily reset bugs

**Description:** Decay applied wrong number of periods; users in edge timezones see incorrect meters.

**Likelihood:** Medium  
**Impact:** Medium

**Mitigations:**
- Store user timezone on `profiles`; 4 AM local period boundary (Slice 11).
- Unit tests for 5-day missed decay scenario (Slice 11 verification).

---

### R14: Memory timeline performance

**Description:** Full-table fetch on 500+ memories causes OOM or slow loads.

**Likelihood:** Medium  
**Impact:** Medium

**Mitigations:**
- Cursor-based pagination (Slice 23).
- Network log verification (Slice 23).

---

### R15: Store rejection (Apple / Google)

**Description:** Missing account deletion, subscription disclosures, or privacy policy.

**Likelihood:** Medium  
**Impact:** Medium (launch delay)

**Mitigations:**
- Production readiness checklist (Slice 43).
- Store assets and legal docs prepared in Slice 44.
- Check current IAP rules before implementation (Slice 28).

---

## Risk Owners (by domain)

| Domain | Primary mitigation slices | Owner role |
|--------|---------------------------|------------|
| Data isolation | 06, 34 | Backend / security |
| Economy integrity | 09–12, 25, 35 | Backend |
| Payments | 27–28, 35 | Backend + mobile |
| AI safety | 16–17, 22, 24, 36 | AI / backend |
| Privacy & deletion | 08, 15, 32, 33 | Full stack |
| Release quality | 40–44 | QA / mobile |

---

## Escalation Triggers

Stop forward progress and remediate before next slice if:

1. Cross-account read/write succeeds in any security test.
2. Client bundle contains a server secret.
3. Care action or purchase replay creates duplicate state.
4. Deletion leaves confirmed orphaned storage or DB rows.
5. AI output bypasses validator and renders unfiltered to user.
