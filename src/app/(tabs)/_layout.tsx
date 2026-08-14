import { Tabs, Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function TabsLayout() {
  const status = useAuthStore((s) => s.status);

  if (status === 'unauthenticated') {
    return <Redirect href="/(auth)/login" />;
  }
  if (status === 'onboarding') {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="memories" options={{ title: 'Memories' }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
