-- Pet Echo: perform_care_action RPC (Slice 10)
-- Server-side care action with 4-hour cooldown and idempotency

CREATE OR REPLACE FUNCTION perform_care_action(
  p_companion_id uuid,
  p_action_type text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_companion companions%ROWTYPE;
  v_last_action timestamptz;
  v_cooldown interval := interval '4 hours';
  v_joy_delta int;
  v_energy_delta int;
  v_bond_delta int;
  v_xp_delta int;
  v_existing jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT can_care_for_companion(p_companion_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Idempotency check
  SELECT response INTO v_existing
  FROM idempotency_keys
  WHERE key = p_idempotency_key AND user_id = v_user_id AND operation = 'care_action';

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Cooldown check (server-side, per action type)
  SELECT created_at INTO v_last_action
  FROM care_actions
  WHERE companion_id = p_companion_id AND action_type = p_action_type
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_action IS NOT NULL AND v_last_action > (now() - v_cooldown) THEN
    RAISE EXCEPTION 'Action on cooldown until %', v_last_action + v_cooldown;
  END IF;

  SELECT * INTO v_companion FROM companions WHERE id = p_companion_id FOR UPDATE;

  -- Apply deterministic deltas (matches companionEngine spec)
  CASE p_action_type
    WHEN 'feed' THEN v_joy_delta := 10; v_energy_delta := 5; v_bond_delta := 5; v_xp_delta := 8;
    WHEN 'play' THEN v_joy_delta := 15; v_energy_delta := -10; v_bond_delta := 8; v_xp_delta := 10;
    WHEN 'groom' THEN v_joy_delta := 8; v_energy_delta := 0; v_bond_delta := 3; v_xp_delta := 6;
    WHEN 'rest' THEN v_joy_delta := 0; v_energy_delta := 15; v_bond_delta := 4; v_xp_delta := 6;
    ELSE RAISE EXCEPTION 'Invalid action type: %', p_action_type;
  END CASE;

  UPDATE companions SET
    joy = LEAST(100, GREATEST(0, joy + v_joy_delta)),
    energy = LEAST(100, GREATEST(0, energy + v_energy_delta)),
    bond = LEAST(100, GREATEST(0, bond + v_bond_delta)),
    xp = xp + v_xp_delta,
    level = GREATEST(1, (xp + v_xp_delta) / 100 + 1),
    updated_at = now()
  WHERE id = p_companion_id
  RETURNING * INTO v_companion;

  INSERT INTO care_actions (companion_id, performed_by, action_type, joy_delta, energy_delta, bond_delta, xp_delta, idempotency_key)
  VALUES (p_companion_id, v_user_id, p_action_type, v_joy_delta, v_energy_delta, v_bond_delta, v_xp_delta, p_idempotency_key);

  v_existing := jsonb_build_object(
    'companion_id', v_companion.id,
    'joy', v_companion.joy,
    'energy', v_companion.energy,
    'bond', v_companion.bond,
    'xp', v_companion.xp,
    'level', v_companion.level,
    'action_type', p_action_type
  );

  INSERT INTO idempotency_keys (key, user_id, operation, response)
  VALUES (p_idempotency_key, v_user_id, 'care_action', v_existing);

  RETURN v_existing;
END;
$$;

GRANT EXECUTE ON FUNCTION perform_care_action TO authenticated;
