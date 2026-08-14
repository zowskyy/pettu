import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { onboardingStyles as styles } from '@/features/onboarding/onboardingStyles';
import { useOnboardingStore, type PetSpecies } from '@/stores/onboardingStore';

const SPECIES: { id: PetSpecies; label: string; description: string }[] = [
  { id: 'dog', label: 'Dog', description: 'Loyal companion with endless energy.' },
  { id: 'cat', label: 'Cat', description: 'Independent spirit with a soft side.' },
  { id: 'bird', label: 'Bird', description: 'Bright, curious, and full of song.' },
  { id: 'rabbit', label: 'Rabbit', description: 'Gentle hopper with a playful streak.' },
  { id: 'other', label: 'Other', description: 'Every pet is welcome here.' },
];

export default function PetTypeScreen() {
  const species = useOnboardingStore((s) => s.species);
  const setSpecies = useOnboardingStore((s) => s.setSpecies);

  return (
    <OnboardingStep
      title="What kind of pet?"
      subtitle="Choose the species that best matches your companion."
      onBack={() => router.back()}
      onNext={() => router.push('/(onboarding)/pet-identity')}
      nextDisabled={!species}>
      <View>
        {SPECIES.map((option) => {
          const selected = species === option.id;
          return (
            <Pressable
              key={option.id}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => setSpecies(option.id)}>
              <Text style={styles.optionTitle}>{option.label}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </Pressable>
          );
        })}
      </View>
    </OnboardingStep>
  );
}
