export type ArtStyle = 'cozy_storybook' | 'playful_3d' | 'pixel_adventure';

export type GenerationJobStatus =
  | 'queued'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'expired';

export type GenerationJobType =
  | 'companion_image'
  | 'dialogue'
  | 'caption'
  | 'recap';

export type CompanionMood =
  | 'thriving'
  | 'happy'
  | 'calm'
  | 'sleepy'
  | 'needs_attention'
  | 'cozy'
  | 'playful';

export type CareActionType = 'feed' | 'play' | 'groom' | 'rest';

export interface CompanionPhotoRef {
  id: string;
  storagePath: string;
  storageBucket?: string;
  isFacial?: boolean;
}

export interface GenerationJobRecord {
  id: string;
  companion_id: string;
  profile_id: string;
  ai_generation_id: string | null;
  job_type: GenerationJobType;
  status: GenerationJobStatus;
  attempt_count: number;
  max_attempts: number;
  error_message: string | null;
  result_bucket: string | null;
  result_path: string | null;
  expires_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanionGenerationPayload {
  species: string;
  name: string;
  nickname?: string;
  personalityTraits: string[];
  favoriteThings?: string[];
  quirk?: string;
  artStyle: ArtStyle;
  photoIds: string[];
  referenceImageUrls?: string[];
}

export interface DialogueContext {
  companionName: string;
  species: string;
  personalityTraits: string[];
  mood: CompanionMood;
  recentAction: CareActionType;
  optionalMemory?: {
    id: string;
    title: string;
    note: string;
  };
}

export interface DialogueResult {
  mood: CompanionMood;
  message: string;
  memory_reference_id: string | null;
  suggested_action: CareActionType | null;
}

export interface CaptionInput {
  memoryTitle: string;
  memoryNote: string;
  photoUrl?: string;
}

export interface RecapMemorySummary {
  id: string;
  title: string;
  note: string;
  memoryDate: string;
}

export interface RecapResult {
  recapText: string;
  shareImagePath: string;
}
