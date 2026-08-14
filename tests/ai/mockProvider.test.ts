import { describe, expect, it } from 'vitest';
import { generateCompanionImage } from '../../src/services/ai/ImageGenerationService';
import { mockProvider } from '../../src/services/ai/providers/MockProvider';

describe('MockProvider', () => {
  it('returns deterministic companion image output', async () => {
    const payload = {
      species: 'dog',
      name: 'Buddy',
      personalityTraits: ['playful'],
      artStyle: 'cozy_storybook' as const,
      photoIds: ['photo-1'],
      referenceImageUrls: ['pet-training-photos/buddy-1.jpg'],
    };

    const first = await generateCompanionImage(payload);
    const second = await generateCompanionImage(payload);

    expect(first.storagePath).toBe(second.storagePath);
    expect(first.mimeType).toBe('image/png');
  });

  it('generates distinct paths per art style', async () => {
    const base = {
      species: 'cat',
      name: 'Luna',
      personalityTraits: ['calm'],
      photoIds: ['photo-1'],
      referenceImageUrls: ['pet-training-photos/luna-1.jpg'],
    };

    const cozy = await generateCompanionImage({
      ...base,
      artStyle: 'cozy_storybook',
    });
    const pixel = await generateCompanionImage({
      ...base,
      artStyle: 'pixel_adventure',
    });

    expect(cozy.storagePath).not.toBe(pixel.storagePath);
  });

  it('exposes provider name for swap verification', () => {
    expect(mockProvider.name).toBe('mock');
  });

  it('returns deterministic text from mock provider', async () => {
    const first = await mockProvider.generateText({
      systemPrompt: 'dialogue generator',
      userPrompt: 'Companion: Buddy',
      maxTokens: 80,
      responseFormat: 'json',
    });
    const second = await mockProvider.generateText({
      systemPrompt: 'dialogue generator',
      userPrompt: 'Companion: Buddy',
      maxTokens: 80,
      responseFormat: 'json',
    });

    expect(first.text).toBe(second.text);
  });
});
