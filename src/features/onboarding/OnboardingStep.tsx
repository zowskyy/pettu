import { type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { onboardingStyles as styles } from './onboardingStyles';

interface OnboardingStepProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  error?: string | null;
}

export function OnboardingStep({
  title,
  subtitle,
  children,
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
  error,
}: OnboardingStepProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {children}
      </View>
      <View style={styles.footer}>
        {onBack ? (
          <Pressable style={styles.buttonSecondary} onPress={onBack}>
            <Text style={styles.buttonTextSecondary}>Back</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.button, nextDisabled && styles.buttonDisabled, !onBack && { flex: 1 }]}
          onPress={onNext}
          disabled={nextDisabled}>
          <Text style={styles.buttonText}>{nextLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}
