export type CareActionType = 'feed' | 'play' | 'groom' | 'rest';

export const CARE_ACTION_TYPES: readonly CareActionType[] = [
  'feed',
  'play',
  'groom',
  'rest',
] as const;

export type Mood =
  | 'Thriving'
  | 'Happy'
  | 'Calm'
  | 'Sleepy'
  | 'Needs Attention'
  | 'Cozy'
  | 'Playful';

export interface Meters {
  joy: number;
  energy: number;
  bond: number;
}

export interface CompanionStats extends Meters {
  xp: number;
  level: number;
  pawPoints: number;
}

export interface MeterDeltas {
  joy?: number;
  energy?: number;
  bond?: number;
  xp?: number;
}

export interface CareActionEffect extends MeterDeltas {
  type: CareActionType;
}

export interface CooldownState {
  lastActionAt: Record<CareActionType, string | null>;
}

export interface DailyCareState {
  /** Local calendar date (YYYY-MM-DD) for the active 4 AM care period. */
  periodKey: string;
  completedActions: CareActionType[];
  pawPointsEarnedToday: number;
}

export interface CompanionEngineState {
  stats: CompanionStats;
  cooldowns: CooldownState;
  daily: DailyCareState;
  /** Local calendar date (YYYY-MM-DD) of the last processed 4 AM period. */
  lastProcessedPeriod: string | null;
}

export const METER_MIN = 0;
export const METER_MAX = 100;
export const DAILY_DECAY_JOY = 8;
export const DAILY_DECAY_ENERGY = 5;
export const DAILY_DECAY_FLOOR = 25;
export const COOLDOWN_MS = 4 * 60 * 60 * 1000;
export const DAILY_RESET_HOUR = 4;
