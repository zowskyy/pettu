import { supabase } from '@/lib/supabase';
import { calculateMood } from '../../lib/companionEngine/mood';
import type { CareActionType, Mood } from '../../lib/companionEngine/types';
import { moodToDb } from '@/lib/moodMapping';

export type CompanionState = {
  id: string;
  name: string;
  nickname: string | null;
  species: string;
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

export interface CompanionView {
  companion: CompanionState;
  /** Mood derived from authoritative backend meters via companionEngine. */
  computedMood: Mood;
}

export interface CareActionResult {
  companion_id: string;
  joy: number;
  energy: number;
  bond: number;
  xp: number;
  level: number;
  action_type: CareActionType;
}

const COMPANION_COLUMNS =
  'id, name, nickname, species, joy, energy, bond, xp, level, paw_points, mood, onboarding_complete, last_processed_period';

function withComputedMood(companion: CompanionState): CompanionView {
  return {
    companion,
    computedMood: calculateMood({
      joy: companion.joy,
      energy: companion.energy,
      bond: companion.bond,
    }),
  };
}

/** Applies offline-safe daily decay via RPC, then returns authoritative companion state. */
export async function fetchCompanionState(
  companionId: string,
): Promise<CompanionState | null> {
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

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `care-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function performCareAction(
  companionId: string,
  actionType: CareActionType,
  idempotencyKey: string = createIdempotencyKey(),
): Promise<CareActionResult> {
  const { data, error } = await supabase.rpc('perform_care_action', {
    p_companion_id: companionId,
    p_action_type: actionType,
    p_idempotency_key: idempotencyKey,
  });

  if (error) throw error;

  return { ...(data as Omit<CareActionResult, 'action_type'>), action_type: actionType };
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

/** Fetch primary companion with engine-computed mood (Slice 20/21). */
export async function fetchActiveCompanion(userId: string): Promise<CompanionView | null> {
  const companion = await getPrimaryCompanion(userId);
  if (!companion) return null;
  return withComputedMood(companion);
}

/** Persist engine-computed mood to backend (display sync; meters remain authoritative). */
export async function syncCompanionMood(companionId: string, mood: Mood): Promise<void> {
  const { error } = await supabase
    .from('companions')
    .update({ mood: moodToDb(mood) })
    .eq('id', companionId);

  if (error) throw error;
}
