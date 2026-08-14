import { Stack } from 'expo-router';
import { useAuthGuard } from '@/lib/authGuard';

export default function AuthLayout() {
  const guard = useAuthGuard('unauthenticated');
  if (guard) return guard;

  return <Stack screenOptions={{ headerShown: false }} />;
}
