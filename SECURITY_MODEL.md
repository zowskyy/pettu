# Pet Echo — Security Model

**Last updated:** Slice 01  
**Principle:** Defense in depth — RLS is the last line, not the only line. Edge functions enforce business rules; RLS enforces data isolation even if application code has bugs.

---

## 1. Authentication

### 1.1 Providers

| Provider | Method | Notes |
|----------|--------|-------|
| Apple | Sign in with Apple | Required for iOS App Store |
| Google | OAuth 2.0 | Android + iOS |
| Email | Magic link (passwordless) | Supabase Auth OTP |

### 1.2 Session model

- Supabase Auth issues JWT access + refresh tokens.
- Client stores session in secure storage (Expo SecureStore).
- Session restored on cold launch without re-login (Slice 05 verification).
- Logout: clear local session + optional server-side refresh token revocation.
- Account deletion: invalidate all sessions for user (Slice 32).

### 1.3 Identity mapping

- `auth.users.id` === `profiles.id` (UUID, 1:1).
- Profile auto-created on first sign-in via database trigger or edge function (Slice 05).
- No pet or companion data on `profiles` — only user-level settings.

---

## 2. Authorization Model

### 2.1 Access chain

Every data operation follows:

```
1. Valid JWT?           → else REJECT (401)
2. User member of       → companion_members row for this companion_id?
   companion?           → else REJECT (403)
3. Role permits         → owner vs caregiver vs operation
   operation?           → else REJECT (403)
4. RLS policy passes?   → else REJECT (empty result / policy violation)
```

### 2.2 Roles

| Role | Source | Scope |
|------|--------|-------|
| **owner** | `companions.owner_id` or `companion_members.role = 'owner'` | Full read/write on companion data; billing; member management; delete companion |
| **caregiver** | `companion_members.role = 'caregiver'` (accepted invite) | Read companion; care actions; add memories; cannot delete, bill, or manage members |
| **unauthenticated** | — | No access to any user data |

### 2.3 Operation matrix

| Operation | Owner | Caregiver | Unauthenticated |
|-----------|-------|-----------|-----------------|
| View companion & meters | ✓ | ✓ | ✗ |
| Feed / Play / Groom / Rest | ✓ | ✓ | ✗ |
| Add memory | ✓ | ✓ | ✗ |
| View memories | ✓ | ✓ | ✗ |
| Delete memory | ✓ | ✗ | ✗ |
| Equip cosmetics | ✓ | ✗ | ✗ |
| Purchase / subscribe | ✓ | ✗ | ✗ |
| Invite caregiver | ✓ | ✗ | ✗ |
| Remove caregiver | ✓ | ✗ | ✗ |
| Delete companion | ✓ | ✗ | ✗ |
| Delete account | ✓ (self) | ✗ | ✗ |
| View billing / subscription | ✓ | ✗ | ✗ |

---

## 3. Row Level Security (RLS) Summary

RLS enabled on **every** table. Policies use `auth.uid()` and companion membership subqueries.

### 3.1 `profiles`

| Policy | Rule |
|--------|------|
| SELECT | `id = auth.uid()` |
| UPDATE | `id = auth.uid()` |
| INSERT | `id = auth.uid()` (on signup) |
| DELETE | Service role only (account deletion flow) |

### 3.2 `companions`

| Policy | Rule |
|--------|------|
| SELECT | Owner or member via `companion_members` |
| INSERT | `owner_id = auth.uid()` |
| UPDATE | Owner only |
| DELETE | Owner only |

### 3.3 `companion_members`

| Policy | Rule |
|--------|------|
| SELECT | Owner of companion OR `user_id = auth.uid()` |
| INSERT | Owner only (invite) |
| UPDATE | Owner (role change) OR invitee (accept) |
| DELETE | Owner only |

### 3.4 `companion_photos`, `memories`, `care_actions`, `inventory_items`

| Policy | Rule |
|--------|------|
| SELECT | Companion member (owner or caregiver) |
| INSERT | Owner or caregiver (inventory: owner only) |
| UPDATE | Owner (inventory equip: owner only) |
| DELETE | Owner only (memories: owner only) |

### 3.5 `subscriptions`, `entitlements`, `purchase_events`

| Policy | Rule |
|--------|------|
| SELECT | `user_id = auth.uid()` |
| INSERT/UPDATE | Service role only (webhook edge functions) |
| DELETE | Service role only |

### 3.6 `ai_generations`, `generation_jobs`

| Policy | Rule |
|--------|------|
| SELECT | Companion member for linked companion |
| INSERT/UPDATE | Service role or authenticated via RPC wrapper |
| DELETE | Service role only |

### 3.7 `notification_preferences`

| Policy | Rule |
|--------|------|
| ALL | `user_id = auth.uid()` |

### 3.8 `notification_delivery_log`, `audit_events`, `idempotency_keys`, `recap_records`

| Policy | Rule |
|--------|------|
| SELECT | `user_id = auth.uid()` where applicable |
| INSERT/UPDATE | Service role or authenticated via edge function |
| DELETE | Service role only |

### 3.9 Storage policies

- All buckets: **private** (no `public` flag).
- SELECT: authenticated + companion membership match on object path prefix.
- INSERT: authenticated + path encodes owned companion.
- DELETE: owner only, via edge function with service role for cascade deletes.

---

## 4. Secret Handling

### 4.1 Client-safe (Expo public env)

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY   # anon key
SENTRY_DSN
POSTHOG_KEY
```

### 4.2 Server-only (NEVER in client)

```
SUPABASE_SERVICE_ROLE_KEY
AI_PROVIDER_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
APPLE_SHARED_SECRET / GOOGLE_SERVICE_ACCOUNT  # IAP verification
```

### 4.3 Rules

1. No server secret in `EXPO_PUBLIC_*`, source code, or committed `.env` files.
2. Edge functions read secrets from Supabase Vault / function secrets.
3. EAS secrets for build-time client vars only (public keys).
4. Pre-release: grep client bundle for `service_role`, `sk_live`, `sk_test`, provider key patterns (Slice 03).

---

## 5. Idempotency & Replay Protection

Operations requiring `Idempotency-Key` header or body field:

- Care action
- Purchase / subscription webhook processing
- Generation request
- Memory creation
- Companion / account delete
- Caregiver invitation

Storage: `idempotency_keys` table with `(user_id, key, operation)` unique constraint. Replay returns cached response without duplicate side effects (Slice 12).

---

## 6. Input Validation

| Surface | Validation |
|---------|------------|
| Care action type | Enum: `feed`, `play`, `groom`, `rest` |
| Photo upload | Type, size, dimensions, duplicate hash (Slice 14) |
| AI dialogue response | JSON schema, length, mood enum, action enum, safety filter (Slice 22) |
| Memory caption | ≤180 chars, no facts beyond user note (Slice 24) |
| Client-submitted meters/points | **Rejected** — server calculates |

---

## 7. Deletion Security

- Companion delete: owner only; requires name confirmation in UI; server validates ownership.
- Account delete: cancels active subscription first; purges all owned companions and storage; deletes profile; invalidates sessions.
- Post-delete: direct DB/storage queries must show zero orphans (Slice 32).

---

## 8. Audit & Compliance

- `audit_events` records: account deletion requested, companion deleted, caregiver invited/removed, subscription changes.
- Fields: `user_id`, `event_type`, `resource_type`, `resource_id`, `metadata` (JSON, no PII content), `created_at`.
- Retention: align with privacy policy; deletion events retained minimum period for dispute resolution.

---

## 9. Threat Model Summary

| Threat | Control |
|--------|---------|
| Stolen JWT | Short TTL + refresh; RLS limits blast radius to user's accessible companions |
| Cross-account API abuse | RLS + membership checks + automated tests (Slices 06, 34) |
| Modified client | Server-authoritative engine; reject client game state |
| Webhook spoofing | Signature verification + idempotency |
| Storage URL guessing | Private buckets + signed URLs + short TTL |
| AI prompt injection | Bounded context; output validator; no tool access to DB |
| Insider (service role leak) | Vault secrets; minimal service role usage; audit log |

---

## 10. Verification Checklist (security slices)

- [ ] Slice 06: Two-account RLS isolation (direct API, not UI)
- [ ] Slice 03: Client bundle secret scan
- [ ] Slice 08: Unauthenticated storage fetch fails
- [ ] Slice 10: Cooldown bypass from modified client fails
- [ ] Slice 28: Client-only purchase claim fails
- [ ] Slice 29: Caregiver delete/billing fails
- [ ] Slice 32: Deletion leaves no orphans
- [ ] Slice 34: Full cross-account matrix
- [ ] Slice 35: Idempotency replay matrix
