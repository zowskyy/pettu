import { supabase } from '@/lib/supabase';

export type CompanionState = {
  id: string;
  name: string;
  joy: number;
  energy: number;
  bond: number;
  xp: number;
  level: number;
  paw_points: number;
  mood: string;
  onboarding_complete: boolean;
  last_processed_period: string | null;
};

const COMPANION_COLUMNS =
  'id, name, joy, energy, bond, xp, level, paw_points, mood, onboarding_complete, last_processed_period';

/** Applies offline-safe daily decay via RPC, then returns authoritative companion state. */
export async function fetchCompanionState(companionId: string): Promise<CompanionState | null> {
  const { error: rpcError } = await supabase.rpc('process_companion_daily_state', {
    p_companion_id: companionId,
  });

  if (rpcError) {
    console.warn('[companionService] process_companion_daily_state failed:', rpcError.message);
    return null;
  }

  const { data, error } = await supabase
    .from('companions')
    .select(COMPANION_COLUMNS)
    .eq('id', companionId)
    .single();

  if (error) return null;
  return data as CompanionState;
}

export async function performCareAction(
  companionId: string,
  actionType: 'feed' | 'play' | 'groom' | 'rest',
  idempotencyKey: string,
) {
  return supabase.rpc('perform_care_action', {
    p_companion_id: companionId,
    p_action_type: actionType,
    p_idempotency_key: idempotencyKey,
  });
}

export async function getPrimaryCompanion(userId: string): Promise<CompanionState | null> {
  const { data, error } = await supabase
    .from('companions')
    .select('id')
    .eq('owner_id', userId)
    .eq('onboarding_complete', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return fetchCompanionState(data.id);
}
