import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

/** expo-notifications stub — install package when enabling push on device builds. */
type NotificationPermissionsStatus = 'granted' | 'denied' | 'undetermined';

export type NotificationPreferences = {
  notifications_enabled: boolean;
  daily_care_reminder: boolean;
  memory_reminder: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  max_per_day: number;
};

let permissionStatus: NotificationPermissionsStatus = 'undetermined';
let expoPushToken: string | null = null;

export function getNotificationPermissionStatus(): NotificationPermissionsStatus {
  return permissionStatus;
}

/** Request OS notification permission. Stub returns denied on web. */
export async function requestNotificationPermission(): Promise<NotificationPermissionsStatus> {
  if (Platform.OS === 'web') {
    permissionStatus = 'denied';
    return permissionStatus;
  }

  // Real impl: import * as Notifications from 'expo-notifications'
  // const { status } = await Notifications.requestPermissionsAsync();
  permissionStatus = 'undetermined';
  return permissionStatus;
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select(
      'notifications_enabled, daily_care_reminder, memory_reminder, quiet_hours_start, quiet_hours_end, max_per_day',
    )
    .maybeSingle();

  if (error) return null;
  return data as NotificationPreferences | null;
}

export async function upsertNotificationPreferences(
  prefs: Partial<NotificationPreferences>,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('notification_preferences').upsert(
    { profile_id: user.id, ...prefs },
    { onConflict: 'profile_id' },
  );

  if (error) throw error;
}

/** Register push token after permission granted. No-op when denied. */
export async function registerPushToken(): Promise<string | null> {
  if (permissionStatus !== 'granted') {
    return null;
  }

  // Real impl: expoPushToken = (await Notifications.getExpoPushTokenAsync()).data;
  expoPushToken = expoPushToken ?? `ExponentPushToken[stub-${Date.now()}]`;
  return expoPushToken;
}

export type ScheduledReminder = 'daily_care_reminder' | 'memory_reminder';

/**
 * Schedule local reminder respecting preferences and max 1/day cap.
 * Stub — real impl uses expo-notifications scheduleNotificationAsync.
 */
export async function scheduleReminder(type: ScheduledReminder): Promise<boolean> {
  if (permissionStatus === 'denied') {
    return false;
  }

  const prefs = await fetchNotificationPreferences();
  if (!prefs?.notifications_enabled) return false;
  if (type === 'daily_care_reminder' && !prefs.daily_care_reminder) return false;
  if (type === 'memory_reminder' && !prefs.memory_reminder) return false;

  // Real impl checks notification_delivery_log for daily cap via server
  return permissionStatus === 'granted';
}

export async function cancelAllReminders(): Promise<void> {
  // Real impl: Notifications.cancelAllScheduledNotificationsAsync();
}

export function getExpoPushToken(): string | null {
  return expoPushToken;
}
