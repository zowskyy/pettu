import type { Mood } from '../../lib/companionEngine/types';

/** Database `companion_mood` enum values (snake_case). */
export type DbMood =
  | 'thriving'
  | 'happy'
  | 'calm'
  | 'sleepy'
  | 'needs_attention'
  | 'cozy'
  | 'playful';

const MOOD_TO_DB: Record<Mood, DbMood> = {
  Thriving: 'thriving',
  Happy: 'happy',
  Calm: 'calm',
  Sleepy: 'sleepy',
  'Needs Attention': 'needs_attention',
  Cozy: 'cozy',
  Playful: 'playful',
};

const DB_TO_MOOD: Record<DbMood, Mood> = {
  thriving: 'Thriving',
  happy: 'Happy',
  calm: 'Calm',
  sleepy: 'Sleepy',
  needs_attention: 'Needs Attention',
  cozy: 'Cozy',
  playful: 'Playful',
};

export function moodToDb(mood: Mood): DbMood {
  return MOOD_TO_DB[mood];
}

export function moodFromDb(value: string | null | undefined): Mood | null {
  if (!value) return null;
  const normalized = value.toLowerCase().replace(/\s+/g, '_') as DbMood;
  return DB_TO_MOOD[normalized] ?? null;
}

export function normalizeDialogueMood(value: string): Mood | null {
  const trimmed = value.trim();
  const fromDb = moodFromDb(trimmed);
  if (fromDb) return fromDb;

  const titleCase = trimmed
    .split(/[\s_]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ') as Mood;

  return MOOD_TO_DB[titleCase] ? titleCase : null;
}
