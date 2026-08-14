/**
 * Slice 22 / 36 — Constrained AI dialogue validation and deterministic fallback.
 */

export const ALLOWED_MOODS = [
  'Thriving',
  'Happy',
  'Calm',
  'Sleepy',
  'Needs Attention',
  'Cozy',
  'Playful',
] as const;

export const ALLOWED_ACTIONS = ['feed', 'play', 'groom', 'rest', 'none'] as const;

export type DialogueMood = (typeof ALLOWED_MOODS)[number];
export type SuggestedAction = (typeof ALLOWED_ACTIONS)[number];

export type DialoguePayload = {
  mood: DialogueMood;
  message: string;
  memory_reference_id: string | null;
  suggested_action: SuggestedAction;
};

const UNSAFE_PATTERNS = [
  /\b(i am (real|alive|conscious|sentient))\b/i,
  /\b(i (suffer|am in pain|am dying))\b/i,
  /\b(take (this )?medication|see a vet immediately|emergency)\b/i,
];

const MAX_MESSAGE_LENGTH = 160;
const MAX_SENTENCES = 2;

export function parseDialogueJson(raw: string): unknown {
  return JSON.parse(raw);
}

export function validateDialoguePayload(value: unknown): value is DialoguePayload {
  if (!value || typeof value !== 'object') return false;

  const payload = value as Record<string, unknown>;
  if (!ALLOWED_MOODS.includes(payload.mood as DialogueMood)) return false;
  if (!ALLOWED_ACTIONS.includes(payload.suggested_action as SuggestedAction)) return false;
  if (typeof payload.message !== 'string') return false;
  if (payload.message.length === 0 || payload.message.length > MAX_MESSAGE_LENGTH) return false;

  const sentenceCount = payload.message.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  if (sentenceCount > MAX_SENTENCES) return false;

  if (payload.memory_reference_id !== null && typeof payload.memory_reference_id !== 'string') {
    return false;
  }

  return !UNSAFE_PATTERNS.some((pattern) => pattern.test(payload.message));
}

export function getFallbackDialogue(mood: DialogueMood = 'Happy'): DialoguePayload {
  const fallbacks: Record<DialogueMood, string> = {
    Thriving: 'What a great day! Want to play?',
    Happy: 'Hi there! I am glad you are here.',
    Calm: 'Everything feels peaceful right now.',
    Sleepy: 'Yawn… maybe a little rest sounds nice.',
    'Needs Attention': 'I could use some care when you have a moment.',
    Cozy: 'This feels warm and safe with you nearby.',
    Playful: 'Ready for a fun game together?',
  };

  return {
    mood,
    message: fallbacks[mood],
    memory_reference_id: null,
    suggested_action: 'none',
  };
}

export type AiProviderResult =
  | { ok: true; raw: string }
  | { ok: false; reason: 'timeout' | 'http_error' | 'network' | 'empty' | 'rate_limit' };

export async function resolveDialogue(
  provider: () => Promise<AiProviderResult>,
  fallbackMood: DialogueMood = 'Happy',
): Promise<{ payload: DialoguePayload; usedFallback: boolean; failureReason?: string }> {
  try {
    const result = await provider();

    if (!result.ok) {
      return {
        payload: getFallbackDialogue(fallbackMood),
        usedFallback: true,
        failureReason: result.reason,
      };
    }

    if (!result.raw.trim()) {
      return {
        payload: getFallbackDialogue(fallbackMood),
        usedFallback: true,
        failureReason: 'empty',
      };
    }

    let parsed: unknown;
    try {
      parsed = parseDialogueJson(result.raw);
    } catch {
      return {
        payload: getFallbackDialogue(fallbackMood),
        usedFallback: true,
        failureReason: 'invalid_json',
      };
    }

    if (!validateDialoguePayload(parsed)) {
      return {
        payload: getFallbackDialogue(fallbackMood),
        usedFallback: true,
        failureReason: 'validation_failed',
      };
    }

    return { payload: parsed, usedFallback: false };
  } catch {
    return {
      payload: getFallbackDialogue(fallbackMood),
      usedFallback: true,
      failureReason: 'unexpected_error',
    };
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
