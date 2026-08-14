import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { signInWithEmail, signInWithOAuth, isSupabaseConfigured } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');

  async function handleMagicLink() {
    if (!isSupabaseConfigured) {
      Alert.alert('Setup required', 'Copy .env.example → .env.development and add your Supabase cloud keys. See docs/SUPABASE_CLOUD_SETUP.md');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Enter your email');
      return;
    }
    const { error } = await signInWithEmail(email.trim());
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Check your email', 'Magic link sent.');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pet Echo</Text>
      {!isSupabaseConfigured && (
        <Text style={styles.setupHint}>
          Supabase not configured. See docs/SUPABASE_CLOUD_SETUP.md
        </Text>
      )}
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Pressable style={styles.button} onPress={handleMagicLink}>
        <Text style={styles.buttonText}>Send Magic Link</Text>
      </Pressable>
      <Pressable style={styles.buttonOutline} onPress={() => signInWithOAuth('google')}>
        <Text style={styles.buttonTextDark}>Continue with Google</Text>
      </Pressable>
      <Pressable style={styles.buttonOutline} onPress={() => signInWithOAuth('apple')}>
        <Text style={styles.buttonTextDark}>Continue with Apple</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: '700', marginBottom: 32, textAlign: 'center' },
  setupHint: { fontSize: 13, color: '#b45309', backgroundColor: '#fef3c7', padding: 12, borderRadius: 8, marginBottom: 16, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16 },
  button: { backgroundColor: '#208AEF', padding: 14, borderRadius: 8, marginBottom: 12 },
  buttonOutline: { borderWidth: 1, borderColor: '#208AEF', padding: 14, borderRadius: 8, marginBottom: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  buttonTextDark: { color: '#208AEF', textAlign: 'center', fontWeight: '600' },
});
