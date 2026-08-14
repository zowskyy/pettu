import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import {
  manipulateAsync,
  SaveFormat,
  type Action,
} from 'expo-image-manipulator';
import { Image } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { OnboardingPhoto } from '@/stores/onboardingStore';

const MAX_DIMENSION = 2048;
const OUTPUT_MIME = 'image/jpeg';
const BUCKET = 'pet-training-photos';

export interface ProcessedPhoto {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
  fileSizeBytes: number;
  contentHash: string;
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error),
    );
  });
}

export async function computePhotoHash(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, base64);
}

async function getFileSizeBytes(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || info.size == null) {
    throw new Error('Unable to read photo file size.');
  }
  return info.size;
}

function buildResizeActions(width: number, height: number): Action[] {
  const longest = Math.max(width, height);
  if (longest <= MAX_DIMENSION) {
    return [];
  }

  const scale = MAX_DIMENSION / longest;
  return [
    {
      resize: {
        width: Math.round(width * scale),
        height: Math.round(height * scale),
      },
    },
  ];
}

/**
 * Normalize orientation, resize to max 2048px, re-encode as JPEG to strip EXIF/metadata.
 */
export async function processPhoto(uri: string): Promise<ProcessedPhoto> {
  const { width, height } = await getImageSize(uri);
  const actions = buildResizeActions(width, height);

  const manipulated = await manipulateAsync(uri, actions, {
    compress: 0.85,
    format: SaveFormat.JPEG,
  });

  const processedSize = await getFileSizeBytes(manipulated.uri);
  const contentHash = await computePhotoHash(manipulated.uri);

  return {
    uri: manipulated.uri,
    width: manipulated.width,
    height: manipulated.height,
    mimeType: OUTPUT_MIME,
    fileSizeBytes: processedSize,
    contentHash,
  };
}

export async function prepareOnboardingPhoto(
  uri: string,
  mimeType: string,
  fileSizeBytes: number,
  width: number,
  height: number,
): Promise<OnboardingPhoto> {
  const processed = await processPhoto(uri);

  return {
    id: Crypto.randomUUID(),
    uri: processed.uri,
    width: processed.width,
    height: processed.height,
    mimeType: processed.mimeType,
    fileSizeBytes: processed.fileSizeBytes,
    contentHash: processed.contentHash,
    isFacial: false,
  };
}

export interface UploadPhotoResult {
  photoId: string;
  storagePath: string;
}

export async function uploadProcessedPhoto(
  companionId: string,
  photo: Pick<
    OnboardingPhoto,
    'uri' | 'mimeType' | 'fileSizeBytes' | 'width' | 'height' | 'contentHash'
  >,
  sortOrder: number,
  isFacial: boolean,
): Promise<UploadPhotoResult> {
  const photoId = Crypto.randomUUID();
  const storagePath = `${companionId}/${photoId}.jpg`;

  const response = await fetch(photo.uri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, blob, {
      contentType: photo.mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: insertError } = await supabase.from('companion_photos').insert({
    id: photoId,
    companion_id: companionId,
    storage_bucket: BUCKET,
    storage_path: storagePath,
    sort_order: sortOrder,
    is_facial: isFacial,
    mime_type: photo.mimeType,
    file_size_bytes: photo.fileSizeBytes,
    width: photo.width,
    height: photo.height,
    upload_status: 'uploaded',
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return { photoId, storagePath };
}
