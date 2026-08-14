import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMemories } from '@/hooks/useMemories';
import { useCompanion } from '@/hooks/useCompanion';
import type { MemoryRecord } from '@/services/memoryService';

function MemoryItem({ memory }: { memory: MemoryRecord }) {
  return (
    <View style={styles.memoryCard}>
      <Text style={styles.memoryDate}>{memory.memory_date}</Text>
      <Text style={styles.memoryTitle}>{memory.title}</Text>
      {memory.note ? <Text style={styles.memoryNote}>{memory.note}</Text> : null}
      {memory.caption ? (
        <Text style={styles.memoryCaption}>{memory.caption}</Text>
      ) : null}
    </View>
  );
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function MemoriesScreen() {
  const { companion, isLoading: companionLoading } = useCompanion();
  const {
    memories,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    addMemory,
    isAdding,
    addError,
  } = useMemories();

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [memoryDate, setMemoryDate] = useState(todayIsoDate());
  const [formError, setFormError] = useState<string | null>(null);

  async function handleAddMemory() {
    setFormError(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError('Title is required.');
      return;
    }

    try {
      await addMemory({
        title: trimmedTitle,
        note: note.trim() || null,
        memoryDate,
      });
      setTitle('');
      setNote('');
      setMemoryDate(todayIsoDate());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not save memory.';
      setFormError(message);
    }
  }

  if (companionLoading || isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6B4EFF" />
      </View>
    );
  }

  if (!companion) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Add a companion to start saving memories.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.formTitle}>Add memory</Text>
        <TextInput
          style={styles.input}
          placeholder="Title"
          value={title}
          onChangeText={setTitle}
          editable={!isAdding}
        />
        <TextInput
          style={styles.input}
          placeholder="Date (YYYY-MM-DD)"
          value={memoryDate}
          onChangeText={setMemoryDate}
          editable={!isAdding}
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, styles.noteInput]}
          placeholder="Note (optional)"
          value={note}
          onChangeText={setNote}
          multiline
          editable={!isAdding}
        />
        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
        {addError ? (
          <Text style={styles.errorText}>
            {addError instanceof Error ? addError.message : 'Save failed'}
          </Text>
        ) : null}
        <Pressable
          style={[styles.addButton, isAdding && styles.addButtonDisabled]}
          onPress={handleAddMemory}
          disabled={isAdding}
        >
          {isAdding ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addButtonText}>Save memory</Text>
          )}
        </Pressable>
      </View>

      <FlatList
        data={memories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MemoryItem memory={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyList}>No memories yet. Add your first one above.</Text>
        }
        ListFooterComponent={
          hasNextPage ? (
            <Pressable
              style={styles.loadMoreButton}
              onPress={loadMore}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <ActivityIndicator color="#6B4EFF" />
              ) : (
                <Text style={styles.loadMoreText}>Load more</Text>
              )}
            </Pressable>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FF' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#666', padding: 24, textAlign: 'center' },
  form: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E4F4',
  },
  formTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, color: '#2D2640' },
  input: {
    borderWidth: 1,
    borderColor: '#DDD8EE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: '#FAFAFE',
    fontSize: 15,
  },
  noteInput: { minHeight: 72, textAlignVertical: 'top' },
  addButton: {
    backgroundColor: '#6B4EFF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonDisabled: { opacity: 0.6 },
  addButtonText: { color: '#fff', fontWeight: '700' },
  errorText: { color: '#C62828', marginBottom: 8, fontSize: 13 },
  listContent: { padding: 16, paddingBottom: 32 },
  memoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E4F4',
  },
  memoryDate: { fontSize: 12, color: '#9A92B0', marginBottom: 4 },
  memoryTitle: { fontSize: 17, fontWeight: '700', color: '#2D2640' },
  memoryNote: { marginTop: 6, fontSize: 14, color: '#5C5470', lineHeight: 20 },
  memoryCaption: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B4EFF',
    fontStyle: 'italic',
  },
  emptyList: { textAlign: 'center', color: '#9A92B0', marginTop: 24 },
  loadMoreButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  loadMoreText: { color: '#6B4EFF', fontWeight: '600' },
});
