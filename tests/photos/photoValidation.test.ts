import { describe, expect, it } from 'vitest';
import {
  MAX_FILE_SIZE_BYTES,
  MIN_FACIAL_PHOTOS,
  MIN_PHOTOS,
  validatePhotoCollection,
  validatePhotoFile,
  isAllowedMimeType,
  isDuplicateHash,
} from '@/features/photos/photoValidation';

const validCandidate = {
  uri: 'file:///photo.jpg',
  mimeType: 'image/jpeg',
  fileSizeBytes: 1024 * 1024,
  width: 1200,
  height: 900,
  contentHash: 'hash-a',
};

describe('photoValidation', () => {
  it('accepts allowed mime types', () => {
    expect(isAllowedMimeType('image/jpeg')).toBe(true);
    expect(isAllowedMimeType('image/png')).toBe(true);
    expect(isAllowedMimeType('image/gif')).toBe(false);
  });

  it('rejects invalid file type', () => {
    const result = validatePhotoFile({
      ...validCandidate,
      mimeType: 'application/pdf',
    });
    expect(result.valid).toBe(false);
    expect(result.code).toBe('invalid_type');
  });

  it('rejects oversized files', () => {
    const result = validatePhotoFile({
      ...validCandidate,
      fileSizeBytes: MAX_FILE_SIZE_BYTES + 1,
    });
    expect(result.valid).toBe(false);
    expect(result.code).toBe('file_too_large');
  });

  it('rejects small dimensions', () => {
    const result = validatePhotoFile({
      ...validCandidate,
      width: 200,
      height: 200,
    });
    expect(result.valid).toBe(false);
    expect(result.code).toBe('dimensions_too_small');
  });

  it('detects duplicate hashes', () => {
    expect(isDuplicateHash('hash-a', ['hash-a', 'hash-b'])).toBe(true);
    const result = validatePhotoFile(validCandidate, ['hash-a']);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('duplicate');
  });

  it('requires minimum photo count', () => {
    const photos = Array.from({ length: MIN_PHOTOS - 1 }, (_, i) => ({
      contentHash: `hash-${i}`,
      isFacial: true,
    }));
    const result = validatePhotoCollection(photos);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('too_few_photos');
  });

  it('requires minimum facial photos', () => {
    const photos = Array.from({ length: MIN_PHOTOS }, (_, i) => ({
      contentHash: `hash-${i}`,
      isFacial: i < MIN_FACIAL_PHOTOS - 1,
    }));
    const result = validatePhotoCollection(photos);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('too_few_facial');
  });

  it('accepts valid collection', () => {
    const photos = Array.from({ length: MIN_PHOTOS }, (_, i) => ({
      contentHash: `hash-${i}`,
      isFacial: i < MIN_FACIAL_PHOTOS,
    }));
    expect(validatePhotoCollection(photos).valid).toBe(true);
  });
});
