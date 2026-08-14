import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { onboardingStyles as styles } from '@/features/onboarding/onboardingStyles';
import { useOnboardingStore } from '@/stores/onboardingStore';
import {
  MAX_PHOTOS,
  MIN_FACIAL_PHOTOS,
  MIN_PHOTOS,
  validatePhotoCollection,
  validatePhotoFile,
} from '@/features/photos/photoValidation';
import { prepareOnboardingPhoto } from '@/features/photos/photoPipeline';

export default function OnboardingPhotos() {
  const photos = useOnboardingStore((s) => s.photos);
  const addPhoto = useOnboardingStore((s) => s.addPhoto);
  const removePhoto = useOnboardingStore((s) => s.removePhoto);
  const toggleFacial = useOnboardingStore((s) => s.toggleFacial);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const facialCount = photos.filter((p) => p.isFacial).length;

  async function handlePickPhotos() {
    if (photos.length >= MAX_PHOTOS) {
      setError(`You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add pet photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 1,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const existingHashes = photos.map((p) => p.contentHash);
      let addedCount = photos.length;

      for (const asset of result.assets) {
        if (addedCount >= MAX_PHOTOS) {
          break;
        }

        const mimeType = asset.mimeType ?? 'image/jpeg';
        const fileSizeBytes = asset.fileSize ?? 0;
        const width = asset.width ?? 0;
        const height = asset.height ?? 0;

        const preValidation = validatePhotoFile(
          { uri: asset.uri, mimeType, fileSizeBytes, width, height },
          existingHashes,
        );

        if (!preValidation.valid) {
          setError(preValidation.error ?? 'Invalid photo.');
          continue;
        }

        const processed = await prepareOnboardingPhoto(
          asset.uri,
          mimeType,
          fileSizeBytes,
          width,
          height,
        );

        const postValidation = validatePhotoFile(processed, existingHashes);
        if (!postValidation.valid) {
          setError(postValidation.error ?? 'Invalid photo.');
          continue;
        }

        addPhoto(processed);
        existingHashes.push(processed.contentHash);
        addedCount += 1;
      }
    } catch (pickError) {
      setError(pickError instanceof Error ? pickError.message : 'Failed to add photo.');
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    const validation = validatePhotoCollection(photos);
    if (!validation.valid) {
      setError(validation.error ?? 'Photo requirements not met.');
      return;
    }
    setError(null);
    router.push('/(onboarding)/personality');
  }

  return (
    <OnboardingStep
      title="Add Pet Photos"
      subtitle={`Add ${MIN_PHOTOS}–${MAX_PHOTOS} photos. Mark at least ${MIN_FACIAL_PHOTOS} clear facial shots.`}
      onBack={() => router.back()}
      onNext={handleNext}
      nextDisabled={photos.length < MIN_PHOTOS || facialCount < MIN_FACIAL_PHOTOS}
      error={error}>
      <Text style={styles.label}>
        {photos.length}/{MAX_PHOTOS} photos · {facialCount}/{MIN_FACIAL_PHOTOS} facial
      </Text>

      <View style={photoStyles.grid}>
        {photos.map((photo) => (
          <View key={photo.id} style={photoStyles.tile}>
            <Image source={{ uri: photo.uri }} style={photoStyles.image} />
            <Pressable
              style={[photoStyles.facialBadge, photo.isFacial && photoStyles.facialBadgeActive]}
              onPress={() => toggleFacial(photo.id)}>
              <Text
                style={[
                  photoStyles.facialBadgeText,
                  photo.isFacial && photoStyles.facialBadgeTextActive,
                ]}>
                {photo.isFacial ? 'Facial ✓' : 'Mark facial'}
              </Text>
            </Pressable>
            <Pressable style={photoStyles.removeButton} onPress={() => removePhoto(photo.id)}>
              <Text style={photoStyles.removeButtonText}>×</Text>
            </Pressable>
          </View>
        ))}

        {photos.length < MAX_PHOTOS ? (
          <Pressable style={photoStyles.addTile} onPress={handlePickPhotos} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#208AEF" />
            ) : (
              <Text style={photoStyles.addTileText}>+ Add</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </OnboardingStep>
  );
}

const photoStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  facialBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 4,
  },
  facialBadgeActive: {
    backgroundColor: 'rgba(32,138,239,0.85)',
  },
  facialBadgeText: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  facialBadgeTextActive: {
    color: '#fff',
  },
  removeButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
  },
  addTile: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#208AEF',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTileText: {
    color: '#208AEF',
    fontWeight: '600',
  },
});
