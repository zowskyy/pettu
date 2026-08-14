import { supabase } from '@/lib/supabase';
import {
  processCompanionGenerationJob,
  queueGenerationJob,
} from '@/services/generationJobService';
import type { ArtStyle, CompanionPhotoRef } from '@/types/generation';

export interface CreateCompanionInput {
  species: string;
  photos: CompanionPhotoRef[];
  personality: string[];
  artStyle: ArtStyle;
  name?: string;
  nickname?: string;
  favoriteThings?: string[];
  quirk?: string;
}

export interface CreateCompanionResult {
  companionId: string;
  jobId: string;
}

function defaultCompanionName(species: string): string {
  const normalized = species.trim();
  if (!normalized) {
    return 'Companion';
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export async function createCompanion(
  input: CreateCompanionInput,
): Promise<CreateCompanionResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error('Must be signed in to create a companion.');
  }

  const name = input.name?.trim() || defaultCompanionName(input.species);

  const { data: companion, error: companionError } = await supabase
    .from('companions')
    .insert({
      owner_id: user.id,
      name,
      nickname: input.nickname ?? null,
      species: input.species,
      personality_traits: input.personality,
      favorite_things: input.favoriteThings ?? [],
      quirk: input.quirk ?? null,
      art_style: input.artStyle,
      onboarding_step: 'generating',
      onboarding_complete: false,
    })
    .select('id')
    .single();

  if (companionError) {
    throw companionError;
  }

  if (input.photos.length > 0) {
    const photoRows = input.photos.map((photo, index) => ({
      companion_id: companion.id,
      storage_bucket: photo.storageBucket ?? 'pet-training-photos',
      storage_path: photo.storagePath,
      sort_order: index,
      is_facial: photo.isFacial ?? false,
      upload_status: 'ready',
    }));

    const { error: photoError } = await supabase
      .from('companion_photos')
      .insert(photoRows);

    if (photoError) {
      throw photoError;
    }
  }

  const payload = {
    species: input.species,
    name,
    nickname: input.nickname,
    personalityTraits: input.personality,
    favoriteThings: input.favoriteThings,
    quirk: input.quirk,
    artStyle: input.artStyle,
    photoIds: input.photos.map((photo) => photo.id),
    referenceImageUrls: input.photos.map(
      (photo) => `${photo.storageBucket ?? 'pet-training-photos'}/${photo.storagePath}`,
    ),
  };

  const job = await queueGenerationJob({
    companionId: companion.id,
    profileId: user.id,
    jobType: 'companion_image',
    payload,
  });

  void processCompanionGenerationJob(job.id, payload);

  return {
    companionId: companion.id,
    jobId: job.id,
  };
}

export async function completeOnboarding(companionId: string): Promise<void> {
  const { error } = await supabase
    .from('companions')
    .update({
      onboarding_complete: true,
      onboarding_step: 'complete',
    })
    .eq('id', companionId);

  if (error) {
    throw error;
  }
}

export async function getCompanionForReveal(companionId: string) {
  const { data, error } = await supabase
    .from('companions')
    .select(
      'id, name, nickname, species, personality_traits, art_style, generated_image_path, generated_image_bucket, onboarding_step',
    )
    .eq('id', companionId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}
