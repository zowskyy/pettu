import { supabase } from '@/lib/supabase';
import { canUseFamilyCare } from '@/services/entitlementsService';

export type CompanionMember = {
  id: string;
  user_id: string;
  role: 'owner' | 'caregiver';
  status: 'pending' | 'accepted' | 'revoked';
  invite_email: string | null;
  invited_at: string;
  accepted_at: string | null;
};

export async function inviteCaregiver(
  companionId: string,
  email: string,
  idempotencyKey: string,
) {
  const allowed = await canUseFamilyCare();
  if (!allowed) {
    throw new Error('ENTITLEMENT_REQUIRED:can_use_family_care');
  }

  return supabase.rpc('invite_caregiver', {
    p_companion_id: companionId,
    p_email: email,
    p_idempotency_key: idempotencyKey,
  });
}

export async function acceptCaregiverInvite(invitationId: string) {
  return supabase.rpc('accept_caregiver_invite', {
    p_invitation_id: invitationId,
  });
}

export async function revokeCaregiver(companionId: string, memberId: string) {
  return supabase.rpc('revoke_caregiver', {
    p_companion_id: companionId,
    p_member_id: memberId,
  });
}

export async function listCompanionMembers(companionId: string): Promise<CompanionMember[]> {
  const { data, error } = await supabase.rpc('list_companion_members', {
    p_companion_id: companionId,
  });

  if (error) throw error;
  return (data ?? []) as CompanionMember[];
}
