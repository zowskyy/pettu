import { Stack } from 'expo-router';
import { useAuthBootstrap } from '@/hooks/useAuthBootstrap';

export default function RootLayout() {
  useAuthBootstrap();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="companion" />
    </Stack>
  );
}
