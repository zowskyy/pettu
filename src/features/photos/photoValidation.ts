export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MIN_PHOTO_DIMENSION = 400;
export const MIN_PHOTOS = 5;
export const MAX_PHOTOS = 10;
export const MIN_FACIAL_PHOTOS = 3;

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export interface PhotoCandidate {
  uri: string;
  mimeType: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  contentHash?: string;
}

export type PhotoValidationErrorCode =
  | 'invalid_type'
  | 'file_too_large'
  | 'dimensions_too_small'
  | 'duplicate'
  | 'missing_hash'
  | 'too_few_photos'
  | 'too_many_photos'
  | 'too_few_facial';

export interface PhotoValidationResult {
  valid: boolean;
  error?: string;
  code?: PhotoValidationErrorCode;
}

export interface CollectionPhoto {
  contentHash: string;
  isFacial: boolean;
}

function normalizeMimeType(mimeType: string): string {
  return mimeType.toLowerCase().split(';')[0].trim();
}

export function isAllowedMimeType(mimeType: string): boolean {
  const normalized = normalizeMimeType(mimeType);
  return ALLOWED_MIME_TYPES.includes(normalized as AllowedMimeType);
}

export function isDuplicateHash(hash: string, existingHashes: string[]): boolean {
  return existingHashes.includes(hash);
}

export function validatePhotoFile(
  candidate: PhotoCandidate,
  existingHashes: string[] = [],
): PhotoValidationResult {
  if (!isAllowedMimeType(candidate.mimeType)) {
    return {
      valid: false,
      code: 'invalid_type',
      error: 'Photo must be JPEG, PNG, or WebP.',
    };
  }

  if (candidate.fileSizeBytes <= 0 || candidate.fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      code: 'file_too_large',
      error: 'Photo must be 10 MB or smaller.',
    };
  }

  const shortestSide = Math.min(candidate.width, candidate.height);
  if (
    candidate.width <= 0 ||
    candidate.height <= 0 ||
    shortestSide < MIN_PHOTO_DIMENSION
  ) {
    return {
      valid: false,
      code: 'dimensions_too_small',
      error: `Photo must be at least ${MIN_PHOTO_DIMENSION}px on the shortest side.`,
    };
  }

  if (candidate.contentHash) {
    if (isDuplicateHash(candidate.contentHash, existingHashes)) {
      return {
        valid: false,
        code: 'duplicate',
        error: 'This photo was already added.',
      };
    }
  }

  return { valid: true };
}

export function validatePhotoCollection(photos: CollectionPhoto[]): PhotoValidationResult {
  if (photos.length < MIN_PHOTOS) {
    return {
      valid: false,
      code: 'too_few_photos',
      error: `Add at least ${MIN_PHOTOS} photos to continue.`,
    };
  }

  if (photos.length > MAX_PHOTOS) {
    return {
      valid: false,
      code: 'too_many_photos',
      error: `You can add up to ${MAX_PHOTOS} photos.`,
    };
  }

  const facialCount = photos.filter((p) => p.isFacial).length;
  if (facialCount < MIN_FACIAL_PHOTOS) {
    return {
      valid: false,
      code: 'too_few_facial',
      error: `Mark at least ${MIN_FACIAL_PHOTOS} clear facial photos to continue.`,
    };
  }

  return { valid: true };
}
