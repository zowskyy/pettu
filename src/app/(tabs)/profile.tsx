import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { signOut } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { getPrimaryCompanion, type CompanionState } from '@/services/companionService';
import {
  fetchNotificationPreferences,
  upsertNotificationPreferences,
  requestNotificationPermission,
  type NotificationPreferences,
} from '@/services/notificationsService';
import { fetchPlayProducts, initPlayBilling } from '@/services/payments/playBilling';
import { deleteAccount, deleteCompanion } from '@/services/deletionService';
import { trackEvent, resetAnalytics } from '@/services/analytics';

function idempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function SettingsRow({
  label,
  value,
  onPress,
  danger,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}>
      <Text style={[styles.rowLabel, danger && styles.dangerText]}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  const email = useAuthStore((s) => s.user?.email);

  const [companion, setCompanion] = useState<CompanionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences | null>(null);
  const [billingState, setBillingState] = useState('unavailable');
  const [products, setProducts] = useState<{ productId: string; price: string }[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const c = await getPrimaryCompanion(userId);
      setCompanion(c);
      setNotifPrefs(await fetchNotificationPreferences());
      const state = await initPlayBilling();
      setBillingState(state);
      setProducts(await fetchPlayProducts());
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLogout() {
    await signOut();
    resetAnalytics();
    useAuthStore.getState().reset();
  }

  async function toggleNotif(key: keyof NotificationPreferences, value: boolean) {
    const updated = { ...notifPrefs, [key]: value } as NotificationPreferences;
    setNotifPrefs(updated);
    await upsertNotificationPreferences({ [key]: value });
  }

  async function handleEnableNotifications() {
    const status = await requestNotificationPermission();
    if (status === 'denied') {
      Alert.alert('Notifications disabled', 'Enable notifications in system settings to receive reminders.');
      return;
    }
    await upsertNotificationPreferences({ notifications_enabled: true });
    await load();
  }

  function handleDeleteCompanion() {
    if (!companion) {
      Alert.alert('No companion', 'You have no companion to delete.');
      return;
    }
    Alert.alert(
      'Delete Companion',
      `Permanently delete ${companion.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteCompanion(
              companion.id,
              companion.name,
              idempotencyKey(),
            );
            if (error) Alert.alert('Error', error.message);
            else {
              trackEvent('companion_deleted', { companion_id: companion.id });
              setCompanion(null);
              Alert.alert('Deleted', 'Your companion has been deleted.');
            }
          },
        },
      ],
    );
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account and all companions. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteAccount(idempotencyKey());
            if (error) Alert.alert('Error', error.message);
            else {
              trackEvent('account_deleted');
              await handleLogout();
            }
          },
        },
      ],
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
      <Text style={styles.title}>Profile</Text>

      <SettingsSection title="Account">
        <SettingsRow label="Email" value={email ?? '—'} />
        <SettingsRow label="User ID" value={userId?.slice(0, 8) + '…'} />
      </SettingsSection>

      <SettingsSection title="My Companions">
        {companion ? (
          <SettingsRow label={companion.name} value={`Level ${companion.level}`} />
        ) : (
          <Text style={styles.hint}>No companion yet — complete onboarding.</Text>
        )}
      </SettingsSection>

      <SettingsSection title="Notification Settings">
        <View style={styles.switchRow}>
          <Text style={styles.rowLabel}>Daily care reminder</Text>
          <Switch
            value={notifPrefs?.daily_care_reminder ?? true}
            onValueChange={(v) => toggleNotif('daily_care_reminder', v)}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.rowLabel}>Memory reminder</Text>
          <Switch
            value={notifPrefs?.memory_reminder ?? true}
            onValueChange={(v) => toggleNotif('memory_reminder', v)}
          />
        </View>
        <Pressable style={styles.linkBtn} onPress={handleEnableNotifications}>
          <Text style={styles.linkText}>Request notification permission</Text>
        </Pressable>
      </SettingsSection>

      <SettingsSection title="Subscription">
        <SettingsRow label="Billing status" value={billingState} />
        {products.map((p) => (
          <SettingsRow key={p.productId} label={p.productId} value={p.price} />
        ))}
        <Text style={styles.hint}>Purchases are confirmed via server webhook only.</Text>
      </SettingsSection>

      <SettingsSection title="Privacy & Data">
        <SettingsRow
          label="Privacy Policy"
          onPress={() => Alert.alert('Privacy Policy', 'https://petecho.app/privacy')}
        />
        <SettingsRow
          label="Terms of Service"
          onPress={() => Alert.alert('Terms', 'https://petecho.app/terms')}
        />
      </SettingsSection>

      <SettingsSection title="Help">
        <SettingsRow
          label="Contact Support"
          onPress={() => Alert.alert('Support', 'support@petecho.app')}
        />
        <SettingsRow
          label="FAQ"
          onPress={() => Alert.alert('FAQ', 'Visit petecho.app/help for common questions.')}
        />
      </SettingsSection>

      <SettingsSection title="Danger Zone">
        <Pressable style={styles.buttonDanger} onPress={handleDeleteCompanion}>
          <Text style={styles.buttonText}>Delete Companion</Text>
        </Pressable>
        <Pressable style={[styles.buttonDanger, styles.buttonMargin]} onPress={handleDeleteAccount}>
          <Text style={styles.buttonText}>Delete Account</Text>
        </Pressable>
      </SettingsSection>

      <Pressable style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Log Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#666', textTransform: 'uppercase', marginBottom: 8 },
  sectionBody: { borderRadius: 12, borderWidth: 1, borderColor: '#eee', overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowLabel: { fontSize: 16 },
  rowValue: { fontSize: 14, color: '#666' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  hint: { padding: 14, fontSize: 13, color: '#888' },
  linkBtn: { padding: 14 },
  linkText: { color: '#208AEF', fontSize: 14 },
  dangerText: { color: '#dc3545' },
  button: { backgroundColor: '#208AEF', padding: 14, borderRadius: 8, marginTop: 8 },
  buttonDanger: { backgroundColor: '#dc3545', padding: 14, borderRadius: 8 },
  buttonMargin: { marginTop: 8 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
});
