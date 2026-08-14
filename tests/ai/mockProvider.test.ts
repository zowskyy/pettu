import { describe, expect, it } from 'vitest';
import { generateCompanionImage } from '../../src/services/ai/ImageGenerationService';
import { generateDialogueResponse } from '../../src/services/ai/DialogueService';
import { generateCaptionText } from '../../src/services/ai/CaptionService';
import { generateRecapContent } from '../../src/services/ai/RecapService';
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

  it('returns valid dialogue JSON', async () => {
    const dialogue = await generateDialogueResponse({
      companionName: 'Buddy',
      species: 'dog',
      personalityTraits: ['loyal'],
      mood: 'happy',
      recentAction: 'feed',
    });

    expect(dialogue.message.length).toBeLessThanOrEqual(160);
    expect(dialogue.suggested_action).toBeNull();
  });

  it('returns caption under 180 chars', async () => {
    const caption = await generateCaptionText({
      memoryTitle: 'Park day',
      memoryNote: 'Loved the frisbee',
    });

    expect(caption.length).toBeGreaterThan(0);
    expect(caption.length).toBeLessThanOrEqual(180);
  });

  it('returns recap content', async () => {
    const recap = await generateRecapContent([
      {
        id: 'm1',
        title: 'Beach walk',
        note: 'Splashed in the waves',
        memoryDate: '2026-08-01',
      },
    ]);

    expect(recap.recapText.length).toBeGreaterThan(0);
    expect(recap.shareImagePath).toBe('');
  });

  it('can swap provider without changing facade exports', () => {
    expect(mockProvider.name).toBe('mock');
  });
});
