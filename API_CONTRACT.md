# Pet Echo — API Contract

**Last updated:** Slice 01  
**Transport:** HTTPS  
**Auth:** Supabase JWT in `Authorization: Bearer <access_token>`  
**Base URLs:**
- Supabase REST: `{SUPABASE_URL}/rest/v1`
- Edge Functions: `{SUPABASE_URL}/functions/v1`
- Storage: `{SUPABASE_URL}/storage/v1`

**Conventions:**
- All mutating endpoints accept `Idempotency-Key` header (UUID v4) where noted.
- Timestamps are ISO 8601 UTC (`timestamptz`).
- Errors use `{ "error": { "code": string, "message": string, "details"?: object } }`.

---

## 1. Authentication

### 1.1 Sign in (client SDK)

Handled by Supabase Auth client — not custom REST.

| Method | Provider | Client call |
|--------|----------|-------------|
| Apple | `signInWithOAuth({ provider: 'apple' })` | |
| Google | `signInWithOAuth({ provider: 'google' })` | |
| Email magic link | `signInWithOtp({ email })` | |

**Post-sign-in side effect:** `profiles` row created if missing.

```json
// profiles row (auto-created)
{
  "id": "uuid",
  "display_name": null,
  "timezone": "America/New_York",
  "onboarding_completed_at": null,
  "created_at": "2026-08-14T00:00:00Z",
  "updated_at": "2026-08-14T00:00:00Z"
}
```

### 1.2 Session restore

```typescript
const { data: { session } } = await supabase.auth.getSession();
// On app launch — refresh if needed via getSession / onAuthStateChange
```

### 1.3 Logout

```typescript
await supabase.auth.signOut();
```

**Response:** 204 local clear; optional server revocation.

### 1.4 Get current user

```
GET /rest/v1/profiles?id=eq.{user_id}&select=*
Authorization: Bearer {jwt}
```

**Response 200:**
```json
{
  "id": "uuid",
  "display_name": "Alex",
  "timezone": "America/New_York",
  "onboarding_completed_at": "2026-08-14T12:00:00Z",
  "created_at": "...",
  "updated_at": "..."
}
```

### 1.5 Update profile

```
PATCH /rest/v1/profiles?id=eq.{user_id}
Content-Type: application/json

{ "display_name": "Alex", "timezone": "America/Los_Angeles" }
```

### 1.6 Delete account (edge function)

```
POST /functions/v1/delete-account
Idempotency-Key: {uuid}

{}
```

**Response 200:**
```json
{ "deleted": true, "scheduled_at": "2026-08-14T12:00:00Z" }
```

**Errors:** `403` not owner; `409` active deletion in progress.

---

## 2. Companions

### 2.1 List companions

```
GET /rest/v1/companions?select=*&order=created_at.desc
Authorization: Bearer {jwt}
```

RLS returns only companions where user is owner or member.

### 2.2 Get companion (authoritative state)

```
GET /rest/v1/companions?id=eq.{companion_id}&select=*
```

**Response 200:**
```json
{
  "id": "uuid",
  "owner_id": "uuid",
  "name": "Buddy",
  "species": "dog",
  "nickname": "Buds",
  "joy": 72,
  "energy": 65,
  "bond": 58,
  "xp": 240,
  "level": 3,
  "mood": "happy",
  "paw_points": 45,
  "last_care_action_at": "2026-08-14T08:00:00Z",
  "last_processed_period": "2026-08-14",
  "equipped_cosmetics": { "accessory": "blue_bandana", "room": "starry_night_room" },
  "creation_status": "ready",
  "generated_image_path": "generated-companions/{id}/main.png",
  "art_style": "cozy_storybook"
}
```

### 2.3 Create companion (onboarding)

```
POST /rest/v1/companions
Content-Type: application/json

{
  "name": "Buddy",
  "species": "dog",
  "nickname": "Buds",
  "personality_traits": ["playful", "loyal"],
  "favorite_things": ["tennis balls", "sunbeams"],
  "quirk": "tilts head when confused",
  "art_style": "cozy_storybook"
}
```

**Response 201:** Full companion object with `creation_status: "pending"`.

---

## 3. Care Actions

### 3.1 Perform care action

```
POST /functions/v1/care-action
Content-Type: application/json
Idempotency-Key: {uuid}

{
  "companion_id": "uuid",
  "action_type": "feed"
}
```

**`action_type` enum:** `feed` | `play` | `groom` | `rest`

**Response 200:**
```json
{
  "care_action_id": "uuid",
  "companion": {
    "joy": 82,
    "energy": 85,
    "bond": 63,
    "xp": 248,
    "level": 3,
    "mood": "happy",
    "paw_points": 50,
    "last_care_action_at": "2026-08-14T12:00:00Z"
  },
  "deltas": {
    "joy": 10,
    "energy": 5,
    "bond": 5,
    "xp": 8,
    "paw_points_earned": 10
  },
  "dialogue": {
    "mood": "happy",
    "message": "That was delicious! Ready for more adventures?",
    "memory_reference_id": null,
    "suggested_action": null
  },
  "cooldown_expires_at": "2026-08-14T16:00:00Z"
}
```

**Errors:**

| Code | HTTP | Condition |
|------|------|-----------|
| `COOLDOWN_ACTIVE` | 429 | Same action within 4 hours |
| `COMPANION_NOT_FOUND` | 404 | Invalid ID or no access |
| `INVALID_ACTION` | 400 | Unknown action_type |
| `COMPANION_NOT_READY` | 409 | Still generating |

**Idempotency:** Replay with same key returns identical 200 without duplicate XP/points.

**Rejected:** Any client-submitted `joy`, `xp`, `paw_points` in body — ignored or 400.

### 3.2 Care action history

```
GET /rest/v1/care_actions?companion_id=eq.{id}&order=created_at.desc&limit=20
```

---

## 4. Memories

### 4.1 List memories (paginated)

```
GET /rest/v1/memories?companion_id=eq.{id}&order=memory_date.desc,created_at.desc&limit=20&offset=0
```

**Cursor pagination (preferred):**
```
GET /rest/v1/memories?companion_id=eq.{id}&memory_date=lt.{cursor_date}&order=memory_date.desc&limit=20
```

**Response 200:** Array of memory objects.

### 4.2 Create memory

```
POST /functions/v1/create-memory
Content-Type: application/json
Idempotency-Key: {uuid}

{
  "companion_id": "uuid",
  "title": "Park day",
  "note": "Buddy loved the new frisbee",
  "memory_date": "2026-08-10",
  "photo_upload": true
}
```

**Response 201:**
```json
{
  "memory_id": "uuid",
  "upload_url": "signed-url-for-pet-memory-photos",
  "upload_path": "pet-memory-photos/{companion_id}/{memory_id}.jpg",
  "caption_status": "pending"
}
```

Client uploads photo to signed URL, then optionally polls caption status.

### 4.3 Update memory

```
PATCH /rest/v1/memories?id=eq.{memory_id}

{ "title": "...", "is_favorite": true }
```

Owner only for delete; owner + caregiver for create.

### 4.4 Delete memory

```
POST /functions/v1/delete-memory
Idempotency-Key: {uuid}

{ "memory_id": "uuid" }
```

Owner only. Cascades storage delete.

---

## 5. Generation Jobs

### 5.1 Create companion generation job

```
POST /functions/v1/create-generation-job
Content-Type: application/json
Idempotency-Key: {uuid}

{
  "companion_id": "uuid",
  "job_type": "companion_image",
  "payload": {
    "art_style": "cozy_storybook",
    "photo_ids": ["uuid", "uuid", "uuid", "uuid", "uuid"]
  }
}
```

**Response 202:**
```json
{
  "job_id": "uuid",
  "status": "queued",
  "expires_at": "2026-08-14T12:10:00Z"
}
```

### 5.2 Get job status

```
GET /rest/v1/generation_jobs?id=eq.{job_id}&select=*
```

**Response 200:**
```json
{
  "id": "uuid",
  "companion_id": "uuid",
  "job_type": "companion_image",
  "status": "processing",
  "result": null,
  "error_message": null,
  "created_at": "...",
  "completed_at": null
}
```

**Terminal statuses:** `succeeded`, `failed`, `cancelled`, `expired`

**On success `result`:**
```json
{
  "generated_image_path": "generated-companions/{id}/main.png",
  "ai_generation_id": "uuid"
}
```

### 5.3 Cancel job

```
POST /functions/v1/cancel-generation-job

{ "job_id": "uuid" }
```

Only `queued` or `processing` (best-effort cancel).

### 5.4 Request dialogue (synchronous, short timeout)

```
POST /functions/v1/generate-dialogue
Content-Type: application/json

{
  "companion_id": "uuid",
  "context": {
    "recent_action": "feed",
    "optional_memory_id": null
  }
}
```

**Response 200:**
```json
{
  "mood": "happy",
  "message": "Yum! That hit the spot.",
  "memory_reference_id": null,
  "suggested_action": "play",
  "source": "ai"
}
```

On AI failure: same shape with `"source": "fallback"`.

---

## 6. Storage

### 6.1 Get signed upload URL (training photos)

```
POST /functions/v1/storage-signed-upload

{
  "bucket": "pet-training-photos",
  "companion_id": "uuid",
  "filename": "photo_01.jpg",
  "content_type": "image/jpeg"
}
```

**Response 200:**
```json
{
  "signed_url": "https://...",
  "path": "pet-training-photos/{companion_id}/{photo_id}.jpg",
  "expires_in": 300
}
```

### 6.2 Get signed download URL

```
POST /functions/v1/storage-signed-download

{
  "bucket": "generated-companions",
  "path": "generated-companions/{id}/main.png"
}
```

**Response 200:**
```json
{
  "signed_url": "https://...",
  "expires_in": 3600
}
```

---

## 7. Payments & Entitlements

### 7.1 List entitlements

```
GET /rest/v1/entitlements?user_id=eq.{user_id}&revoked_at=is.null&select=*
```

**Response 200:**
```json
[
  {
    "entitlement_key": "can_use_premium_cosmetics",
    "granted_at": "2026-08-01T00:00:00Z",
    "expires_at": null,
    "source": "subscription"
  }
]
```

### 7.2 Check entitlement (client helper maps to keys)

Server-side gate example:
```
POST /functions/v1/check-entitlement

{ "entitlement_key": "can_create_second_companion" }
```

**Response 200:** `{ "allowed": true }` | `{ "allowed": false, "reason": "no_active_subscription" }`

### 7.3 Initiate purchase (client-native)

No custom checkout API — uses StoreKit / Play Billing. Client listens for local result but **does not** grant entitlements.

### 7.4 Webhook (server-only)

```
POST /functions/v1/stripe-webhook
Stripe-Signature: {sig}

{ ... provider payload ... }
```

```
POST /functions/v1/iap-webhook
Authorization: Bearer {provider_secret}

{ ... provider payload ... }
```

**Processing:**
1. Verify signature
2. Check `idempotency_keys` / `purchase_events` for duplicate event ID
3. Upsert `subscriptions`, `entitlements`, `purchase_events`
4. Return 200

**Client never calls webhook endpoints.**

### 7.5 Restore purchases

```
POST /functions/v1/restore-purchases

{ "provider": "apple", "receipt": "..." }
```

Triggers provider validation → entitlement sync. Does not trust client-only claim.

---

## 8. Family Care

### 8.1 Invite caregiver

```
POST /functions/v1/invite-caregiver
Idempotency-Key: {uuid}

{
  "companion_id": "uuid",
  "email": "caregiver@example.com"
}
```

**Response 201:** `{ "invitation_id": "uuid", "status": "pending" }`

### 8.2 Accept invitation

```
POST /functions/v1/accept-caregiver-invite

{ "invitation_id": "uuid" }
```

### 8.3 List members

```
GET /rest/v1/companion_members?companion_id=eq.{id}&select=*,profiles(display_name)
```

---

## 9. Shop / Inventory

### 9.1 Purchase with Paw Points

```
POST /functions/v1/purchase-item
Idempotency-Key: {uuid}

{
  "companion_id": "uuid",
  "catalog_item_id": "yellow_raincoat"
}
```

**Response 200:**
```json
{
  "inventory_item_id": "uuid",
  "paw_points_remaining": 30
}
```

**Errors:** `INSUFFICIENT_POINTS`, `ALREADY_OWNED`, `PREMIUM_REQUIRED`

### 9.2 Equip item

```
POST /functions/v1/equip-item

{
  "companion_id": "uuid",
  "catalog_item_id": "blue_bandana",
  "slot": "accessory"
}
```

**Errors:** `NOT_OWNED` if inventory missing.

---

## 10. Notifications

### 10.1 Update preferences

```
PATCH /rest/v1/notification_preferences?user_id=eq.{user_id}

{
  "daily_care_reminder": true,
  "push_token": "ExponentPushToken[...]"
}
```

---

## 11. Standard Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | RLS / role denial |
| `NOT_FOUND` | 404 | Resource missing or inaccessible |
| `VALIDATION_ERROR` | 400 | Invalid input |
| `CONFLICT` | 409 | State conflict |
| `COOLDOWN_ACTIVE` | 429 | Rate / cooldown limit |
| `IDEMPOTENCY_REPLAY` | 200 | Same key — cached response (not an error) |
| `ENTITLEMENT_REQUIRED` | 402 | Feature gated |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 12. Versioning

- API version tracked via edge function deployment tags.
- Breaking changes require migration note in `PROJECT_STATE.md` and client min-version check (future slice).
