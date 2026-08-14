import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  completeOnboarding,
  fetchCompanionPhotoRefs,
  getCompanionForReveal,
} from '@/features/companion/createCompanion';
import {
  GenerationJobError,
  pollGenerationJob,
  retryGenerationJob,
} from '@/services/generationJobService';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import type { ArtStyle, CompanionGenerationPayload } from '@/types/generation';

type RevealPhase = 'loading' | 'generating' | 'ready' | 'failed';

interface CompanionReveal {
  id: string;
  name: string;
  nickname: string | null;
  species: string;
  personality_traits: string[] | Record<string, unknown>;
  art_style: ArtStyle;
  generated_image_path: string | null;
  generated_image_bucket: string | null;
}

function traitsList(value: CompanionReveal['personality_traits']): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (value && typeof value === 'object' && 'traits' in value) {
    const traits = (value as { traits?: unknown }).traits;
    if (Array.isArray(traits)) {
      return traits.filter((item): item is string => typeof item === 'string');
    }
  }
  return [];
}

function buildIntro(companion: CompanionReveal): string {
  const traits = traitsList(companion.personality_traits);
  const traitText = traits.length > 0 ? traits.slice(0, 2).join(' and ') : 'sweet';
  const displayName = companion.nickname ?? companion.name;
  return `Meet ${displayName}, your ${traitText} ${companion.species}!`;
}

export default function OnboardingReveal() {
  const params = useLocalSearchParams<{
    companionId?: string;
    jobId?: string;
  }>();
  const resetOnboarding = useOnboardingStore((state) => state.reset);
  const userId = useAuthStore((state) => state.user?.id);

  const companionId = params.companionId ?? '';
  const jobId = params.jobId ?? '';

  const [phase, setPhase] = useState<RevealPhase>('loading');
  const [companion, setCompanion] = useState<CompanionReveal | null>(null);
  const [activeJobId, setActiveJobId] = useState(jobId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [startingCare, setStartingCare] = useState(false);

  const imageUri = useMemo(() => {
    if (!companion?.generated_image_path) {
      return null;
    }

    if (companion.generated_image_path.startsWith('http')) {
      return companion.generated_image_path;
    }

    return `https://mock.petecho.local/${companion.generated_image_path}`;
  }, [companion]);

  const loadCompanion = useCallback(async () => {
    if (!companionId) {
      setPhase('failed');
      setErrorMessage('Missing companion. Go back and try creating again.');
      return;
    }

    const record = await getCompanionForReveal(companionId);
    setCompanion(record as CompanionReveal);

    if (record.generated_image_path) {
      setPhase('ready');
      return;
    }

    setPhase('generating');
  }, [companionId]);

  useEffect(() => {
    loadCompanion().catch((error) => {
      setPhase('failed');
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not load companion.',
      );
    });
  }, [loadCompanion]);

  useEffect(() => {
    if (phase !== 'generating' || !activeJobId) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    pollGenerationJob(activeJobId, {
      signal: controller.signal,
      onStatus: () => {
        if (!cancelled) {
          setPhase('generating');
        }
      },
    })
      .then(async () => {
        if (cancelled) {
          return;
        }
        const refreshed = await getCompanionForReveal(companionId);
        setCompanion(refreshed as CompanionReveal);
        setPhase('ready');
        setErrorMessage(null);
      })
      .catch((error) => {
        if (cancelled || error instanceof GenerationJobError && error.code === 'cancelled') {
          return;
        }

        setPhase('failed');
        setErrorMessage(
          error instanceof Error ? error.message : 'Generation failed. Please retry.',
        );
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeJobId, companionId, phase]);

  const handleRetry = async () => {
    if (!companion || !userId) {
      return;
    }

    setRetrying(true);
    setErrorMessage(null);
    setPhase('generating');

    try {
      const traits = traitsList(companion.personality_traits);
      const photoRefs = await fetchCompanionPhotoRefs(companion.id);
      const payload: CompanionGenerationPayload = {
        species: companion.species,
        name: companion.name,
        nickname: companion.nickname ?? undefined,
        personalityTraits: traits,
        artStyle: companion.art_style,
        photoIds: photoRefs.map((photo) => photo.id),
        referenceImageUrls: photoRefs.map(
          (photo) =>
            `${photo.storageBucket ?? 'pet-training-photos'}/${photo.storagePath}`,
        ),
      };

      const job = await retryGenerationJob(
        {
          companionId: companion.id,
          profileId: userId,
          jobType: 'companion_image',
          payload,
        },
        activeJobId,
      );

      setActiveJobId(job.id);
    } catch (error) {
      setPhase('failed');
      setErrorMessage(
        error instanceof Error ? error.message : 'Retry failed. Please try again.',
      );
    } finally {
      setRetrying(false);
    }
  };

  const handleStartCaring = async () => {
    if (!companion) {
      return;
    }

    setStartingCare(true);
    try {
      await completeOnboarding(companion.id);
      resetOnboarding();
      router.replace('/(tabs)/home');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not finish onboarding.',
      );
    } finally {
      setStartingCare(false);
    }
  };

  if (phase === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#208AEF" />
        <Text style={styles.statusText}>Preparing your companion…</Text>
      </View>
    );
  }

  if (phase === 'generating') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#208AEF" />
        <Text style={styles.title}>Creating your companion</Text>
        <Text style={styles.subtitle}>
          This usually takes a moment. You can stay on this screen while we work.
        </Text>
      </View>
    );
  }

  if (phase === 'failed') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Generation didn&apos;t finish</Text>
        <Text style={styles.subtitle}>
          {errorMessage ?? 'Something went wrong while creating your companion.'}
        </Text>
        <Text style={styles.note}>
          Your companion details are saved — retrying won&apos;t create a duplicate.
        </Text>
        <Pressable
          style={[styles.button, retrying && styles.buttonDisabled]}
          onPress={handleRetry}
          disabled={retrying}
        >
          <Text style={styles.buttonText}>{retrying ? 'Retrying…' : 'Try Again'}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Your companion is ready</Text>
      <Text style={styles.title}>{companion?.name ?? 'Companion'}</Text>
      <Text style={styles.subtitle}>{companion ? buildIntro(companion) : ''}</Text>

      <View style={styles.imageFrame}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>Companion art</Text>
          </View>
        )}
      </View>

      <Pressable
        style={[styles.button, startingCare && styles.buttonDisabled]}
        onPress={handleStartCaring}
        disabled={startingCare}
      >
        <Text style={styles.buttonText}>
          {startingCare ? 'Starting…' : 'Start Caring'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 14,
    color: '#208AEF',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    lineHeight: 22,
  },
  statusText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  note: {
    fontSize: 14,
    color: '#777',
    marginBottom: 24,
    lineHeight: 20,
  },
  imageFrame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 28,
    backgroundColor: '#F3F6FA',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#888',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#208AEF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
