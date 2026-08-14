import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { onboardingStyles as styles } from '@/features/onboarding/onboardingStyles';
import { useOnboardingStore } from '@/stores/onboardingStore';

const TRAITS = [
  'Playful',
  'Loyal',
  'Curious',
  'Calm',
  'Energetic',
  'Shy',
  'Bold',
  'Affectionate',
];

export default function PersonalityScreen() {
  const personalityTraits = useOnboardingStore((s) => s.personalityTraits);
  const togglePersonalityTrait = useOnboardingStore((s) => s.togglePersonalityTrait);

  return (
    <OnboardingStep
      title="Personality"
      subtitle="Pick the traits that best describe your pet."
      onBack={() => router.back()}
      onNext={() => router.push('/(onboarding)/favorites')}
      nextDisabled={personalityTraits.length === 0}>
      <View style={styles.chipRow}>
        {TRAITS.map((trait) => {
          const selected = personalityTraits.includes(trait);
          return (
            <Pressable
              key={trait}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => togglePersonalityTrait(trait)}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {trait}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </OnboardingStep>
  );
}
