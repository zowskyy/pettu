import { Redirect } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '@/stores/authStore';

export default function CompanionScreen() {
  const status = useAuthStore((s) => s.status);

  // Slice 04 verification: redirect unauthenticated and onboarding-incomplete users
  if (status === 'unauthenticated') {
    return <Redirect href="/(auth)/login" />;
  }
  if (status === 'onboarding' || status === 'authenticated') {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Companion</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700' },
});
