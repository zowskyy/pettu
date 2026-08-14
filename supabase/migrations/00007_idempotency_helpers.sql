-- Pet Echo — Slice 12: Reusable idempotency helper + stub RPCs

CREATE OR REPLACE FUNCTION public.check_idempotency(
  p_scope public.idempotency_scope,
  p_key text,
  p_profile_id uuid,
  p_expires_in interval DEFAULT interval '24 hours'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.idempotency_keys%ROWTYPE;
  v_id uuid;
BEGIN
  IF p_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile id required';
  END IF;

  IF p_key IS NULL OR length(trim(p_key)) = 0 THEN
    RAISE EXCEPTION 'Idempotency key required';
  END IF;

  SELECT * INTO v_existing
  FROM public.idempotency_keys
  WHERE profile_id = p_profile_id
    AND scope = p_scope
    AND key = p_key;

  IF FOUND
    AND v_existing.status = 'completed'
    AND v_existing.response_snapshot IS NOT NULL THEN
    RETURN jsonb_build_object(
      'replay', true,
      'idempotency_key_id', v_existing.id,
      'response', v_existing.response_snapshot
    );
  END IF;

  INSERT INTO public.idempotency_keys (key, scope, profile_id, status, expires_at)
  VALUES (p_key, p_scope, p_profile_id, 'pending', now() + p_expires_in)
  ON CONFLICT (profile_id, scope, key) DO UPDATE
    SET key = excluded.key
  RETURNING id INTO v_id;

  SELECT response_snapshot INTO v_existing.response_snapshot
  FROM public.idempotency_keys
  WHERE id = v_id
    AND status = 'completed';

  IF v_existing.response_snapshot IS NOT NULL THEN
    RETURN jsonb_build_object(
      'replay', true,
      'idempotency_key_id', v_id,
      'response', v_existing.response_snapshot
    );
  END IF;

  RETURN jsonb_build_object(
    'replay', false,
    'idempotency_key_id', v_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_memory(
  p_companion_id uuid,
  p_title text,
  p_memory_date date,
  p_idempotency_key text,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_check jsonb;
  v_idempotency_id uuid;
  v_memory_id uuid;
  v_response jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.can_access_companion(p_companion_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_check := public.check_idempotency('memory_creation', p_idempotency_key, v_user_id);

  IF COALESCE((v_check->>'replay')::boolean, false) THEN
    RETURN v_check->'response';
  END IF;

  v_idempotency_id := (v_check->>'idempotency_key_id')::uuid;

  INSERT INTO public.memories (companion_id, created_by, title, note, memory_date)
  VALUES (p_companion_id, v_user_id, p_title, p_note, p_memory_date)
  RETURNING id INTO v_memory_id;

  v_response := jsonb_build_object(
    'memory_id', v_memory_id,
    'companion_id', p_companion_id,
    'title', p_title,
    'memory_date', p_memory_date
  );

  UPDATE public.idempotency_keys
  SET
    status = 'completed',
    response_snapshot = v_response,
    resource_type = 'memory',
    resource_id = v_memory_id,
    completed_at = timezone('utc', now())
  WHERE id = v_idempotency_id;

  RETURN v_response;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_generation(
  p_companion_id uuid,
  p_job_type public.generation_job_type,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_check jsonb;
  v_idempotency_id uuid;
  v_job_id uuid;
  v_response jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.can_access_companion(p_companion_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_check := public.check_idempotency('generation_request', p_idempotency_key, v_user_id);

  IF COALESCE((v_check->>'replay')::boolean, false) THEN
    RETURN v_check->'response';
  END IF;

  v_idempotency_id := (v_check->>'idempotency_key_id')::uuid;

  INSERT INTO public.generation_jobs (companion_id, profile_id, job_type, status)
  VALUES (p_companion_id, v_user_id, p_job_type, 'queued')
  RETURNING id INTO v_job_id;

  v_response := jsonb_build_object(
    'generation_job_id', v_job_id,
    'companion_id', p_companion_id,
    'job_type', p_job_type,
    'status', 'queued'
  );

  UPDATE public.idempotency_keys
  SET
    status = 'completed',
    response_snapshot = v_response,
    resource_type = 'generation_job',
    resource_id = v_job_id,
    completed_at = timezone('utc', now())
  WHERE id = v_idempotency_id;

  RETURN v_response;
END;
$$;

REVOKE ALL ON FUNCTION public.check_idempotency(public.idempotency_scope, text, uuid, interval) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_memory(uuid, text, date, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_generation(uuid, public.generation_job_type, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.check_idempotency(public.idempotency_scope, text, uuid, interval) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_memory(uuid, text, date, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_generation(uuid, public.generation_job_type, text) TO authenticated;
