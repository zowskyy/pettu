import { View, Text, StyleSheet } from 'react-native';

export default function MemoriesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Memories</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700' },
});
