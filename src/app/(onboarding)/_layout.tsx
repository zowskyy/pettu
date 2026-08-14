import { Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Redirect } from 'expo-router';

export default function OnboardingLayout() {
  const status = useAuthStore((s) => s.status);

  if (status === 'unauthenticated') {
    return <Redirect href="/(auth)/login" />;
  }
  if (status === 'ready') {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="pet-type" />
      <Stack.Screen name="pet-identity" />
      <Stack.Screen name="personality" />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="quirk" />
      <Stack.Screen name="nickname" />
      <Stack.Screen name="art-style" />
      <Stack.Screen name="photos" />
      <Stack.Screen name="creating" />
      <Stack.Screen name="reveal" />
    </Stack>
  );
}
