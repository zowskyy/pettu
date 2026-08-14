import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function OnboardingWelcome() {
  return (
    <View style={styles.container} accessibilityLabel="Onboarding welcome screen" accessibilityRole="none">
      <Text style={styles.title} accessibilityRole="header">
        Welcome to Pet Echo
      </Text>
      <Text style={styles.subtitle} accessibilityLabel="Create your AI companion from your pet photos">
        Create your AI companion from your pet photos.
      </Text>
      <Pressable
        style={styles.button}
        onPress={() => router.push('/(onboarding)/pet-type')}
        accessibilityRole="button"
        accessibilityLabel="Get started with onboarding">
        <Text style={styles.buttonText}>Get Started</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32 },
  button: { backgroundColor: '#208AEF', padding: 14, borderRadius: 8 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
});
