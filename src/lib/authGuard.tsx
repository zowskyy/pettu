import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export function useAuthGuard(required: 'unauthenticated' | 'authenticated' | 'onboarding' | 'ready') {
  const status = useAuthStore((s) => s.status);

  if (required === 'unauthenticated' && status !== 'unauthenticated') {
    return <Redirect href="/(tabs)/home" />;
  }
  if (required === 'authenticated' && status === 'unauthenticated') {
    return <Redirect href="/(auth)/login" />;
  }
  if (required === 'onboarding' && status !== 'onboarding' && status !== 'ready') {
    return <Redirect href="/(auth)/login" />;
  }
  if (required === 'ready' && status !== 'ready') {
    if (status === 'unauthenticated') return <Redirect href="/(auth)/login" />;
    if (status === 'onboarding') return <Redirect href="/(onboarding)/welcome" />;
  }
  return null;
}
