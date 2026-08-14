import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAuthBootstrap } from '@/hooks/useAuthBootstrap';

const queryClient = new QueryClient();

export default function RootLayout() {
  useAuthBootstrap();

  useEffect(() => {
    if (Constants.appOwnership === 'expo') {
      console.warn(
        '[Pet Echo] Expo Go is not supported. Install the EAS development build and run `npm start` (dev client).',
      );
    }
  }, []);

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
