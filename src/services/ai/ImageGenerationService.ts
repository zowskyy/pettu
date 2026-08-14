import type { CompanionGenerationPayload } from '@/types/generation';
import { activeProvider } from './providers';
import type { ImageGenerationOutput } from './AIProvider';

const COMPANION_IMAGE_SIZE = 1024;

function buildCompanionPrompt(payload: CompanionGenerationPayload): string {
  const traits = payload.personalityTraits.join(', ') || 'friendly';
  const favorites = payload.favoriteThings?.join(', ') || 'snuggles';
  const quirk = payload.quirk ?? 'a charming little habit';
  const nickname = payload.nickname ?? payload.name;

  return [
    `Create a ${payload.artStyle.replace(/_/g, ' ')} illustration of a ${payload.species} named ${payload.name}.`,
    `Nickname: ${nickname}.`,
    `Personality: ${traits}.`,
    `Loves: ${favorites}.`,
    `Quirk: ${quirk}.`,
    'Match the likeness from reference photos. Warm, family-friendly, no text in image.',
  ].join(' ');
}

export async function generateCompanionImage(
  payload: CompanionGenerationPayload,
): Promise<ImageGenerationOutput> {
  const prompt = buildCompanionPrompt(payload);

  return activeProvider.generateImage({
    prompt,
    referenceImageUrls: payload.referenceImageUrls ?? [],
    style: payload.artStyle,
    width: COMPANION_IMAGE_SIZE,
    height: COMPANION_IMAGE_SIZE,
  });
}
