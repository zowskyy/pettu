import { View, Text, StyleSheet } from 'react-native';

export default function OnboardingPhotos() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Pet Photos</Text>
      <Text style={styles.subtitle}>Minimum 5 photos, 3 clear facial photos required.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666' },
});
