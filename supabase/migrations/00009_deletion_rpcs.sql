-- Slice 32: Deep deletion RPCs
-- Slice 29: Companion members (Family Care) RPCs

-- ---------------------------------------------------------------------------
-- Family Care RPCs (Slice 29)
-- ---------------------------------------------------------------------------

create or replace function public.invite_caregiver(
  p_companion_id uuid,
  p_email text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_idempotency_id uuid;
  v_existing jsonb;
  v_member_id uuid;
  v_invitee_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_companion_owner(p_companion_id) then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1 from public.entitlements
    where profile_id = v_user_id
      and entitlement_key = 'can_use_family_care'
      and granted = true
      and (expires_at is null or expires_at > now())
  ) then
    raise exception 'ENTITLEMENT_REQUIRED';
  end if;

  select response_snapshot into v_existing
  from public.idempotency_keys
  where profile_id = v_user_id
    and scope = 'caregiver_invitation'
    and key = p_idempotency_key
    and status = 'completed';

  if v_existing is not null then
    return v_existing;
  end if;

  select id into v_invitee_id from auth.users where email = lower(trim(p_email)) limit 1;

  if v_invitee_id is null then
    raise exception 'Invitee must have a Pet Echo account';
  end if;

  if v_invitee_id = v_user_id then
    raise exception 'Cannot invite yourself';
  end if;

  insert into public.idempotency_keys (key, scope, profile_id, status, expires_at)
  values (p_idempotency_key, 'caregiver_invitation', v_user_id, 'pending', now() + interval '7 days')
  on conflict (profile_id, scope, key) do update set key = excluded.key
  returning id into v_idempotency_id;

  insert into public.companion_members (
    companion_id, user_id, role, status, invited_by, invite_email
  )
  values (
    p_companion_id,
    v_invitee_id,
    'caregiver',
    'pending',
    v_user_id,
    lower(trim(p_email))
  )
  on conflict (companion_id, user_id) do update set
    status = 'pending',
    invite_email = excluded.invite_email,
    invited_at = timezone('utc', now()),
    revoked_at = null
  returning id into v_member_id;

  v_existing := jsonb_build_object(
    'invitation_id', v_member_id,
    'companion_id', p_companion_id,
    'email', lower(trim(p_email)),
    'status', 'pending'
  );

  update public.idempotency_keys set
    status = 'completed',
    response_snapshot = v_existing,
    completed_at = timezone('utc', now())
  where id = v_idempotency_id;

  insert into public.audit_events (profile_id, companion_id, actor_id, event_type, metadata)
  values (v_user_id, p_companion_id, v_user_id, 'caregiver_invited', v_existing);

  return v_existing;
end;
$$;

create or replace function public.accept_caregiver_invite(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_member public.companion_members%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_member
  from public.companion_members
  where id = p_invitation_id
    and status = 'pending'
  for update;

  if v_member.id is null then
    raise exception 'Invitation not found or already processed';
  end if;

  if v_member.user_id <> v_user_id then
    if not exists (
      select 1 from auth.users
      where id = v_user_id and email = v_member.invite_email
    ) then
      raise exception 'Not authorized';
    end if;
  end if;

  update public.companion_members
  set user_id = v_user_id,
      status = 'accepted',
      accepted_at = timezone('utc', now())
  where id = p_invitation_id;

  insert into public.audit_events (profile_id, companion_id, actor_id, event_type, metadata)
  values (
    (select owner_id from public.companions where id = v_member.companion_id),
    v_member.companion_id,
    v_user_id,
    'caregiver_accepted',
    jsonb_build_object('invitation_id', p_invitation_id)
  );

  return jsonb_build_object(
    'invitation_id', p_invitation_id,
    'companion_id', v_member.companion_id,
    'status', 'accepted'
  );
end;
$$;

create or replace function public.revoke_caregiver(
  p_companion_id uuid,
  p_member_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_companion_owner(p_companion_id) then
    raise exception 'Not authorized';
  end if;

  update public.companion_members
  set status = 'revoked', revoked_at = timezone('utc', now())
  where id = p_member_id
    and companion_id = p_companion_id
    and role = 'caregiver';

  if not found then
    raise exception 'Member not found';
  end if;

  return jsonb_build_object('member_id', p_member_id, 'status', 'revoked');
end;
$$;

create or replace function public.list_companion_members(p_companion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_companion_owner(p_companion_id)
     and not exists (
       select 1 from public.companion_members
       where companion_id = p_companion_id and user_id = v_user_id and status = 'accepted'
     ) then
    raise exception 'Not authorized';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', cm.id,
          'user_id', cm.user_id,
          'role', cm.role,
          'status', cm.status,
          'invite_email', cm.invite_email,
          'invited_at', cm.invited_at,
          'accepted_at', cm.accepted_at
        )
        order by cm.created_at
      )
      from public.companion_members cm
      where cm.companion_id = p_companion_id
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.invite_caregiver(uuid, text, text) from public;
revoke all on function public.accept_caregiver_invite(uuid) from public;
revoke all on function public.revoke_caregiver(uuid, uuid) from public;
revoke all on function public.list_companion_members(uuid) from public;

grant execute on function public.invite_caregiver(uuid, text, text) to authenticated;
grant execute on function public.accept_caregiver_invite(uuid) to authenticated;
grant execute on function public.revoke_caregiver(uuid, uuid) to authenticated;
grant execute on function public.list_companion_members(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Companion deletion (owner only)
-- ---------------------------------------------------------------------------

create or replace function public.delete_companion(
  p_companion_id uuid,
  p_name_confirmation text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_companion public.companions%rowtype;
  v_idempotency_id uuid;
  v_existing jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_companion_owner(p_companion_id) then
    raise exception 'Not authorized';
  end if;

  select response_snapshot into v_existing
  from public.idempotency_keys
  where profile_id = v_user_id
    and scope = 'delete'
    and key = p_idempotency_key
    and status = 'completed';

  if v_existing is not null then
    return v_existing;
  end if;

  select * into v_companion from public.companions where id = p_companion_id for update;

  if v_companion.deleted_at is not null then
    raise exception 'Companion already deleted';
  end if;

  if trim(p_name_confirmation) <> v_companion.name then
    raise exception 'Name confirmation does not match';
  end if;

  insert into public.idempotency_keys (key, scope, profile_id, status, expires_at)
  values (p_idempotency_key, 'delete', v_user_id, 'pending', now() + interval '24 hours')
  on conflict (profile_id, scope, key) do update set key = excluded.key
  returning id into v_idempotency_id;

  -- Cancel in-flight generation jobs
  update public.generation_jobs
  set status = 'cancelled', updated_at = timezone('utc', now())
  where companion_id = p_companion_id
    and status in ('queued', 'processing');

  -- Soft-delete memories
  update public.memories set deleted_at = timezone('utc', now()) where companion_id = p_companion_id;

  -- Remove inventory tied to companion
  update public.inventory_items
  set companion_id = null, is_equipped = false, equipped_slot = null
  where companion_id = p_companion_id;

  -- Revoke memberships
  update public.companion_members
  set status = 'revoked', revoked_at = timezone('utc', now())
  where companion_id = p_companion_id;

  -- Mark companion deleted (storage cleanup via edge function / cron)
  update public.companions
  set deleted_at = timezone('utc', now()),
      equipped_accessory_catalog_id = null,
      equipped_room_catalog_id = null,
      generated_image_bucket = null,
      generated_image_path = null
  where id = p_companion_id;

  insert into public.audit_events (profile_id, companion_id, actor_id, event_type, metadata)
  values (v_user_id, p_companion_id, v_user_id, 'companion_deleted', jsonb_build_object('name', v_companion.name));

  v_existing := jsonb_build_object('companion_id', p_companion_id, 'deleted', true);

  update public.idempotency_keys set
    status = 'completed',
    response_snapshot = v_existing,
    completed_at = timezone('utc', now())
  where id = v_idempotency_id;

  return v_existing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Account deletion (owner only, cascades companions)
-- ---------------------------------------------------------------------------

create or replace function public.delete_account(p_idempotency_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_idempotency_id uuid;
  v_existing jsonb;
  v_companion record;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select response_snapshot into v_existing
  from public.idempotency_keys
  where profile_id = v_user_id
    and scope = 'delete'
    and key = p_idempotency_key
    and status = 'completed';

  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.idempotency_keys (key, scope, profile_id, status, expires_at)
  values (p_idempotency_key, 'delete', v_user_id, 'pending', now() + interval '24 hours')
  on conflict (profile_id, scope, key) do update set key = excluded.key
  returning id into v_idempotency_id;

  -- Cancel subscriptions (provider cancellation handled by webhook)
  update public.subscriptions
  set status = 'canceled', canceled_at = timezone('utc', now())
  where profile_id = v_user_id and status in ('trialing', 'active', 'past_due');

  -- Revoke entitlements
  update public.entitlements set granted = false where profile_id = v_user_id;

  -- Delete each owned companion
  for v_companion in
    select id, name from public.companions where owner_id = v_user_id and deleted_at is null
  loop
    perform public.delete_companion(
      v_companion.id,
      v_companion.name,
      p_idempotency_key || ':' || v_companion.id::text
    );
  end loop;

  insert into public.audit_events (profile_id, actor_id, event_type, metadata)
  values (v_user_id, v_user_id, 'account_deletion_requested', jsonb_build_object('profile_id', v_user_id));

  v_existing := jsonb_build_object('profile_id', v_user_id, 'deleted', true);

  update public.idempotency_keys set
    status = 'completed',
    response_snapshot = v_existing,
    completed_at = timezone('utc', now())
  where id = v_idempotency_id;

  -- Profile row cascades from auth.users deletion (triggered by client signOut + admin API)
  return v_existing;
end;
$$;

revoke all on function public.delete_companion(uuid, text, text) from public;
revoke all on function public.delete_account(text) from public;

grant execute on function public.delete_companion(uuid, text, text) to authenticated;
grant execute on function public.delete_account(text) to authenticated;
