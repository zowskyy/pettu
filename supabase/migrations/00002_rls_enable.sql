-- Pet Echo — Slice 07: Enable RLS and authorization helper functions
-- Policies are defined in Slice 06; this migration only enables RLS and helpers.

-- ---------------------------------------------------------------------------
-- Authorization helper functions
-- ---------------------------------------------------------------------------

create or replace function public.is_profile_owner(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_profile_id is not null
    and auth.uid() is not null
    and target_profile_id = auth.uid();
$$;

create or replace function public.is_companion_owner(target_companion_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.companions c
    where c.id = target_companion_id
      and c.owner_id = auth.uid()
      and c.deleted_at is null
  );
$$;

create or replace function public.is_companion_caregiver(target_companion_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.companion_members cm
    where cm.companion_id = target_companion_id
      and cm.user_id = auth.uid()
      and cm.role = 'caregiver'
      and cm.status = 'accepted'
  );
$$;

create or replace function public.can_access_companion(target_companion_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_companion_owner(target_companion_id)
      or public.is_companion_caregiver(target_companion_id);
$$;

create or replace function public.can_care_for_companion(target_companion_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_access_companion(target_companion_id);
$$;

comment on function public.is_profile_owner(uuid) is
  'Returns true when the authenticated user owns the given profile row.';

comment on function public.is_companion_owner(uuid) is
  'Returns true when the authenticated user owns the companion.';

comment on function public.is_companion_caregiver(uuid) is
  'Returns true when the authenticated user is an accepted caregiver for the companion.';

comment on function public.can_access_companion(uuid) is
  'Returns true when the authenticated user is the owner or an accepted caregiver.';

comment on function public.can_care_for_companion(uuid) is
  'Alias for can_access_companion; used by care-action authorization in Slice 06.';

-- ---------------------------------------------------------------------------
-- Enable row level security on all application tables
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.companions enable row level security;
alter table public.companion_photos enable row level security;
alter table public.memories enable row level security;
alter table public.care_actions enable row level security;
alter table public.inventory_items enable row level security;
alter table public.companion_members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.ai_generations enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.entitlements enable row level security;
alter table public.purchase_events enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_delivery_log enable row level security;
alter table public.recap_records enable row level security;
alter table public.audit_events enable row level security;
alter table public.idempotency_keys enable row level security;

-- Restrict helper execution to authenticated and service roles.
revoke all on function public.is_profile_owner(uuid) from public;
revoke all on function public.is_companion_owner(uuid) from public;
revoke all on function public.is_companion_caregiver(uuid) from public;
revoke all on function public.can_access_companion(uuid) from public;
revoke all on function public.can_care_for_companion(uuid) from public;

grant execute on function public.is_profile_owner(uuid) to authenticated, service_role;
grant execute on function public.is_companion_owner(uuid) to authenticated, service_role;
grant execute on function public.is_companion_caregiver(uuid) to authenticated, service_role;
grant execute on function public.can_access_companion(uuid) to authenticated, service_role;
grant execute on function public.can_care_for_companion(uuid) to authenticated, service_role;
