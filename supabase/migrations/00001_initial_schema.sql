-- Pet Echo — Slice 07: Initial database schema
-- Core domain tables + infrastructure tables

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------

create type public.companion_mood as enum (
  'thriving',
  'happy',
  'calm',
  'sleepy',
  'needs_attention',
  'cozy',
  'playful'
);

create type public.art_style as enum (
  'cozy_storybook',
  'playful_3d',
  'pixel_adventure'
);

create type public.care_action_type as enum (
  'feed',
  'play',
  'groom',
  'rest'
);

create type public.companion_member_role as enum (
  'owner',
  'caregiver'
);

create type public.companion_member_status as enum (
  'pending',
  'accepted',
  'revoked'
);

create type public.subscription_provider as enum (
  'apple',
  'google',
  'stripe'
);

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'expired'
);

create type public.entitlement_source as enum (
  'free',
  'subscription',
  'purchase',
  'promotional'
);

create type public.ai_generation_type as enum (
  'companion',
  'dialogue',
  'caption',
  'recap'
);

create type public.ai_generation_status as enum (
  'pending',
  'succeeded',
  'failed'
);

create type public.generation_job_status as enum (
  'queued',
  'processing',
  'succeeded',
  'failed',
  'cancelled',
  'expired'
);

create type public.generation_job_type as enum (
  'companion_image',
  'dialogue',
  'caption',
  'recap'
);

create type public.photo_upload_status as enum (
  'pending',
  'uploaded',
  'processing',
  'ready',
  'failed'
);

create type public.inventory_acquired_via as enum (
  'free',
  'paw_points',
  'subscription',
  'promotional'
);

create type public.inventory_item_category as enum (
  'accessory',
  'room'
);

create type public.notification_type as enum (
  'daily_care_reminder',
  'memory_reminder'
);

create type public.notification_delivery_status as enum (
  'sent',
  'failed',
  'skipped'
);

create type public.idempotency_scope as enum (
  'care_action',
  'purchase',
  'subscription_webhook',
  'generation_request',
  'memory_creation',
  'delete',
  'caregiver_invitation'
);

create type public.idempotency_status as enum (
  'pending',
  'completed',
  'failed'
);

create type public.purchase_event_type as enum (
  'checkout_completed',
  'subscription_created',
  'subscription_updated',
  'subscription_canceled',
  'subscription_renewed',
  'refund',
  'restore'
);

-- ---------------------------------------------------------------------------
-- Shared trigger helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Core: profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create index profiles_created_at_idx on public.profiles (created_at);

-- ---------------------------------------------------------------------------
-- Core: companions
-- ---------------------------------------------------------------------------

create table public.companions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  nickname text,
  species text not null,
  personality_traits jsonb not null default '{}'::jsonb,
  favorite_things text[] not null default '{}',
  quirk text,
  art_style public.art_style,
  joy smallint not null default 50 check (joy between 0 and 100),
  energy smallint not null default 50 check (energy between 0 and 100),
  bond smallint not null default 0 check (bond between 0 and 100),
  xp integer not null default 0 check (xp >= 0),
  level smallint not null default 1 check (level >= 1),
  paw_points integer not null default 0 check (paw_points >= 0),
  mood public.companion_mood not null default 'happy',
  last_processed_period date,
  last_feed_at timestamptz,
  last_play_at timestamptz,
  last_groom_at timestamptz,
  last_rest_at timestamptz,
  daily_care_completed_on date,
  onboarding_complete boolean not null default false,
  onboarding_step text,
  generated_image_bucket text,
  generated_image_path text,
  equipped_accessory_catalog_id text,
  equipped_room_catalog_id text,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger companions_set_updated_at
before update on public.companions
for each row execute function public.set_updated_at();

create index companions_owner_id_idx on public.companions (owner_id);
create index companions_owner_active_idx on public.companions (owner_id)
  where deleted_at is null;
create index companions_owner_onboarding_idx on public.companions (owner_id, onboarding_complete)
  where deleted_at is null;
create index companions_last_processed_period_idx on public.companions (last_processed_period)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Core: companion_photos
-- ---------------------------------------------------------------------------

create table public.companion_photos (
  id uuid primary key default gen_random_uuid(),
  companion_id uuid not null references public.companions (id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  sort_order smallint not null default 0 check (sort_order >= 0),
  is_facial boolean not null default false,
  mime_type text,
  file_size_bytes integer check (file_size_bytes is null or file_size_bytes > 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  upload_status public.photo_upload_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (companion_id, storage_path)
);

create trigger companion_photos_set_updated_at
before update on public.companion_photos
for each row execute function public.set_updated_at();

create index companion_photos_companion_id_idx on public.companion_photos (companion_id);
create index companion_photos_companion_sort_idx on public.companion_photos (companion_id, sort_order);
create index companion_photos_upload_status_idx on public.companion_photos (upload_status);

-- ---------------------------------------------------------------------------
-- Core: memories
-- ---------------------------------------------------------------------------

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  companion_id uuid not null references public.companions (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete restrict,
  title text not null,
  note text,
  memory_date date not null,
  photo_bucket text,
  photo_path text,
  caption text,
  is_favorite boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger memories_set_updated_at
before update on public.memories
for each row execute function public.set_updated_at();

create index memories_companion_id_idx on public.memories (companion_id);
create index memories_created_by_idx on public.memories (created_by);
create index memories_timeline_idx on public.memories (companion_id, memory_date desc, created_at desc)
  where deleted_at is null;
create index memories_favorites_idx on public.memories (companion_id, is_favorite)
  where deleted_at is null and is_favorite = true;

-- ---------------------------------------------------------------------------
-- Core: care_actions
-- ---------------------------------------------------------------------------

create table public.care_actions (
  id uuid primary key default gen_random_uuid(),
  companion_id uuid not null references public.companions (id) on delete cascade,
  performed_by uuid not null references public.profiles (id) on delete restrict,
  action_type public.care_action_type not null,
  joy_delta smallint not null default 0,
  energy_delta smallint not null default 0,
  bond_delta smallint not null default 0,
  xp_delta smallint not null default 0,
  paw_points_awarded smallint not null default 0 check (paw_points_awarded >= 0),
  idempotency_key_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index care_actions_companion_id_idx on public.care_actions (companion_id);
create index care_actions_performed_by_idx on public.care_actions (performed_by);
create index care_actions_companion_created_idx on public.care_actions (companion_id, created_at desc);
create index care_actions_cooldown_idx on public.care_actions (companion_id, action_type, created_at desc);

-- ---------------------------------------------------------------------------
-- Core: inventory_items
-- ---------------------------------------------------------------------------

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  companion_id uuid references public.companions (id) on delete set null,
  catalog_item_id text not null,
  category public.inventory_item_category not null,
  display_name text not null,
  is_equipped boolean not null default false,
  equipped_slot text,
  acquired_via public.inventory_acquired_via not null default 'free',
  paw_points_spent integer not null default 0 check (paw_points_spent >= 0),
  acquired_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, catalog_item_id)
);

create trigger inventory_items_set_updated_at
before update on public.inventory_items
for each row execute function public.set_updated_at();

create index inventory_items_profile_id_idx on public.inventory_items (profile_id);
create index inventory_items_companion_id_idx on public.inventory_items (companion_id);
create index inventory_items_equipped_idx on public.inventory_items (profile_id, is_equipped)
  where is_equipped = true;

-- ---------------------------------------------------------------------------
-- Core: companion_members (Family Care)
-- ---------------------------------------------------------------------------

create table public.companion_members (
  id uuid primary key default gen_random_uuid(),
  companion_id uuid not null references public.companions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.companion_member_role not null default 'caregiver',
  status public.companion_member_status not null default 'pending',
  invited_by uuid not null references public.profiles (id) on delete restrict,
  invite_email text,
  invited_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (companion_id, user_id)
);

create trigger companion_members_set_updated_at
before update on public.companion_members
for each row execute function public.set_updated_at();

create index companion_members_companion_id_idx on public.companion_members (companion_id);
create index companion_members_user_id_idx on public.companion_members (user_id);
create index companion_members_user_active_idx on public.companion_members (user_id, status)
  where status = 'accepted';
create index companion_members_pending_idx on public.companion_members (companion_id, status)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- Core: subscriptions
-- ---------------------------------------------------------------------------

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  provider public.subscription_provider not null,
  provider_subscription_id text not null,
  product_id text not null,
  status public.subscription_status not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  raw_provider_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (provider, provider_subscription_id)
);

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create index subscriptions_profile_id_idx on public.subscriptions (profile_id);
create index subscriptions_profile_active_idx on public.subscriptions (profile_id, status)
  where status in ('trialing', 'active', 'past_due');

-- ---------------------------------------------------------------------------
-- Infra: ai_generations
-- ---------------------------------------------------------------------------

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  companion_id uuid references public.companions (id) on delete set null,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  generation_type public.ai_generation_type not null,
  provider text not null,
  model text,
  status public.ai_generation_status not null default 'pending',
  input_snapshot jsonb not null default '{}'::jsonb,
  output_payload jsonb,
  error_message text,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index ai_generations_companion_id_idx on public.ai_generations (companion_id);
create index ai_generations_profile_id_idx on public.ai_generations (profile_id);
create index ai_generations_type_status_idx on public.ai_generations (generation_type, status, created_at desc);

-- ---------------------------------------------------------------------------
-- Infra: generation_jobs
-- ---------------------------------------------------------------------------

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  companion_id uuid not null references public.companions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  ai_generation_id uuid references public.ai_generations (id) on delete set null,
  job_type public.generation_job_type not null,
  status public.generation_job_status not null default 'queued',
  attempt_count smallint not null default 0 check (attempt_count >= 0),
  max_attempts smallint not null default 3 check (max_attempts > 0),
  error_message text,
  result_bucket text,
  result_path text,
  expires_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger generation_jobs_set_updated_at
before update on public.generation_jobs
for each row execute function public.set_updated_at();

create index generation_jobs_companion_id_idx on public.generation_jobs (companion_id);
create index generation_jobs_profile_id_idx on public.generation_jobs (profile_id);
create index generation_jobs_ai_generation_id_idx on public.generation_jobs (ai_generation_id);
create index generation_jobs_status_created_idx on public.generation_jobs (status, created_at);
create index generation_jobs_expires_at_idx on public.generation_jobs (expires_at)
  where status in ('queued', 'processing');

-- ---------------------------------------------------------------------------
-- Infra: entitlements
-- ---------------------------------------------------------------------------

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  entitlement_key text not null,
  granted boolean not null default true,
  source public.entitlement_source not null default 'free',
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, entitlement_key)
);

create trigger entitlements_set_updated_at
before update on public.entitlements
for each row execute function public.set_updated_at();

create index entitlements_profile_id_idx on public.entitlements (profile_id);
create index entitlements_active_idx on public.entitlements (profile_id, entitlement_key)
  where granted = true;

-- ---------------------------------------------------------------------------
-- Infra: purchase_events
-- ---------------------------------------------------------------------------

create table public.purchase_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  provider public.subscription_provider not null,
  provider_event_id text not null,
  event_type public.purchase_event_type not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key_id uuid,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (provider, provider_event_id)
);

create index purchase_events_profile_id_idx on public.purchase_events (profile_id);
create index purchase_events_unprocessed_idx on public.purchase_events (created_at)
  where processed_at is null;

-- ---------------------------------------------------------------------------
-- Infra: notification_preferences
-- ---------------------------------------------------------------------------

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  notifications_enabled boolean not null default true,
  daily_care_reminder boolean not null default true,
  memory_reminder boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  max_per_day smallint not null default 1 check (max_per_day between 0 and 10),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Infra: notification_delivery_log
-- ---------------------------------------------------------------------------

create table public.notification_delivery_log (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  notification_type public.notification_type not null,
  status public.notification_delivery_status not null,
  skip_reason text,
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index notification_delivery_log_profile_id_idx on public.notification_delivery_log (profile_id);
create index notification_delivery_log_profile_sent_idx on public.notification_delivery_log (profile_id, sent_at desc);
create index notification_delivery_log_daily_cap_idx on public.notification_delivery_log (profile_id, created_at desc)
  where status = 'sent';

-- ---------------------------------------------------------------------------
-- Infra: recap_records
-- ---------------------------------------------------------------------------

create table public.recap_records (
  id uuid primary key default gen_random_uuid(),
  companion_id uuid not null references public.companions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  period_year smallint not null check (period_year between 2000 and 2100),
  period_month smallint not null check (period_month between 1 and 12),
  memory_ids uuid[] not null default '{}',
  recap_text text not null,
  share_image_bucket text,
  share_image_path text,
  ai_generation_id uuid references public.ai_generations (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (companion_id, period_year, period_month)
);

create index recap_records_companion_id_idx on public.recap_records (companion_id);
create index recap_records_profile_id_idx on public.recap_records (profile_id);

-- ---------------------------------------------------------------------------
-- Infra: audit_events
-- ---------------------------------------------------------------------------

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  companion_id uuid references public.companions (id) on delete set null,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index audit_events_profile_id_idx on public.audit_events (profile_id, created_at desc);
create index audit_events_companion_id_idx on public.audit_events (companion_id, created_at desc);
create index audit_events_actor_id_idx on public.audit_events (actor_id, created_at desc);
create index audit_events_event_type_idx on public.audit_events (event_type, created_at desc);

-- ---------------------------------------------------------------------------
-- Infra: idempotency_keys
-- ---------------------------------------------------------------------------

create table public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  scope public.idempotency_scope not null,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  request_hash text,
  status public.idempotency_status not null default 'pending',
  response_snapshot jsonb,
  resource_type text,
  resource_id uuid,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  unique (profile_id, scope, key)
);

create index idempotency_keys_profile_id_idx on public.idempotency_keys (profile_id);
create index idempotency_keys_expires_at_idx on public.idempotency_keys (expires_at)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- Deferred foreign keys to idempotency_keys
-- ---------------------------------------------------------------------------

alter table public.care_actions
  add constraint care_actions_idempotency_key_id_fkey
  foreign key (idempotency_key_id) references public.idempotency_keys (id) on delete set null;

alter table public.purchase_events
  add constraint purchase_events_idempotency_key_id_fkey
  foreign key (idempotency_key_id) references public.idempotency_keys (id) on delete set null;

create index care_actions_idempotency_key_id_idx on public.care_actions (idempotency_key_id);
create index purchase_events_idempotency_key_id_idx on public.purchase_events (idempotency_key_id);
