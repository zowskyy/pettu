import type { Meters, Mood } from './types';

interface MoodRule {
  mood: Mood;
  matches: (meters: Meters) => boolean;
}

/**
 * Priority-ordered mood rules. First match wins.
 * Thresholds are deterministic and derived from meter ranges (0–100).
 */
const MOOD_RULES: readonly MoodRule[] = [
  {
    mood: 'Needs Attention',
    matches: ({ joy, energy }) => joy < 40 || energy < 40,
  },
  {
    mood: 'Sleepy',
    matches: ({ energy }) => energy < 50,
  },
  {
    mood: 'Thriving',
    matches: ({ joy, energy, bond }) =>
      joy >= 80 && energy >= 70 && bond >= 70,
  },
  {
    mood: 'Playful',
    matches: ({ joy, energy }) => joy >= 70 && energy >= 55,
  },
  {
    mood: 'Cozy',
    matches: ({ joy, energy, bond }) =>
      bond >= 70 && joy >= 50 && energy >= 45,
  },
  {
    mood: 'Happy',
    matches: ({ joy }) => joy >= 60,
  },
  {
    mood: 'Calm',
    matches: () => true,
  },
];

export function calculateMood(meters: Meters): Mood {
  const rule = MOOD_RULES.find(({ matches }) => matches(meters));
  return rule?.mood ?? 'Calm';
}

export function getMoodRules(): readonly MoodRule[] {
  return MOOD_RULES;
}
