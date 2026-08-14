import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useAuthBootstrap } from '@/hooks/useAuthBootstrap';

const queryClient = new QueryClient();

export default function RootLayout() {
  useAuthBootstrap();

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="companion" />
      </Stack>
    </QueryClientProvider>
  );
}
