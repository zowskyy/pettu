-- Pet Echo — Slice 11: Daily decay processing (4 AM local, offline-safe)

CREATE OR REPLACE FUNCTION public.get_local_period_key(
  p_timezone text,
  p_at timestamptz DEFAULT now()
)
RETURNS date
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_local timestamp;
  v_hour int;
BEGIN
  v_local := p_at AT TIME ZONE COALESCE(NULLIF(trim(p_timezone), ''), 'UTC');
  v_hour := EXTRACT(HOUR FROM v_local)::int;

  IF v_hour < 4 THEN
    RETURN (v_local::date - 1);
  END IF;

  RETURN v_local::date;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_companion_daily_state(p_companion_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_companion public.companions%ROWTYPE;
  v_timezone text;
  v_current_period date;
  v_missed int;
  v_i int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.can_access_companion(p_companion_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT c.* INTO v_companion
  FROM public.companions c
  WHERE c.id = p_companion_id
    AND c.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Companion not found';
  END IF;

  SELECT p.timezone INTO v_timezone
  FROM public.profiles p
  WHERE p.id = v_companion.owner_id;

  v_timezone := COALESCE(NULLIF(trim(v_timezone), ''), 'UTC');
  v_current_period := public.get_local_period_key(v_timezone);

  IF v_companion.last_processed_period IS NULL THEN
    UPDATE public.companions
    SET
      last_processed_period = v_current_period,
      updated_at = timezone('utc', now())
    WHERE id = p_companion_id;

    RETURN jsonb_build_object(
      'companion_id', p_companion_id,
      'periods_applied', 0,
      'last_processed_period', v_current_period
    );
  END IF;

  v_missed := v_current_period - v_companion.last_processed_period;

  IF v_missed <= 0 THEN
    RETURN jsonb_build_object(
      'companion_id', p_companion_id,
      'periods_applied', 0,
      'last_processed_period', v_companion.last_processed_period
    );
  END IF;

  FOR v_i IN 1..v_missed LOOP
    UPDATE public.companions
    SET
      joy = GREATEST(25, joy - 8),
      energy = GREATEST(25, energy - 5),
      updated_at = timezone('utc', now())
    WHERE id = p_companion_id
    RETURNING * INTO v_companion;
  END LOOP;

  UPDATE public.companions
  SET
    last_processed_period = v_current_period,
    updated_at = timezone('utc', now())
  WHERE id = p_companion_id
  RETURNING * INTO v_companion;

  RETURN jsonb_build_object(
    'companion_id', v_companion.id,
    'joy', v_companion.joy,
    'energy', v_companion.energy,
    'bond', v_companion.bond,
    'periods_applied', v_missed,
    'last_processed_period', v_current_period
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_local_period_key(text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_companion_daily_state(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_local_period_key(text, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_companion_daily_state(uuid) TO authenticated, service_role;
