import { generateCaption } from '@/services/ai/CaptionService';
import type { CaptionInput, CaptionResult } from '@/services/ai/types';

/** Feature wrapper for optional post-create memory captions (Slice 24 stub). */
export async function generateMemoryCaption(
  input: CaptionInput,
): Promise<CaptionResult> {
  return generateCaption(input);
}
