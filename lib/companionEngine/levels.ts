/** Cumulative XP required to reach each level (index 0 = level 1). */
export const LEVEL_THRESHOLDS: readonly number[] = [
  0, // Level 1
  50, // Level 2
  120, // Level 3
  210, // Level 4
  320, // Level 5
  450, // Level 6
  600, // Level 7
  770, // Level 8
  960, // Level 9
  1170, // Level 10
  1400, // Level 11
  1650, // Level 12
  1920, // Level 13
  2210, // Level 14
  2520, // Level 15
  2850, // Level 16
  3200, // Level 17
  3570, // Level 18
  3960, // Level 19
  4370, // Level 20
] as const;

export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

export function getXpForLevel(level: number): number {
  const index = Math.max(1, Math.min(level, MAX_LEVEL)) - 1;
  return LEVEL_THRESHOLDS[index] ?? LEVEL_THRESHOLDS[MAX_LEVEL - 1];
}

export function getXpToNextLevel(level: number): number | null {
  if (level >= MAX_LEVEL) {
    return null;
  }

  return LEVEL_THRESHOLDS[level] - LEVEL_THRESHOLDS[level - 1];
}
