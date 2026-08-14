import { calculateLevelFromXp } from './experience';
import type {
  CareActionEffect,
  CareActionType,
  CompanionStats,
  MeterDeltas,
} from './types';
import { METER_MAX, METER_MIN } from './types';

export const CARE_ACTION_EFFECTS: Record<CareActionType, CareActionEffect> = {
  feed: { type: 'feed', joy: 10, energy: 5, bond: 5, xp: 8 },
  play: { type: 'play', joy: 15, energy: -10, bond: 8, xp: 10 },
  groom: { type: 'groom', joy: 8, bond: 3, xp: 6 },
  rest: { type: 'rest', energy: 15, bond: 4, xp: 6 },
};

export function getCareActionEffect(type: CareActionType): CareActionEffect {
  return CARE_ACTION_EFFECTS[type];
}

function clampMeter(value: number): number {
  return Math.min(METER_MAX, Math.max(METER_MIN, value));
}

export function applyMeterDeltas(
  meters: Pick<CompanionStats, 'joy' | 'energy' | 'bond'>,
  deltas: MeterDeltas,
): Pick<CompanionStats, 'joy' | 'energy' | 'bond'> {
  return {
    joy: clampMeter(meters.joy + (deltas.joy ?? 0)),
    energy: clampMeter(meters.energy + (deltas.energy ?? 0)),
    bond: clampMeter(meters.bond + (deltas.bond ?? 0)),
  };
}

export function applyCareActionToStats(
  stats: CompanionStats,
  action: CareActionType,
): CompanionStats {
  const effect = getCareActionEffect(action);
  const meters = applyMeterDeltas(stats, effect);

  const xp = stats.xp + (effect.xp ?? 0);

  return {
    ...meters,
    xp,
    level: calculateLevelFromXp(xp),
    pawPoints: stats.pawPoints,
  };
}
