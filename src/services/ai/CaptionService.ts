import { supabase } from '@/lib/supabase';
import type { CaptionInput, CaptionResult } from './types';

const MAX_CAPTION_LENGTH = 180;

function buildFallbackCaption(input: CaptionInput): string {
  const note = input.note?.trim();
  if (note && note.length <= MAX_CAPTION_LENGTH) return note;
  if (note) return note.slice(0, MAX_CAPTION_LENGTH);
  if (input.title.trim().length <= MAX_CAPTION_LENGTH) return input.title.trim();
  return input.title.trim().slice(0, MAX_CAPTION_LENGTH);
}

/**
 * Stub caption generation via edge function; falls back to user note/title.
 */
export async function generateCaption(input: CaptionInput): Promise<CaptionResult> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-caption', {
      body: {
        memory_id: input.memoryId,
        title: input.title,
        note: input.note,
        photo_url: input.photoUrl ?? null,
      },
    });

    if (error) throw error;

    if (
      typeof data === 'object' &&
      data !== null &&
      'caption' in data &&
      typeof (data as { caption: unknown }).caption === 'string'
    ) {
      const caption = (data as { caption: string }).caption.trim();
      if (caption && caption.length <= MAX_CAPTION_LENGTH) {
        return { caption, source: 'ai' };
      }
    }
  } catch {
    // Use deterministic fallback below.
  }

  return {
    caption: buildFallbackCaption(input),
    source: 'fallback',
  };
}

/** Slice 16 facade — returns caption string for ai/index.ts. */
export async function generateCaptionText(input: {
  memoryTitle: string;
  memoryNote: string;
  photoUrl?: string;
}): Promise<string> {
  const result = await generateCaption({
    memoryId: 'pending',
    title: input.memoryTitle,
    note: input.memoryNote,
    photoUrl: input.photoUrl,
  });
  return result.caption;
}
