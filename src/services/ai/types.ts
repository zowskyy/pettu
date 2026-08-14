import type { CareActionType, Mood } from '../../../lib/companionEngine/types';

export interface DialogueResponse {
  mood: Mood;
  message: string;
  memory_reference_id: string | null;
  suggested_action: CareActionType | null;
}

export interface DialogueContext {
  companionId: string;
  companionName: string;
  species: string;
  personalityTraits: string[];
  mood: Mood;
  recentAction: CareActionType;
  optionalMemory?: {
    id: string;
    title: string;
    note: string | null;
  };
}

export interface CaptionInput {
  memoryId: string;
  title: string;
  note: string | null;
  photoUrl?: string;
}

export interface CaptionResult {
  caption: string;
  source: 'ai' | 'fallback';
}

export interface RecapInput {
  companionId: string;
  companionName: string;
  month: string;
  memories: Array<{
    id: string;
    title: string;
    note: string | null;
    memory_date: string;
  }>;
}

export interface RecapResult {
  recapText: string;
  source: 'ai' | 'fallback';
}
