import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { signOut } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function ProfileScreen() {
  async function handleLogout() {
    await signOut();
    useAuthStore.getState().reset();
  }

  async function handleDeleteAccount() {
    Alert.alert('Delete Account', 'Account deletion flow entry point (Slice 32).');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Pressable style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Log Out</Text>
      </Pressable>
      <Pressable style={styles.buttonDanger} onPress={handleDeleteAccount}>
        <Text style={styles.buttonText}>Delete Account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 24 },
  button: { backgroundColor: '#208AEF', padding: 14, borderRadius: 8, marginBottom: 12 },
  buttonDanger: { backgroundColor: '#dc3545', padding: 14, borderRadius: 8 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
});
