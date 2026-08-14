import { useState } from 'react';
import { TextInput, Text } from 'react-native';
import { router } from 'expo-router';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { onboardingStyles as styles } from '@/features/onboarding/onboardingStyles';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function PetIdentityScreen() {
  const { name, breed, colorMarkings, setIdentity } = useOnboardingStore();
  const [localName, setLocalName] = useState(name);
  const [localBreed, setLocalBreed] = useState(breed);
  const [localColor, setLocalColor] = useState(colorMarkings);
  const [error, setError] = useState<string | null>(null);

  function handleNext() {
    if (!localName.trim()) {
      setError('Enter your pet\'s name to continue.');
      return;
    }
    setError(null);
    setIdentity({
      name: localName,
      breed: localBreed,
      colorMarkings: localColor,
    });
    router.push('/(onboarding)/photos');
  }

  return (
    <OnboardingStep
      title="Tell us about your pet"
      subtitle="We'll use this to personalize your companion."
      onBack={() => router.back()}
      onNext={handleNext}
      nextDisabled={!localName.trim()}
      error={error}>
      <Text style={styles.label}>Pet name *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Buddy"
        value={localName}
        onChangeText={setLocalName}
        autoCapitalize="words"
      />
      <Text style={styles.label}>Breed (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Golden Retriever"
        value={localBreed}
        onChangeText={setLocalBreed}
        autoCapitalize="words"
      />
      <Text style={styles.label}>Color & markings (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Golden with white chest"
        value={localColor}
        onChangeText={setLocalColor}
        autoCapitalize="sentences"
      />
    </OnboardingStep>
  );
}
