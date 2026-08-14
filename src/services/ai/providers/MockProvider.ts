import type { AIProvider, ImageGenerationInput, ImageGenerationOutput, TextGenerationInput, TextGenerationOutput } from '../AIProvider';
import type { ArtStyle } from '@/types/generation';

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function styleLabel(style: ArtStyle): string {
  switch (style) {
    case 'cozy_storybook':
      return 'Cozy Storybook';
    case 'playful_3d':
      return 'Playful 3D';
    case 'pixel_adventure':
      return 'Pixel Adventure';
    default:
      return style;
  }
}

export class MockProvider implements AIProvider {
  readonly name = 'mock';

  async generateImage(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    const seed = hashString(`${input.prompt}:${input.style}:${input.referenceImageUrls.join(',')}`);
    const storagePath = `generated-companions/mock/${seed % 10000}/main.png`;

    return {
      imageUrl: `https://mock.petecho.local/${storagePath}`,
      storagePath,
      mimeType: 'image/png',
    };
  }

  async generateText(input: TextGenerationInput): Promise<TextGenerationOutput> {
    const seed = hashString(`${input.systemPrompt}:${input.userPrompt}`);
    const latencyMs = 12 + (seed % 40);

    if (input.responseFormat === 'json') {
      if (input.systemPrompt.includes('dialogue')) {
        return {
          text: JSON.stringify({
            mood: 'happy',
            message: 'Woof! Ready for another adventure together!',
            memory_reference_id: null,
            suggested_action: 'play',
          }),
          tokensUsed: 48,
          latencyMs,
        };
      }

      if (input.systemPrompt.includes('caption')) {
        return {
          text: JSON.stringify({
            caption: 'A sweet moment captured with your companion.',
          }),
          tokensUsed: 24,
          latencyMs,
        };
      }

      return {
        text: JSON.stringify({
          recapText: 'This month was full of cozy moments and playful adventures.',
          shareImagePath: `generated-recaps/mock/${seed % 1000}/share.png`,
        }),
        tokensUsed: 96,
        latencyMs,
      };
    }

    return {
      text: `Mock recap for ${styleLabel('cozy_storybook')} companion.`,
      tokensUsed: 32,
      latencyMs,
    };
  }
}

export const mockProvider = new MockProvider();
