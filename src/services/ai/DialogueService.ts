import { supabase } from '@/lib/supabase';
import { validateDialoguePayload } from './dialogueValidator';
import { getFallbackDialogue } from './fallbackDialogue';
import type { DialogueContext, DialogueResponse } from './types';
import type {
  DialogueContext as GenerationDialogueContext,
  DialogueResult,
  CompanionMood,
} from '@/types/generation';
import { moodFromDb, moodToDb } from '@/lib/moodMapping';
import type { Mood } from '../../../lib/companionEngine/types';

function generationMoodToEngine(mood: CompanionMood): Mood {
  return moodFromDb(mood) ?? 'Happy';
}

function engineMoodToGeneration(mood: Mood): CompanionMood {
  return moodToDb(mood);
}

/**
 * Thin facade over the generate-dialogue edge function.
 * Validates AI output strictly; care actions never depend on this succeeding.
 */
export async function generateDialogue(
  context: DialogueContext,
): Promise<DialogueResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-dialogue', {
      body: {
        companion_id: context.companionId,
        companion_name: context.companionName,
        species: context.species,
        personality_traits: context.personalityTraits,
        mood: moodToDb(context.mood),
        recent_action: context.recentAction,
        optional_memory: context.optionalMemory ?? null,
      },
    });

    if (error) throw error;

    const validation = validateDialoguePayload(data);
    if (validation.valid && validation.value) {
      return validation.value;
    }
  } catch {
    // Fall through to deterministic fallback.
  }

  return getFallbackDialogue(
    context.companionId,
    context.mood,
    context.recentAction,
  );
}

/** Slice 16 facade — bridges generation types to validated dialogue pipeline. */
export async function generateDialogueResponse(
  context: GenerationDialogueContext,
): Promise<DialogueResult> {
  const response = await generateDialogue({
    companionId: 'legacy',
    companionName: context.companionName,
    species: context.species,
    personalityTraits: context.personalityTraits,
    mood: generationMoodToEngine(context.mood),
    recentAction: context.recentAction,
    optionalMemory: context.optionalMemory
      ? {
          id: context.optionalMemory.id,
          title: context.optionalMemory.title,
          note: context.optionalMemory.note,
        }
      : undefined,
  });

  return {
    mood: engineMoodToGeneration(response.mood),
    message: response.message,
    memory_reference_id: response.memory_reference_id,
    suggested_action: response.suggested_action,
  };
}

export { validateDialoguePayload } from './dialogueValidator';
export { getFallbackDialogue } from './fallbackDialogue';
