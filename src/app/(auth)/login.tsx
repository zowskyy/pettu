import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import {
  sendEmailOtp,
  verifyEmailOtp,
  signInWithOAuth,
  isSupabaseConfigured,
} from '@/lib/supabase';

type Step = 'email' | 'code';

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  async function handleSendCode() {
    if (!isSupabaseConfigured) {
      Alert.alert('Setup required', 'Supabase keys missing in .env.development');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Enter your email');
      return;
    }
    const { error } = await sendEmailOtp(email.trim());
    if (error) Alert.alert('Error', error.message);
    else {
      setStep('code');
      Alert.alert('Check your email', 'Enter the 6-digit code we sent you.');
    }
  }

  async function handleVerifyCode() {
    if (code.trim().length < 6) {
      Alert.alert('Error', 'Enter the 6-digit code');
      return;
    }
    const { error } = await verifyEmailOtp(email.trim(), code.trim());
    if (error) Alert.alert('Error', error.message);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pet Echo</Text>

      {step === 'email' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Pressable style={styles.button} onPress={handleSendCode}>
            <Text style={styles.buttonText}>Send Login Code</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.subtitle}>Code sent to {email}</Text>
          <TextInput
            style={styles.input}
            placeholder="6-digit code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <Pressable style={styles.button} onPress={handleVerifyCode}>
            <Text style={styles.buttonText}>Verify & Sign In</Text>
          </Pressable>
          <Pressable onPress={() => setStep('email')}>
            <Text style={styles.link}>Use a different email</Text>
          </Pressable>
        </>
      )}

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
  title: { fontSize: 32, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#208AEF', padding: 14, borderRadius: 8, marginBottom: 12 },
  buttonOutline: { borderWidth: 1, borderColor: '#208AEF', padding: 14, borderRadius: 8, marginBottom: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  buttonTextDark: { color: '#208AEF', textAlign: 'center', fontWeight: '600' },
  link: { color: '#208AEF', textAlign: 'center', marginBottom: 16 },
});
