import { LEVEL_THRESHOLDS, MAX_LEVEL } from './levels';

export function calculateLevelFromXp(xp: number): number {
  const safeXp = Math.max(0, xp);
  let level = 1;

  for (let index = LEVEL_THRESHOLDS.length - 1; index >= 0; index -= 1) {
    if (safeXp >= LEVEL_THRESHOLDS[index]) {
      level = index + 1;
      break;
    }
  }

  return Math.min(level, MAX_LEVEL);
}

export function addXp(currentXp: number, amount: number): {
  xp: number;
  level: number;
  levelsGained: number;
} {
  const previousLevel = calculateLevelFromXp(currentXp);
  const xp = Math.max(0, currentXp + amount);
  const level = calculateLevelFromXp(xp);

  return {
    xp,
    level,
    levelsGained: level - previousLevel,
  };
}

export function applyXpToStats<T extends { xp: number; level: number }>(
  stats: T,
  amount: number,
): T {
  const result = addXp(stats.xp, amount);
  return {
    ...stats,
    xp: result.xp,
    level: result.level,
  };
}
