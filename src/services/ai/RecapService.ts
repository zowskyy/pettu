import { supabase } from '@/lib/supabase';
import type { RecapInput, RecapResult } from './types';

/**
 * Stub monthly recap generation via edge function.
 */
export async function generateRecap(input: RecapInput): Promise<RecapResult> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-recap', {
      body: {
        companion_id: input.companionId,
        companion_name: input.companionName,
        month: input.month,
        memories: input.memories,
      },
    });

    if (error) throw error;

    if (
      typeof data === 'object' &&
      data !== null &&
      'recap_text' in data &&
      typeof (data as { recap_text: unknown }).recap_text === 'string'
    ) {
      const recapText = (data as { recap_text: string }).recap_text.trim();
      if (recapText) {
        return { recapText, source: 'ai' };
      }
    }
  } catch {
    // Use deterministic fallback below.
  }

  const titles = input.memories.map((memory) => memory.title).join(', ');
  const recapText = `${input.companionName} had a wonderful month with memories like ${titles}.`;

  return { recapText, source: 'fallback' };
}

/** Slice 16 facade — bridges RecapMemorySummary to recap generator stub. */
export async function generateRecapContent(
  memories: Array<{ id: string; title: string; note: string; memoryDate: string }>,
): Promise<{ recapText: string; shareImagePath: string }> {
  const result = await generateRecap({
    companionId: 'pending',
    companionName: 'Companion',
    month: new Date().toISOString().slice(0, 7),
    memories: memories.map((memory) => ({
      id: memory.id,
      title: memory.title,
      note: memory.note,
      memory_date: memory.memoryDate,
    })),
  });

  return {
    recapText: result.recapText,
    shareImagePath: '',
  };
}
