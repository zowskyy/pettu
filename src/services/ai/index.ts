import type {
  CaptionInput,
  CompanionGenerationPayload,
  DialogueContext,
  DialogueResult,
  RecapMemorySummary,
  RecapResult,
} from '@/types/generation';
import type { ImageGenerationOutput } from './AIProvider';
import { generateCompanionImage } from './ImageGenerationService';
import { generateDialogueResponse } from './DialogueService';
import { generateCaptionText } from './CaptionService';
import { generateRecapContent } from './RecapService';

export type {
  AIProvider,
  ImageGenerationInput,
  ImageGenerationOutput,
  TextGenerationInput,
  TextGenerationOutput,
} from './AIProvider';

export { activeProvider } from './providers';

export async function generateCompanion(
  payload: CompanionGenerationPayload,
): Promise<ImageGenerationOutput> {
  return generateCompanionImage(payload);
}

export async function generateDialogue(
  context: DialogueContext,
): Promise<DialogueResult> {
  return generateDialogueResponse(context);
}

export async function generateCaption(input: CaptionInput): Promise<string> {
  return generateCaptionText(input);
}

export async function generateRecap(
  memories: RecapMemorySummary[],
): Promise<RecapResult> {
  return generateRecapContent(memories);
}
