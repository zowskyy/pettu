import type { CareActionType, Mood } from '../../../lib/companionEngine/types';
import { normalizeDialogueMood } from '@/lib/moodMapping';
import type { DialogueResponse } from './types';

const MAX_MESSAGE_LENGTH = 160;
const MAX_SENTENCES = 2;

const ALLOWED_ACTIONS: readonly (CareActionType | null)[] = [
  'feed',
  'play',
  'groom',
  'rest',
  null,
];

const MEDICAL_PATTERN =
  /\b(vet|veterinar|medicine|medication|sick|illness|diagnos|prescri|symptom|treatment|doctor|hospital)\b/i;

const CONSCIOUSNESS_PATTERN =
  /\b(i think|i feel pain|i am conscious|i'm conscious|i know i am|sentient|self[- ]aware)\b/i;

const SUFFERING_PATTERN =
  /\b(hurts|hurting|dying|scared alone|in pain|suffering|abandon|neglect|starving|abused)\b/i;

export interface DialogueValidationResult {
  valid: boolean;
  value?: DialogueResponse;
  reason?: string;
}

function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const parts = trimmed.split(/[.!?]+/).filter((part) => part.trim().length > 0);
  return parts.length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSuggestedAction(value: unknown): CareActionType | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const action = value.toLowerCase().trim();
  if (action === 'feed' || action === 'play' || action === 'groom' || action === 'rest') {
    return action;
  }
  return undefined;
}

function parseMemoryReferenceId(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function failsSafetyCheck(message: string): string | null {
  if (MEDICAL_PATTERN.test(message)) return 'medical_advice';
  if (CONSCIOUSNESS_PATTERN.test(message)) return 'consciousness_claim';
  if (SUFFERING_PATTERN.test(message)) return 'suffering_language';
  return null;
}

export function validateDialoguePayload(raw: unknown): DialogueValidationResult {
  let parsed: unknown = raw;

  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { valid: false, reason: 'invalid_json' };
    }
  }

  if (!isRecord(parsed)) {
    return { valid: false, reason: 'invalid_shape' };
  }

  if (typeof parsed.message !== 'string') {
    return { valid: false, reason: 'missing_message' };
  }

  const message = parsed.message.trim();
  if (!message) {
    return { valid: false, reason: 'empty_message' };
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, reason: 'message_too_long' };
  }

  if (countSentences(message) > MAX_SENTENCES) {
    return { valid: false, reason: 'too_many_sentences' };
  }

  const safetyIssue = failsSafetyCheck(message);
  if (safetyIssue) {
    return { valid: false, reason: safetyIssue };
  }

  if (typeof parsed.mood !== 'string') {
    return { valid: false, reason: 'missing_mood' };
  }

  const mood = normalizeDialogueMood(parsed.mood);
  if (!mood) {
    return { valid: false, reason: 'invalid_mood' };
  }

  if (!('memory_reference_id' in parsed)) {
    return { valid: false, reason: 'missing_memory_reference_id' };
  }

  const memoryReferenceId = parseMemoryReferenceId(parsed.memory_reference_id);
  if (memoryReferenceId === undefined) {
    return { valid: false, reason: 'invalid_memory_reference_id' };
  }

  if (!('suggested_action' in parsed)) {
    return { valid: false, reason: 'missing_suggested_action' };
  }

  const suggestedAction = parseSuggestedAction(parsed.suggested_action);
  if (suggestedAction === undefined) {
    return { valid: false, reason: 'invalid_suggested_action' };
  }

  if (!ALLOWED_ACTIONS.includes(suggestedAction)) {
    return { valid: false, reason: 'invalid_suggested_action' };
  }

  return {
    valid: true,
    value: {
      mood,
      message,
      memory_reference_id: memoryReferenceId,
      suggested_action: suggestedAction,
    },
  };
}

export const DIALOGUE_LIMITS = {
  maxMessageLength: MAX_MESSAGE_LENGTH,
  maxSentences: MAX_SENTENCES,
} as const;
