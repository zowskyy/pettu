import { useState } from 'react';
import { TextInput, Text } from 'react-native';
import { router } from 'expo-router';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { onboardingStyles as styles } from '@/features/onboarding/onboardingStyles';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function NicknameScreen() {
  const { name, nickname, setNickname } = useOnboardingStore();
  const [localNickname, setLocalNickname] = useState(nickname || name);

  function handleNext() {
    setNickname(localNickname || name);
    router.push('/(onboarding)/art-style');
  }

  return (
    <OnboardingStep
      title="Nickname"
      subtitle="What should your companion call your pet?"
      onBack={() => router.back()}
      onNext={handleNext}
      nextDisabled={!localNickname.trim() && !name.trim()}>
      <Text style={styles.label}>Nickname</Text>
      <TextInput
        style={styles.input}
        placeholder={name || 'e.g. Buds'}
        value={localNickname}
        onChangeText={setLocalNickname}
        autoCapitalize="words"
      />
    </OnboardingStep>
  );
}
