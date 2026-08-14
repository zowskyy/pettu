import { supabase } from '@/lib/supabase';

export async function deleteCompanion(
  companionId: string,
  nameConfirmation: string,
  idempotencyKey: string,
) {
  return supabase.rpc('delete_companion', {
    p_companion_id: companionId,
    p_name_confirmation: nameConfirmation,
    p_idempotency_key: idempotencyKey,
  });
}

export async function deleteAccount(idempotencyKey: string) {
  return supabase.rpc('delete_account', {
    p_idempotency_key: idempotencyKey,
  });
}
