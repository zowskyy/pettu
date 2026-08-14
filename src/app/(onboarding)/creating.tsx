import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import {
  createCompanionDraft,
  markOnboardingComplete,
  uploadCompanionPhotos,
} from '@/services/onboardingService';

type Stage = 'creating' | 'uploading' | 'finishing' | 'error';

const STAGE_LABELS: Record<Stage, string> = {
  creating: 'Creating your companion…',
  uploading: 'Uploading photos…',
  finishing: 'Finishing up…',
  error: 'Something went wrong',
};

export default function CreatingScreen() {
  const user = useAuthStore((s) => s.user);
  const [stage, setStage] = useState<Stage>('creating');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!user) {
        setStage('error');
        setError('You must be signed in to continue.');
        return;
      }

      const store = useOnboardingStore.getState();
      const {
        species,
        name,
        breed,
        colorMarkings,
        photos,
        personalityTraits,
        favoriteThings,
        quirk,
        nickname,
        artStyle,
        companionId,
        setCompanionId,
        reset,
      } = store;

      if (!species || !name || !artStyle || photos.length < 5) {
        setStage('error');
        setError('Missing onboarding details. Go back and complete all steps.');
        return;
      }

      try {
        setStage('creating');
        const id =
          companionId ??
          (await createCompanionDraft(user.id, {
            species,
            name,
            breed,
            colorMarkings,
            personalityTraits,
            favoriteThings,
            quirk,
            nickname: nickname || name,
            artStyle,
          }));

        if (cancelled) return;
        if (!companionId) {
          setCompanionId(id);
        }

        setStage('uploading');
        await uploadCompanionPhotos(id, photos);

        if (cancelled) return;

        setStage('finishing');
        await markOnboardingComplete(id);

        if (cancelled) return;

        reset();
        router.replace('/(tabs)/home');
      } catch (creationError) {
        if (cancelled) return;
        setStage('error');
        setError(
          creationError instanceof Error
            ? creationError.message
            : 'Failed to complete onboarding.',
        );
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <View style={styles.container}>
      {stage === 'error' ? (
        <>
          <Text style={styles.title}>{STAGE_LABELS.error}</Text>
          <Text style={styles.subtitle}>{error}</Text>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color="#208AEF" />
          <Text style={styles.title}>{STAGE_LABELS[stage]}</Text>
          <Text style={styles.subtitle}>This may take a moment.</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 24,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});
