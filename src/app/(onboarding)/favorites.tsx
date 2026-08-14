import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { onboardingStyles as styles } from '@/features/onboarding/onboardingStyles';
import { useOnboardingStore } from '@/stores/onboardingStore';

const FAVORITES = [
  'Tennis balls',
  'Sunbeams',
  'Treats',
  'Walks',
  'Naps',
  'Squeaky toys',
  'Window watching',
  'Cuddles',
];

export default function FavoritesScreen() {
  const favoriteThings = useOnboardingStore((s) => s.favoriteThings);
  const toggleFavoriteThing = useOnboardingStore((s) => s.toggleFavoriteThing);

  return (
    <OnboardingStep
      title="Favorite things"
      subtitle="What does your pet love most?"
      onBack={() => router.back()}
      onNext={() => router.push('/(onboarding)/quirk')}
      nextDisabled={favoriteThings.length === 0}>
      <View style={styles.chipRow}>
        {FAVORITES.map((thing) => {
          const selected = favoriteThings.includes(thing);
          return (
            <Pressable
              key={thing}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => toggleFavoriteThing(thing)}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {thing}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </OnboardingStep>
  );
}
