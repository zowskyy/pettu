# Pet Echo — Database Model

**Last updated:** Slice 01  
**Database:** PostgreSQL (Supabase)  
**Convention:** `uuid` primary keys, `timestamptz` for all timestamps, `created_at` / `updated_at` on mutable tables.

---

## Entity Relationship Overview

```
profiles (1) ──< (N) companions
profiles (1) ──< (N) companion_members >── (N) companions
companions (1) ──< (N) companion_photos
companions (1) ──< (N) memories
companions (1) ──< (N) care_actions
companions (1) ──< (N) inventory_items
companions (1) ──< (N) generation_jobs
companions (1) ──< (N) ai_generations
companions (1) ──< (N) recap_records

profiles (1) ──< (N) subscriptions
profiles (1) ──< (N) entitlements
profiles (1) ──< (N) purchase_events
profiles (1) ──< (N) notification_preferences
profiles (1) ──< (N) notification_delivery_log
profiles (1) ──< (N) audit_events
profiles (1) ──< (N) idempotency_keys
```

---

## 1. `profiles`

User account metadata. No pet data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, FK → `auth.users.id` | User identity |
| `display_name` | `text` | nullable | Shown in UI |
| `timezone` | `text` | NOT NULL, default `'UTC'` | IANA timezone for daily reset |
| `onboarding_completed_at` | `timestamptz` | nullable | Null until onboarding done |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | |

---

## 2. `companions`

Core companion entity. Game state lives here (authoritative).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `owner_id` | `uuid` | NOT NULL, FK → `profiles.id` | Billing owner |
| `name` | `text` | NOT NULL | Pet / companion name |
| `species` | `text` | NOT NULL | e.g. dog, cat, rabbit |
| `nickname` | `text` | nullable | User-chosen nickname |
| `personality_traits` | `jsonb` | NOT NULL, default `'[]'` | Onboarding traits |
| `favorite_things` | `jsonb` | NOT NULL, default `'[]'` | |
| `quirk` | `text` | nullable | |
| `art_style` | `text` | NOT NULL | `cozy_storybook`, `playful_3d`, `pixel_adventure` |
| `generated_image_path` | `text` | nullable | Storage path in `generated-companions` |
| `joy` | `integer` | NOT NULL, default `80` | 0–100 |
| `energy` | `integer` | NOT NULL, default `80` | 0–100 |
| `bond` | `integer` | NOT NULL, default `50` | 0–100, never decays |
| `xp` | `integer` | NOT NULL, default `0` | |
| `level` | `integer` | NOT NULL, default `1` | |
| `mood` | `text` | NOT NULL, default `'happy'` | Engine-computed enum |
| `paw_points` | `integer` | NOT NULL, default `0` | Server-calculated currency |
| `last_care_action_at` | `timestamptz` | nullable | Cooldown reference |
| `last_processed_period` | `date` | nullable | Daily reset cursor (local date) |
| `equipped_cosmetics` | `jsonb` | NOT NULL, default `'{}'` | `{ slot: item_id }` |
| `creation_status` | `text` | NOT NULL, default `'pending'` | `pending`, `generating`, `ready`, `failed` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes:** `owner_id`, `(owner_id, creation_status)`

---

## 3. `companion_photos`

Training / onboarding photos for companion generation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `companion_id` | `uuid` | NOT NULL, FK → `companions.id` ON DELETE CASCADE | |
| `storage_path` | `text` | NOT NULL | `pet-training-photos/...` |
| `is_facial` | `boolean` | NOT NULL, default `false` | Validation flag |
| `sort_order` | `integer` | NOT NULL, default `0` | Display order |
| `content_hash` | `text` | nullable | Duplicate detection |
| `width` | `integer` | nullable | |
| `height` | `integer` | nullable | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes:** `companion_id`, `(companion_id, content_hash)`

---

## 4. `memories`

Timeline entries for a companion.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `companion_id` | `uuid` | NOT NULL, FK → `companions.id` ON DELETE CASCADE | |
| `created_by` | `uuid` | NOT NULL, FK → `profiles.id` | Owner or caregiver |
| `title` | `text` | NOT NULL | |
| `note` | `text` | nullable | User-written note |
| `memory_date` | `date` | NOT NULL | User-selected date |
| `photo_path` | `text` | nullable | `pet-memory-photos/...` |
| `caption` | `text` | nullable | AI or fallback, ≤180 chars |
| `is_favorite` | `boolean` | NOT NULL, default `false` | |
| `caption_status` | `text` | nullable | `pending`, `succeeded`, `failed`, `skipped` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes:** `(companion_id, memory_date DESC, created_at DESC)` for pagination

---

## 5. `care_actions`

Immutable log of care actions (cooldown + audit).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `companion_id` | `uuid` | NOT NULL, FK → `companions.id` ON DELETE CASCADE | |
| `performed_by` | `uuid` | NOT NULL, FK → `profiles.id` | |
| `action_type` | `text` | NOT NULL | `feed`, `play`, `groom`, `rest` |
| `joy_delta` | `integer` | NOT NULL | Snapshot at time of action |
| `energy_delta` | `integer` | NOT NULL | |
| `bond_delta` | `integer` | NOT NULL | |
| `xp_delta` | `integer` | NOT NULL | |
| `paw_points_earned` | `integer` | NOT NULL, default `0` | |
| `idempotency_key` | `text` | NOT NULL | Unique per user+operation |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes:** `(companion_id, created_at DESC)`, unique `(performed_by, idempotency_key)`

---

## 6. `inventory_items`

Owned cosmetics per companion (or per user — companion-scoped for equip context).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `companion_id` | `uuid` | NOT NULL, FK → `companions.id` ON DELETE CASCADE | |
| `catalog_item_id` | `text` | NOT NULL | e.g. `blue_bandana` |
| `item_type` | `text` | NOT NULL | `accessory`, `room` |
| `acquired_via` | `text` | NOT NULL | `free`, `paw_points`, `premium` |
| `is_equipped` | `boolean` | NOT NULL, default `false` | |
| `acquired_at` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes:** unique `(companion_id, catalog_item_id)`

---

## 7. `companion_members`

Family Care memberships.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `companion_id` | `uuid` | NOT NULL, FK → `companions.id` ON DELETE CASCADE | |
| `user_id` | `uuid` | NOT NULL, FK → `profiles.id` | Member user |
| `role` | `text` | NOT NULL | `owner`, `caregiver` |
| `invited_by` | `uuid` | nullable, FK → `profiles.id` | |
| `status` | `text` | NOT NULL, default `'pending'` | `pending`, `accepted`, `revoked` |
| `accepted_at` | `timestamptz` | nullable | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes:** unique `(companion_id, user_id)`

---

## 8. `subscriptions`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | NOT NULL, FK → `profiles.id` | |
| `provider` | `text` | NOT NULL | `apple`, `google`, `stripe` |
| `provider_subscription_id` | `text` | NOT NULL | External ID |
| `status` | `text` | NOT NULL | `active`, `canceled`, `past_due`, `trialing`, `expired` |
| `plan_id` | `text` | NOT NULL | Product SKU |
| `current_period_start` | `timestamptz` | nullable | |
| `current_period_end` | `timestamptz` | nullable | |
| `canceled_at` | `timestamptz` | nullable | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes:** unique `(provider, provider_subscription_id)`, `user_id`

---

## 9. `ai_generations`

Record of each AI call (audit, cost, debugging).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `job_id` | `uuid` | nullable, FK → `generation_jobs.id` | |
| `companion_id` | `uuid` | nullable, FK → `companions.id` | |
| `user_id` | `uuid` | NOT NULL, FK → `profiles.id` | |
| `generation_type` | `text` | NOT NULL | `companion_image`, `dialogue`, `caption`, `recap` |
| `provider` | `text` | NOT NULL | Provider name |
| `model` | `text` | nullable | Model identifier |
| `input_hash` | `text` | nullable | For dedup/debug (no raw photos) |
| `output_path` | `text` | nullable | Storage path if image |
| `output_text` | `text` | nullable | Dialogue/caption/recap text |
| `tokens_used` | `integer` | nullable | |
| `latency_ms` | `integer` | nullable | |
| `status` | `text` | NOT NULL | `succeeded`, `failed` |
| `error_code` | `text` | nullable | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

---

## 10. `generation_jobs`

Async job queue for long-running AI work.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `companion_id` | `uuid` | nullable, FK → `companions.id` | |
| `user_id` | `uuid` | NOT NULL, FK → `profiles.id` | |
| `job_type` | `text` | NOT NULL | `companion_image`, `caption`, `recap` |
| `status` | `text` | NOT NULL, default `'queued'` | `queued`, `processing`, `succeeded`, `failed`, `cancelled`, `expired` |
| `payload` | `jsonb` | NOT NULL, default `'{}'` | Job input refs (IDs, not blobs) |
| `result` | `jsonb` | nullable | Output refs on success |
| `error_message` | `text` | nullable | |
| `idempotency_key` | `text` | NOT NULL | |
| `attempts` | `integer` | NOT NULL, default `0` | |
| `max_attempts` | `integer` | NOT NULL, default `3` | |
| `expires_at` | `timestamptz` | nullable | Timeout sweep |
| `started_at` | `timestamptz` | nullable | |
| `completed_at` | `timestamptz` | nullable | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes:** `(status, created_at)` for worker, unique `(user_id, idempotency_key)`

---

## 11. `entitlements`

Central feature gates (Slice 27).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | NOT NULL, FK → `profiles.id` | |
| `entitlement_key` | `text` | NOT NULL | See keys below |
| `granted_at` | `timestamptz` | NOT NULL, default `now()` | |
| `expires_at` | `timestamptz` | nullable | Null = permanent until revoked |
| `source` | `text` | NOT NULL | `subscription`, `promo`, `purchase` |
| `source_ref` | `text` | nullable | subscription_id or purchase_id |
| `revoked_at` | `timestamptz` | nullable | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

**Entitlement keys:** `can_upload_memory`, `can_generate_companion`, `can_generate_recap`, `can_export_recap`, `can_use_premium_cosmetics`, `can_create_second_companion`, `can_use_family_care`

**Indexes:** unique `(user_id, entitlement_key)` where `revoked_at IS NULL`

---

## 12. `purchase_events`

Immutable payment audit log.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | NOT NULL, FK → `profiles.id` | |
| `provider` | `text` | NOT NULL | `apple`, `google`, `stripe` |
| `provider_event_id` | `text` | NOT NULL | Webhook event ID |
| `event_type` | `text` | NOT NULL | `purchase`, `renewal`, `cancel`, `refund` |
| `product_id` | `text` | nullable | |
| `amount_cents` | `integer` | nullable | |
| `currency` | `text` | nullable | |
| `raw_payload` | `jsonb` | nullable | Redacted provider payload |
| `idempotency_key` | `text` | NOT NULL | |
| `processed_at` | `timestamptz` | NOT NULL, default `now()` | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes:** unique `(provider, provider_event_id)`

---

## 13. `notification_preferences`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | NOT NULL, FK → `profiles.id` | |
| `daily_care_reminder` | `boolean` | NOT NULL, default `true` | |
| `memory_reminder` | `boolean` | NOT NULL, default `true` | |
| `push_token` | `text` | nullable | Expo push token |
| `permission_status` | `text` | NOT NULL, default `'unknown'` | `granted`, `denied`, `unknown` |
| `quiet_hours_start` | `time` | nullable | |
| `quiet_hours_end` | `time` | nullable | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes:** unique `user_id`

---

## 14. `notification_delivery_log`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | NOT NULL, FK → `profiles.id` | |
| `notification_type` | `text` | NOT NULL | `daily_care`, `memory_reminder` |
| `status` | `text` | NOT NULL | `sent`, `failed`, `skipped` |
| `skip_reason` | `text` | nullable | `permission_denied`, `max_per_day`, `quiet_hours` |
| `sent_at` | `timestamptz` | nullable | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes:** `(user_id, created_at DESC)` for max-1-per-day check

---

## 15. `recap_records`

Monthly memory recaps.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `companion_id` | `uuid` | NOT NULL, FK → `companions.id` ON DELETE CASCADE | |
| `user_id` | `uuid` | NOT NULL, FK → `profiles.id` | |
| `year` | `integer` | NOT NULL | |
| `month` | `integer` | NOT NULL | 1–12 |
| `memory_ids` | `uuid[]` | NOT NULL | 3–5 selected memories |
| `recap_text` | `text` | NOT NULL | Generated paragraph |
| `share_image_path` | `text` | nullable | `generated-recaps/...` |
| `generation_job_id` | `uuid` | nullable, FK → `generation_jobs.id` | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes:** unique `(companion_id, year, month)`

---

## 16. `audit_events`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | nullable, FK → `profiles.id` | Actor |
| `event_type` | `text` | NOT NULL | e.g. `companion_deleted`, `account_deleted` |
| `resource_type` | `text` | NOT NULL | `companion`, `account`, `subscription` |
| `resource_id` | `uuid` | nullable | |
| `metadata` | `jsonb` | NOT NULL, default `'{}'` | No PII content |
| `ip_address` | `inet` | nullable | Server-captured |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

---

## 17. `idempotency_keys`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | NOT NULL, FK → `profiles.id` | |
| `key` | `text` | NOT NULL | Client-provided UUID |
| `operation` | `text` | NOT NULL | `care_action`, `purchase`, `generation`, etc. |
| `request_hash` | `text` | nullable | Optional body hash |
| `response_status` | `integer` | nullable | HTTP status cached |
| `response_body` | `jsonb` | nullable | Cached success response |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `expires_at` | `timestamptz` | NOT NULL | TTL e.g. 24h |

**Indexes:** unique `(user_id, key, operation)`

---

## Enums (application-level)

| Enum | Values |
|------|--------|
| `care_action_type` | `feed`, `play`, `groom`, `rest` |
| `mood` | `thriving`, `happy`, `calm`, `sleepy`, `needs_attention`, `cozy`, `playful` |
| `art_style` | `cozy_storybook`, `playful_3d`, `pixel_adventure` |
| `member_role` | `owner`, `caregiver` |
| `job_status` | `queued`, `processing`, `succeeded`, `failed`, `cancelled`, `expired` |

---

## Migration Notes (Slice 07)

- Enable RLS on all tables immediately after creation.
- Add `updated_at` triggers using `moddatetime` or equivalent.
- Foreign keys use `ON DELETE CASCADE` where child data has no meaning without parent (companion-scoped tables).
- `subscriptions` / `entitlements` use restrict or set null on user delete — handled by ordered account deletion edge function (Slice 32).
