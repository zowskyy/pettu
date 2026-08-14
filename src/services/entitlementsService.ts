import { supabase } from '@/lib/supabase';

/** Entitlement keys enforced server-side; client checks are advisory only. */
export type EntitlementKey =
  | 'can_upload_memory'
  | 'can_generate_companion'
  | 'can_generate_recap'
  | 'can_export_recap'
  | 'can_use_premium_cosmetics'
  | 'can_create_second_companion'
  | 'can_use_family_care';

export type EntitlementRow = {
  entitlement_key: EntitlementKey;
  granted: boolean;
  source: string;
  expires_at: string | null;
};

const DEFAULT_FREE: EntitlementKey[] = ['can_upload_memory', 'can_generate_companion'];

function isActive(row: EntitlementRow): boolean {
  if (!row.granted) return false;
  if (row.expires_at && new Date(row.expires_at) <= new Date()) return false;
  return true;
}

/** Always fetches fresh entitlements from the server — never trusts local cache for gating. */
export async function fetchEntitlements(): Promise<EntitlementRow[]> {
  const { data, error } = await supabase
    .from('entitlements')
    .select('entitlement_key, granted, source, expires_at');

  if (error) throw error;
  return (data ?? []) as EntitlementRow[];
}

async function hasEntitlement(key: EntitlementKey): Promise<boolean> {
  const rows = await fetchEntitlements();
  const match = rows.find((r) => r.entitlement_key === key);
  if (match) return isActive(match);
  return DEFAULT_FREE.includes(key);
}

export async function canUploadMemory(): Promise<boolean> {
  return hasEntitlement('can_upload_memory');
}

export async function canGenerateCompanion(): Promise<boolean> {
  return hasEntitlement('can_generate_companion');
}

export async function canGenerateRecap(): Promise<boolean> {
  return hasEntitlement('can_generate_recap');
}

export async function canExportRecap(): Promise<boolean> {
  return hasEntitlement('can_export_recap');
}

export async function canUsePremiumCosmetics(): Promise<boolean> {
  return hasEntitlement('can_use_premium_cosmetics');
}

export async function canCreateSecondCompanion(): Promise<boolean> {
  return hasEntitlement('can_create_second_companion');
}

export async function canUseFamilyCare(): Promise<boolean> {
  return hasEntitlement('can_use_family_care');
}

/** Run a gated action; throws if entitlement missing on fresh server check. */
export async function requireEntitlement(
  key: EntitlementKey,
  action: () => Promise<void>,
): Promise<void> {
  const allowed = await hasEntitlement(key);
  if (!allowed) {
    throw new Error(`ENTITLEMENT_REQUIRED:${key}`);
  }
  await action();
}
