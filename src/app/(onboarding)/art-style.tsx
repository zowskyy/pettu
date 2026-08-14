import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { onboardingStyles as styles } from '@/features/onboarding/onboardingStyles';
import { useOnboardingStore, type ArtStyle } from '@/stores/onboardingStore';

const STYLES: { id: ArtStyle; label: string; description: string }[] = [
  {
    id: 'cozy_storybook',
    label: 'Cozy Storybook',
    description: 'Warm, illustrated storybook charm.',
  },
  {
    id: 'playful_3d',
    label: 'Playful 3D',
    description: 'Soft, rounded 3D character style.',
  },
  {
    id: 'pixel_adventure',
    label: 'Pixel Adventure',
    description: 'Retro pixel art with bold colors.',
  },
];

export default function ArtStyleScreen() {
  const artStyle = useOnboardingStore((s) => s.artStyle);
  const setArtStyle = useOnboardingStore((s) => s.setArtStyle);

  return (
    <OnboardingStep
      title="Art style"
      subtitle="Choose how your companion will look."
      onBack={() => router.back()}
      onNext={() => router.push('/(onboarding)/creating')}
      nextDisabled={!artStyle}
      nextLabel="Create Companion">
      <View>
        {STYLES.map((option) => {
          const selected = artStyle === option.id;
          return (
            <Pressable
              key={option.id}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => setArtStyle(option.id)}>
              <Text style={styles.optionTitle}>{option.label}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </Pressable>
          );
        })}
      </View>
    </OnboardingStep>
  );
}
