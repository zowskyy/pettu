import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SHOP_CATALOG, type CatalogItem } from '@/features/shop/catalog';
import {
  listInventory,
  purchaseCatalogItem,
  equipCatalogItem,
  unequipCatalogItem,
  type InventoryItem,
} from '@/services/inventoryService';
import { getPrimaryCompanion, type CompanionState } from '@/services/companionService';
import { canUsePremiumCosmetics } from '@/services/entitlementsService';
import { trackEvent } from '@/services/analytics';
import { useAuthStore } from '@/stores/authStore';

function idempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function ShopScreen() {
  const userId = useAuthStore((s) => s.user?.id);

  const [companion, setCompanion] = useState<CompanionState | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [premiumAllowed, setPremiumAllowed] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const c = companion ?? (await getPrimaryCompanion(userId));
      if (c) setCompanion(c);
      if (c?.id) {
        const { data } = await listInventory(c.id);
        setInventory((data as InventoryItem[]) ?? []);
      }
      setPremiumAllowed(await canUsePremiumCosmetics());
      trackEvent('shop_viewed');
    } finally {
      setLoading(false);
    }
  }, [userId, companion]);

  useEffect(() => {
    load();
  }, [load]);

  const ownedIds = new Set(inventory.map((i) => i.catalog_item_id));
  const equippedIds = new Set(
    inventory.filter((i) => i.is_equipped).map((i) => i.catalog_item_id),
  );

  async function handleAcquire(item: CatalogItem) {
    if (!companion) {
      Alert.alert('No companion', 'Complete onboarding to use the shop.');
      return;
    }
    if (item.isPremium && !premiumAllowed) {
      Alert.alert('Premium required', 'Subscribe to unlock premium cosmetics.');
      return;
    }
    if (ownedIds.has(item.id)) return;

    setActing(item.id);
    try {
      const { data, error } = await purchaseCatalogItem(companion.id, item.id, idempotencyKey());
      if (error) {
        Alert.alert('Purchase failed', error.message);
        return;
      }
      if (item.pawPointsCost > 0) {
        trackEvent('item_purchased_with_paw_points', {
          catalog_item_id: item.id,
          paw_points_spent: item.pawPointsCost,
        });
      }
      const remaining =
        data && typeof data === 'object' && 'paw_points_remaining' in data
          ? (data as { paw_points_remaining: number }).paw_points_remaining
          : companion.paw_points;
      setCompanion({ ...companion, paw_points: remaining });
      await load();
    } finally {
      setActing(null);
    }
  }

  async function handleEquip(item: CatalogItem) {
    if (!companion || !ownedIds.has(item.id)) return;
    setActing(item.id);
    try {
      const { error } = await equipCatalogItem(companion.id, item.id);
      if (error) Alert.alert('Equip failed', error.message);
      else await load();
    } finally {
      setActing(null);
    }
  }

  async function handleUnequip(item: CatalogItem) {
    if (!companion) return;
    setActing(item.id);
    try {
      const { error } = await unequipCatalogItem(companion.id, item.category);
      if (error) Alert.alert('Unequip failed', error.message);
      else await load();
    } finally {
      setActing(null);
    }
  }

  function renderItem(item: CatalogItem) {
    const owned = ownedIds.has(item.id);
    const equipped = equippedIds.has(item.id);
    const busy = acting === item.id;

    return (
      <View key={item.id} style={styles.card}>
        <Text style={styles.emoji}>{item.previewEmoji}</Text>
        <View style={styles.cardBody}>
          <Text style={styles.itemName}>{item.displayName}</Text>
          <Text style={styles.itemDesc}>{item.description}</Text>
          <Text style={styles.itemMeta}>
            {item.isFree ? 'Free' : `${item.pawPointsCost} Paw Points`}
            {item.isPremium ? ' · Premium' : ''}
          </Text>
        </View>
        <View style={styles.actions}>
          {!owned && (
            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => handleAcquire(item)}
              disabled={busy}>
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>Get</Text>
              )}
            </Pressable>
          )}
          {owned && !equipped && (
            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => handleEquip(item)}
              disabled={busy}>
              <Text style={styles.btnText}>Equip</Text>
            </Pressable>
          )}
          {owned && equipped && (
            <Pressable
              style={[styles.btn, styles.btnSecondary]}
              onPress={() => handleUnequip(item)}
              disabled={busy}>
              <Text style={styles.btnTextSecondary}>Unequip</Text>
            </Pressable>
          )}
          {owned && !equipped && (
            <Text style={styles.ownedBadge}>Owned</Text>
          )}
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Shop</Text>
      {companion && (
        <Text style={styles.balance}>Paw Points: {companion.paw_points}</Text>
      )}
      <Text style={styles.section}>Accessories</Text>
      {SHOP_CATALOG.filter((i) => i.category === 'accessory').map(renderItem)}
      <Text style={styles.section}>Rooms</Text>
      {SHOP_CATALOG.filter((i) => i.category === 'room').map(renderItem)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  balance: { fontSize: 16, color: '#208AEF', marginBottom: 16, fontWeight: '600' },
  section: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 10,
    gap: 12,
  },
  emoji: { fontSize: 32 },
  cardBody: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600' },
  itemDesc: { fontSize: 13, color: '#666', marginTop: 2 },
  itemMeta: { fontSize: 12, color: '#208AEF', marginTop: 4 },
  actions: { alignItems: 'flex-end', gap: 4 },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, minWidth: 72, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#208AEF' },
  btnSecondary: { backgroundColor: '#eee' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  btnTextSecondary: { color: '#333', fontWeight: '600', fontSize: 14 },
  ownedBadge: { fontSize: 11, color: '#28a745', fontWeight: '600' },
});
