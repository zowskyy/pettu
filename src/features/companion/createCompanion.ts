import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import {
  processCompanionGenerationJob,
  queueGenerationJob,
} from '@/services/generationJobService';
import type {
  ArtStyle,
  CompanionGenerationPayload,
  CompanionPhotoRef,
} from '@/types/generation';

export interface StartGenerationInput {
  species: string;
  photos: CompanionPhotoRef[];
  personality: string[];
  artStyle: ArtStyle;
  name?: string;
  nickname?: string;
  favoriteThings?: string[];
  quirk?: string;
}

export interface CreateCompanionInput extends StartGenerationInput {
  /** When set, starts generation for an existing draft (photos already uploaded). */
  companionId?: string;
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

function buildGenerationPayload(
  input: StartGenerationInput,
  name: string,
): CompanionGenerationPayload {
  return {
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
}

export async function fetchCompanionPhotoRefs(
  companionId: string,
): Promise<CompanionPhotoRef[]> {
  const { data, error } = await supabase
    .from('companion_photos')
    .select('id, storage_bucket, storage_path, is_facial')
    .eq('companion_id', companionId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((photo) => ({
    id: photo.id,
    storagePath: photo.storage_path,
    storageBucket: photo.storage_bucket,
    isFacial: photo.is_facial,
  }));
}

export async function startCompanionGeneration(
  companionId: string,
  profileId: string,
  input: StartGenerationInput,
): Promise<CreateCompanionResult> {
  const name = input.name?.trim() || defaultCompanionName(input.species);
  const payload = buildGenerationPayload(input, name);

  await supabase
    .from('companions')
    .update({
      onboarding_step: 'generating',
      art_style: input.artStyle,
    })
    .eq('id', companionId);

  const job = await queueGenerationJob({
    companionId,
    profileId,
    jobType: 'companion_image',
    payload,
  });

  void processCompanionGenerationJob(job.id, payload);

  return {
    companionId,
    jobId: job.id,
  };
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

  if (input.companionId) {
    return startCompanionGeneration(input.companionId, user.id, input);
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

  return startCompanionGeneration(companion.id, user.id, {
    ...input,
    name,
  });
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

  useAuthStore.getState().setOnboardingComplete(true);
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
