import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const status = useAuthStore((s) => s.status);

  switch (status) {
    case 'loading':
      return null;
    case 'unauthenticated':
      return <Redirect href="/(auth)/login" />;
    case 'onboarding':
      return <Redirect href="/(onboarding)/welcome" />;
    case 'authenticated':
    case 'ready':
      return <Redirect href="/(tabs)/home" />;
    default:
      return <Redirect href="/(auth)/login" />;
  }
}
