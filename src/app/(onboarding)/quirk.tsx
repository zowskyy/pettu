import { useState } from 'react';
import { TextInput, Text } from 'react-native';
import { router } from 'expo-router';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { onboardingStyles as styles } from '@/features/onboarding/onboardingStyles';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function QuirkScreen() {
  const quirk = useOnboardingStore((s) => s.quirk);
  const setQuirk = useOnboardingStore((s) => s.setQuirk);
  const [localQuirk, setLocalQuirk] = useState(quirk);

  function handleNext() {
    setQuirk(localQuirk);
    router.push('/(onboarding)/nickname');
  }

  return (
    <OnboardingStep
      title="A special quirk"
      subtitle="What's something uniquely your pet?"
      onBack={() => router.back()}
      onNext={handleNext}
      nextDisabled={!localQuirk.trim()}>
      <Text style={styles.label}>Quirk *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Tilts head when confused"
        value={localQuirk}
        onChangeText={setLocalQuirk}
        multiline
        maxLength={120}
      />
    </OnboardingStep>
  );
}
