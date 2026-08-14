import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const isSupabaseConfigured =
  supabaseUrl.length > 0 &&
  supabaseKey.length > 0 &&
  !supabaseUrl.includes('YOUR_PROJECT_REF');

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

function createSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    console.warn(
      '[Pet Echo] Supabase not configured. Copy .env.example → .env.development and add your cloud keys. See docs/SUPABASE_CLOUD_SETUP.md',
    );
  }

  return createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder-key',
    {
      auth: {
        storage: Platform.OS === 'web' ? undefined : ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    },
  );
}

export const supabase = createSupabaseClient();

/** OAuth / magic-link redirect for Supabase cloud auth */
export function getAuthRedirectUrl(): string {
  return Linking.createURL('/');
}

export type AuthSession = Awaited<
  ReturnType<typeof supabase.auth.getSession>
>['data']['session'];

export type Profile = {
  id: string;
  display_name: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data;
}

export async function signInWithEmail(email: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: getAuthRedirectUrl() },
  });
}

export async function signInWithOAuth(provider: 'apple' | 'google') {
  return supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getAuthRedirectUrl(),
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function restoreSession() {
  return supabase.auth.getSession();
}
