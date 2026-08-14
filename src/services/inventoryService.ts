import { supabase } from '@/lib/supabase';

export type InventoryItem = {
  id: string;
  catalog_item_id: string;
  category: 'accessory' | 'room';
  display_name: string;
  is_equipped: boolean;
  equipped_slot: string | null;
  acquired_via: string;
  paw_points_spent: number;
};

export async function listInventory(companionId?: string) {
  return supabase.rpc('list_inventory', { p_companion_id: companionId ?? null });
}

export async function purchaseCatalogItem(
  companionId: string,
  catalogItemId: string,
  idempotencyKey: string,
) {
  return supabase.rpc('purchase_catalog_item', {
    p_companion_id: companionId,
    p_catalog_item_id: catalogItemId,
    p_idempotency_key: idempotencyKey,
  });
}

export async function equipCatalogItem(companionId: string, catalogItemId: string) {
  return supabase.rpc('equip_catalog_item', {
    p_companion_id: companionId,
    p_catalog_item_id: catalogItemId,
  });
}

export async function unequipCatalogItem(companionId: string, slot: 'accessory' | 'room') {
  return supabase.rpc('unequip_catalog_item', {
    p_companion_id: companionId,
    p_slot: slot,
  });
}

export async function getPawPointsDailyStatus(companionId: string) {
  return supabase.rpc('get_paw_points_daily_status', { p_companion_id: companionId });
}
