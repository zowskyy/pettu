import { describe, expect, it } from 'vitest';
import { validateDialoguePayload } from '../../src/services/ai/dialogueValidator';

const validPayload = {
  mood: 'happy',
  message: 'That was delicious!',
  memory_reference_id: null,
  suggested_action: 'play',
};

describe('validateDialoguePayload', () => {
  it('accepts valid JSON object', () => {
    const result = validateDialoguePayload(validPayload);
    expect(result.valid).toBe(true);
    expect(result.value?.message).toBe('That was delicious!');
    expect(result.value?.mood).toBe('Happy');
    expect(result.value?.suggested_action).toBe('play');
  });

  it('accepts valid JSON string', () => {
    const result = validateDialoguePayload(JSON.stringify(validPayload));
    expect(result.valid).toBe(true);
  });

  it('rejects invalid JSON', () => {
    const result = validateDialoguePayload('{not json}');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('invalid_json');
  });

  it('rejects messages over 160 characters', () => {
    const result = validateDialoguePayload({
      ...validPayload,
      message: 'a'.repeat(161),
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('message_too_long');
  });

  it('rejects more than two sentences', () => {
    const result = validateDialoguePayload({
      ...validPayload,
      message: 'One. Two. Three.',
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('too_many_sentences');
  });

  it('rejects medical advice', () => {
    const result = validateDialoguePayload({
      ...validPayload,
      message: 'You should see the vet about that.',
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('medical_advice');
  });

  it('rejects consciousness claims', () => {
    const result = validateDialoguePayload({
      ...validPayload,
      message: 'I think therefore I am.',
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('consciousness_claim');
  });

  it('rejects invalid mood enum', () => {
    const result = validateDialoguePayload({
      ...validPayload,
      mood: 'furious',
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('invalid_mood');
  });

  it('rejects invalid suggested action', () => {
    const result = validateDialoguePayload({
      ...validPayload,
      suggested_action: 'fly',
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('invalid_suggested_action');
  });
});
