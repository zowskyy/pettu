import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { ArtStyle, PetSpecies } from '@/stores/onboardingStore';
import { uploadProcessedPhoto } from '@/features/photos/photoPipeline';
import type { OnboardingPhoto } from '@/stores/onboardingStore';

export interface CompanionDraft {
  species: PetSpecies;
  name: string;
  breed: string;
  colorMarkings: string;
  personalityTraits: string[];
  favoriteThings: string[];
  quirk: string;
  nickname: string;
  artStyle: ArtStyle;
}

export async function createCompanionDraft(
  ownerId: string,
  draft: CompanionDraft,
): Promise<string> {
  const displayName = draft.nickname.trim() || draft.name.trim();

  const { data, error } = await supabase
    .from('companions')
    .insert({
      owner_id: ownerId,
      name: draft.name.trim(),
      nickname: displayName,
      species: draft.species,
      personality_traits: {
        traits: draft.personalityTraits,
        breed: draft.breed || null,
        color_markings: draft.colorMarkings || null,
      },
      favorite_things: draft.favoriteThings,
      quirk: draft.quirk || null,
      art_style: draft.artStyle,
      onboarding_complete: false,
      onboarding_step: 'creating',
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create companion.');
  }

  return data.id;
}

export async function uploadCompanionPhotos(
  companionId: string,
  photos: OnboardingPhoto[],
): Promise<void> {
  for (let index = 0; index < photos.length; index += 1) {
    const photo = photos[index];
    await uploadProcessedPhoto(companionId, photo, index, photo.isFacial);
  }
}

export async function markOnboardingComplete(companionId: string): Promise<void> {
  const { error } = await supabase
    .from('companions')
    .update({
      onboarding_complete: true,
      onboarding_step: 'complete',
    })
    .eq('id', companionId);

  if (error) {
    throw new Error(error.message);
  }

  useAuthStore.getState().setOnboardingComplete(true);
}
