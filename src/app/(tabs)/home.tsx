import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { CareActionType } from '../../../lib/companionEngine/types';
import { useCompanion } from '@/hooks/useCompanion';
import { useCompanionStore } from '@/stores/companionStore';

const CARE_ACTIONS: readonly {
  type: CareActionType;
  label: string;
}[] = [
  { type: 'feed', label: 'Feed' },
  { type: 'play', label: 'Play' },
  { type: 'groom', label: 'Groom' },
  { type: 'rest', label: 'Rest' },
];

function MeterBar({
  label,
  value,
  accessibilityLabel,
}: {
  label: string;
  value: number;
  accessibilityLabel: string;
}) {
  return (
    <View style={styles.meterRow} accessibilityLabel={accessibilityLabel}>
      <Text style={styles.meterLabel}>{label}</Text>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width: `${value}%` }]} />
      </View>
      <Text style={styles.meterValue}>{value}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const {
    companion,
    mood,
    isLoading,
    error,
    performAction,
    isPerformingAction,
    refetch,
  } = useCompanion();
  const { dialogue, pendingAction, careError } = useCompanionStore();

  if (isLoading) {
    return (
      <View style={styles.centered} accessibilityLabel="Loading companion">
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load companion.</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => refetch()}
          accessibilityRole="button"
          accessibilityLabel="Retry loading companion"
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!companion) {
    return (
      <View style={styles.centered} accessibilityLabel="No companion yet">
        <Text style={styles.title} accessibilityRole="header">
          No companion yet
        </Text>
        <Text style={styles.subtitle}>Complete onboarding to start caring.</Text>
      </View>
    );
  }

  const displayName = companion.nickname ?? companion.name;
  const dialogueMessage =
    dialogue?.message ?? `Hello! I'm ${displayName}. Ready to spend time together?`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessibilityLabel="Home screen"
    >
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {displayName}
        </Text>
        <Text style={styles.species}>{companion.species}</Text>
        {mood ? (
          <View style={styles.moodBadge} accessibilityLabel={`Mood: ${mood}`}>
            <Text style={styles.moodText}>{mood}</Text>
          </View>
        ) : null}
      </View>

      <View
        style={styles.dialogueBubble}
        accessibilityLabel={`Companion says: ${dialogueMessage}`}
      >
        <Text style={styles.dialogueText}>{dialogueMessage}</Text>
        {dialogue?.suggested_action ? (
          <Text style={styles.suggestedAction}>
            Suggested: {dialogue.suggested_action}
          </Text>
        ) : null}
      </View>

      <View
        style={styles.statsCard}
        accessibilityLabel={`Level ${companion.level}, ${companion.xp} experience points, Joy ${companion.joy}, Energy ${companion.energy}, Bond ${companion.bond}, ${companion.paw_points} paw points`}
      >
        <Text style={styles.sectionTitle}>Stats</Text>
        <View style={styles.levelRow}>
          <Text style={styles.levelLabel}>Level {companion.level}</Text>
          <Text style={styles.xpLabel}>{companion.xp} XP</Text>
        </View>
        <MeterBar label="Joy" value={companion.joy} accessibilityLabel={`Joy ${companion.joy}`} />
        <MeterBar
          label="Energy"
          value={companion.energy}
          accessibilityLabel={`Energy ${companion.energy}`}
        />
        <MeterBar label="Bond" value={companion.bond} accessibilityLabel={`Bond ${companion.bond}`} />
        <Text style={styles.pawPoints}>Paw Points {companion.paw_points}</Text>
      </View>

      {careError ? (
        <Text style={styles.careError} accessibilityLabel={`Care action error: ${careError}`}>
          {careError}
        </Text>
      ) : null}

      <View style={styles.actionsGrid}>
        {CARE_ACTIONS.map(({ type, label }) => {
          const isPending = isPerformingAction && pendingAction === type;
          return (
            <Pressable
              key={type}
              style={[styles.actionButton, isPending && styles.actionButtonPending]}
              disabled={isPerformingAction}
              onPress={() => performAction(type)}
              accessibilityRole="button"
              accessibilityLabel={`${label} companion`}
            >
              {isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionLabel}>{label}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FF' },
  content: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F7F5FF',
  },
  title: { fontSize: 26, fontWeight: '700', color: '#2D2640' },
  subtitle: { marginTop: 8, color: '#666', textAlign: 'center' },
  errorText: { color: '#C62828', marginBottom: 12, textAlign: 'center' },
  retryButton: {
    backgroundColor: '#208AEF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 16 },
  species: { fontSize: 14, color: '#7A718F', marginTop: 4, textTransform: 'capitalize' },
  moodBadge: {
    marginTop: 10,
    backgroundColor: '#208AEF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  moodText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  dialogueBubble: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E4F4',
  },
  dialogueText: { fontSize: 16, color: '#2D2640', lineHeight: 22 },
  suggestedAction: { marginTop: 8, fontSize: 12, color: '#208AEF' },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E4F4',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2D2640', marginBottom: 12 },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  levelLabel: { fontSize: 18, fontWeight: '700', color: '#208AEF' },
  xpLabel: { fontSize: 14, color: '#7A718F' },
  meterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  meterLabel: { width: 56, fontSize: 13, color: '#5C5470', fontWeight: '600' },
  meterTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#EDE9F8',
    borderRadius: 5,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  meterFill: { height: '100%', borderRadius: 5, backgroundColor: '#208AEF' },
  meterValue: { width: 32, textAlign: 'right', fontSize: 13, color: '#5C5470' },
  pawPoints: { marginTop: 8, fontSize: 14, color: '#7A718F' },
  careError: {
    color: '#C62828',
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 13,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '47%',
    backgroundColor: '#208AEF',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  actionButtonPending: { opacity: 0.7 },
  actionLabel: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
