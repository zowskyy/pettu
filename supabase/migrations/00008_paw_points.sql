-- Slice 25: Server-side Paw Points (10/daily care, 5/memory, 15 daily max)

-- ---------------------------------------------------------------------------
-- Ledger for daily cap enforcement
-- ---------------------------------------------------------------------------

create table public.paw_points_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  companion_id uuid references public.companions (id) on delete set null,
  source text not null check (source in ('daily_care', 'memory')),
  amount smallint not null check (amount > 0),
  period_date date not null,
  reference_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index paw_points_ledger_profile_period_idx
  on public.paw_points_ledger (profile_id, period_date);

alter table public.paw_points_ledger enable row level security;

create policy paw_points_ledger_select on public.paw_points_ledger
  for select using (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Guard: reject client-side paw_points mutations on companions
-- ---------------------------------------------------------------------------

create or replace function public.guard_companion_paw_points()
returns trigger
language plpgsql
as $$
begin
  if new.paw_points is distinct from old.paw_points then
    if coalesce(current_setting('pet_echo.paw_points_update', true), '') <> 'allowed' then
      raise exception 'paw_points are server-calculated and cannot be modified directly';
    end if;
  end if;
  return new;
end;
$$;

create trigger companions_guard_paw_points
before update on public.companions
for each row execute function public.guard_companion_paw_points();

-- ---------------------------------------------------------------------------
-- Internal award helper (daily max 15)
-- ---------------------------------------------------------------------------

create or replace function public.award_paw_points_internal(
  p_profile_id uuid,
  p_companion_id uuid,
  p_amount smallint,
  p_source text,
  p_reference_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timezone text;
  v_period date;
  v_earned_today int;
  v_to_award smallint;
  v_new_balance int;
begin
  if p_amount <= 0 then
    return jsonb_build_object('awarded', 0, 'paw_points', 0, 'daily_cap_reached', false);
  end if;

  select timezone into v_timezone from public.profiles where id = p_profile_id;
  v_period := public.get_local_period_key(coalesce(v_timezone, 'UTC'));

  select coalesce(sum(amount), 0)::int into v_earned_today
  from public.paw_points_ledger
  where profile_id = p_profile_id
    and period_date = v_period;

  v_to_award := least(p_amount, greatest(0, 15 - v_earned_today)::smallint);

  if v_to_award <= 0 then
    select paw_points into v_new_balance from public.companions where id = p_companion_id;
    return jsonb_build_object(
      'awarded', 0,
      'paw_points', coalesce(v_new_balance, 0),
      'daily_cap_reached', true
    );
  end if;

  insert into public.paw_points_ledger (
    profile_id, companion_id, source, amount, period_date, reference_id
  )
  values (
    p_profile_id, p_companion_id, p_source, v_to_award, v_period, p_reference_id
  );

  perform set_config('pet_echo.paw_points_update', 'allowed', true);

  update public.companions
  set paw_points = paw_points + v_to_award,
      updated_at = timezone('utc', now())
  where id = p_companion_id
  returning paw_points into v_new_balance;

  perform set_config('pet_echo.paw_points_update', '', true);

  return jsonb_build_object(
    'awarded', v_to_award,
    'paw_points', v_new_balance,
    'daily_cap_reached', (v_earned_today + v_to_award) >= 15
  );
end;
$$;

revoke all on function public.award_paw_points_internal(uuid, uuid, smallint, text, uuid) from public;
grant execute on function public.award_paw_points_internal(uuid, uuid, smallint, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Award daily care completion (10 points, once per period)
-- ---------------------------------------------------------------------------

create or replace function public.award_daily_care_paw_points(p_companion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_companion public.companions%rowtype;
  v_timezone text;
  v_period date;
  v_actions int;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_care_for_companion(p_companion_id) then
    raise exception 'Not authorized';
  end if;

  select * into v_companion from public.companions where id = p_companion_id for update;
  select timezone into v_timezone from public.profiles where id = v_companion.owner_id;
  v_period := public.get_local_period_key(coalesce(v_timezone, 'UTC'));

  if v_companion.daily_care_completed_on = v_period then
    return jsonb_build_object(
      'awarded', 0,
      'paw_points', v_companion.paw_points,
      'already_awarded', true
    );
  end if;

  select count(distinct action_type)::int into v_actions
  from public.care_actions
  where companion_id = p_companion_id
    and created_at >= (v_period::timestamp at time zone coalesce(v_timezone, 'UTC'))
    and created_at < ((v_period + 1)::timestamp at time zone coalesce(v_timezone, 'UTC'));

  if v_actions < 4 then
    return jsonb_build_object(
      'awarded', 0,
      'paw_points', v_companion.paw_points,
      'daily_care_complete', false
    );
  end if;

  update public.companions
  set daily_care_completed_on = v_period
  where id = p_companion_id;

  v_result := public.award_paw_points_internal(
    v_companion.owner_id, p_companion_id, 10, 'daily_care', p_companion_id
  );

  return v_result || jsonb_build_object('daily_care_complete', true);
end;
$$;

revoke all on function public.award_daily_care_paw_points(uuid) from public;
grant execute on function public.award_daily_care_paw_points(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Award memory creation (5 points)
-- ---------------------------------------------------------------------------

create or replace function public.award_memory_paw_points(p_memory_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_memory public.memories%rowtype;
  v_companion public.companions%rowtype;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_memory from public.memories where id = p_memory_id and deleted_at is null;
  if v_memory.id is null then
    raise exception 'Memory not found';
  end if;

  if not public.can_access_companion(v_memory.companion_id) then
    raise exception 'Not authorized';
  end if;

  select * into v_companion from public.companions where id = v_memory.companion_id;

  v_result := public.award_paw_points_internal(
    v_companion.owner_id, v_memory.companion_id, 5, 'memory', p_memory_id
  );

  return v_result;
end;
$$;

revoke all on function public.award_memory_paw_points(uuid) from public;
grant execute on function public.award_memory_paw_points(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Read daily paw points status
-- ---------------------------------------------------------------------------

create or replace function public.get_paw_points_daily_status(p_companion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_companion public.companions%rowtype;
  v_timezone text;
  v_period date;
  v_earned_today int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_access_companion(p_companion_id) then
    raise exception 'Not authorized';
  end if;

  select * into v_companion from public.companions where id = p_companion_id;
  select timezone into v_timezone from public.profiles where id = v_companion.owner_id;
  v_period := public.get_local_period_key(coalesce(v_timezone, 'UTC'));

  select coalesce(sum(amount), 0)::int into v_earned_today
  from public.paw_points_ledger
  where profile_id = v_companion.owner_id
    and period_date = v_period;

  return jsonb_build_object(
    'paw_points', v_companion.paw_points,
    'earned_today', v_earned_today,
    'remaining_today', greatest(0, 15 - v_earned_today),
    'daily_cap', 15,
    'period_date', v_period
  );
end;
$$;

revoke all on function public.get_paw_points_daily_status(uuid) from public;
grant execute on function public.get_paw_points_daily_status(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Inventory RPCs (Slice 26)
-- ---------------------------------------------------------------------------

create or replace function public.purchase_catalog_item(
  p_companion_id uuid,
  p_catalog_item_id text,
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
  v_price int;
  v_category public.inventory_item_category;
  v_display_name text;
  v_idempotency_id uuid;
  v_existing jsonb;
  v_inventory_id uuid;
  v_new_balance int;
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
    and scope = 'purchase'
    and key = p_idempotency_key
    and status = 'completed';

  if v_existing is not null then
    return v_existing;
  end if;

  -- Catalog pricing (free items cost 0; premium items require entitlement)
  case p_catalog_item_id
    when 'blue_bandana' then v_price := 0; v_category := 'accessory'; v_display_name := 'Blue Bandana';
    when 'yellow_raincoat' then v_price := 0; v_category := 'accessory'; v_display_name := 'Yellow Raincoat';
    when 'red_bow_tie' then v_price := 0; v_category := 'accessory'; v_display_name := 'Red Bow Tie';
    when 'plant_filled_room' then v_price := 0; v_category := 'room'; v_display_name := 'Plant-Filled Room';
    when 'starry_night_room' then v_price := 0; v_category := 'room'; v_display_name := 'Starry Night Room';
    when 'beach_room' then v_price := 0; v_category := 'room'; v_display_name := 'Beach Room';
    when 'golden_crown' then v_price := 50; v_category := 'accessory'; v_display_name := 'Golden Crown';
    when 'castle_room' then v_price := 75; v_category := 'room'; v_display_name := 'Castle Room';
    else raise exception 'Unknown catalog item: %', p_catalog_item_id;
  end case;

  if p_catalog_item_id in ('golden_crown', 'castle_room') then
    if not exists (
      select 1 from public.entitlements
      where profile_id = v_user_id
        and entitlement_key = 'can_use_premium_cosmetics'
        and granted = true
        and (expires_at is null or expires_at > now())
    ) then
      raise exception 'PREMIUM_REQUIRED';
    end if;
  end if;

  if exists (
    select 1 from public.inventory_items
    where profile_id = v_user_id and catalog_item_id = p_catalog_item_id
  ) then
    raise exception 'ALREADY_OWNED';
  end if;

  select * into v_companion from public.companions where id = p_companion_id for update;

  if v_price > 0 and v_companion.paw_points < v_price then
    raise exception 'INSUFFICIENT_POINTS';
  end if;

  insert into public.idempotency_keys (key, scope, profile_id, status, expires_at)
  values (p_idempotency_key, 'purchase', v_user_id, 'pending', now() + interval '24 hours')
  on conflict (profile_id, scope, key) do update set key = excluded.key
  returning id into v_idempotency_id;

  if v_price > 0 then
    perform set_config('pet_echo.paw_points_update', 'allowed', true);
    update public.companions
    set paw_points = paw_points - v_price
    where id = p_companion_id
    returning paw_points into v_new_balance;
    perform set_config('pet_echo.paw_points_update', '', true);
  else
    v_new_balance := v_companion.paw_points;
  end if;

  insert into public.inventory_items (
    profile_id, companion_id, catalog_item_id, category, display_name,
    acquired_via, paw_points_spent
  )
  values (
    v_user_id, p_companion_id, p_catalog_item_id, v_category, v_display_name,
    case when v_price > 0 then 'paw_points'::public.inventory_acquired_via else 'free'::public.inventory_acquired_via end,
    v_price
  )
  returning id into v_inventory_id;

  v_existing := jsonb_build_object(
    'inventory_item_id', v_inventory_id,
    'catalog_item_id', p_catalog_item_id,
    'paw_points_remaining', v_new_balance
  );

  update public.idempotency_keys set
    status = 'completed',
    response_snapshot = v_existing,
    completed_at = timezone('utc', now())
  where id = v_idempotency_id;

  return v_existing;
end;
$$;

create or replace function public.equip_catalog_item(
  p_companion_id uuid,
  p_catalog_item_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item public.inventory_items%rowtype;
  v_slot text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_companion_owner(p_companion_id) then
    raise exception 'Not authorized';
  end if;

  select * into v_item
  from public.inventory_items
  where profile_id = v_user_id and catalog_item_id = p_catalog_item_id;

  if v_item.id is null then
    raise exception 'NOT_OWNED';
  end if;

  v_slot := case v_item.category when 'accessory' then 'accessory' else 'room' end;

  update public.inventory_items
  set is_equipped = false, equipped_slot = null, companion_id = null
  where profile_id = v_user_id
    and category = v_item.category
    and is_equipped = true;

  update public.inventory_items
  set is_equipped = true,
      equipped_slot = v_slot,
      companion_id = p_companion_id
  where id = v_item.id;

  if v_item.category = 'accessory' then
    update public.companions
    set equipped_accessory_catalog_id = p_catalog_item_id
    where id = p_companion_id;
  else
    update public.companions
    set equipped_room_catalog_id = p_catalog_item_id
    where id = p_companion_id;
  end if;

  return jsonb_build_object(
    'companion_id', p_companion_id,
    'catalog_item_id', p_catalog_item_id,
    'slot', v_slot,
    'equipped', true
  );
end;
$$;

create or replace function public.unequip_catalog_item(
  p_companion_id uuid,
  p_slot text
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

  if p_slot not in ('accessory', 'room') then
    raise exception 'Invalid slot: %', p_slot;
  end if;

  update public.inventory_items
  set is_equipped = false, equipped_slot = null, companion_id = null
  where profile_id = v_user_id
    and companion_id = p_companion_id
    and equipped_slot = p_slot
    and is_equipped = true;

  if p_slot = 'accessory' then
    update public.companions set equipped_accessory_catalog_id = null where id = p_companion_id;
  else
    update public.companions set equipped_room_catalog_id = null where id = p_companion_id;
  end if;

  return jsonb_build_object('companion_id', p_companion_id, 'slot', p_slot, 'equipped', false);
end;
$$;

create or replace function public.list_inventory(p_companion_id uuid default null)
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

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', i.id,
          'catalog_item_id', i.catalog_item_id,
          'category', i.category,
          'display_name', i.display_name,
          'is_equipped', i.is_equipped,
          'equipped_slot', i.equipped_slot,
          'acquired_via', i.acquired_via,
          'paw_points_spent', i.paw_points_spent
        )
        order by i.acquired_at desc
      )
      from public.inventory_items i
      where i.profile_id = v_user_id
        and (p_companion_id is null or i.companion_id is null or i.companion_id = p_companion_id)
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.purchase_catalog_item(uuid, text, text) from public;
revoke all on function public.equip_catalog_item(uuid, text) from public;
revoke all on function public.unequip_catalog_item(uuid, text) from public;
revoke all on function public.list_inventory(uuid) from public;

grant execute on function public.purchase_catalog_item(uuid, text, text) to authenticated;
grant execute on function public.equip_catalog_item(uuid, text) to authenticated;
grant execute on function public.unequip_catalog_item(uuid, text) to authenticated;
grant execute on function public.list_inventory(uuid) to authenticated;
