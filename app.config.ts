import type { ExpoConfig } from 'expo/config';
import { withAndroidManifest, type ConfigPlugin } from '@expo/config-plugins';

function getExpoPublicEnv(): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.startsWith('EXPO_PUBLIC_'))
  );
}

/** READ_EXTERNAL_STORAGE is only requested on Android 12 and below (API 32). */
const withReadExternalStorageMaxSdk: ConfigPlugin = (config) =>
  withAndroidManifest(config, (config) => {
    const permissions = config.modResults.manifest['uses-permission'];
    if (!Array.isArray(permissions)) {
      return config;
    }

    for (const permission of permissions) {
      if (
        permission.$?.['android:name'] ===
        'android.permission.READ_EXTERNAL_STORAGE'
      ) {
        (permission.$ as Record<string, string>)['android:maxSdkVersion'] = '32';
      }
    }

    return config;
  });

const config: ExpoConfig = {
  name: 'Pet Echo',
  slug: 'pet-echo',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'petecho',
  userInterfaceStyle: 'automatic',
  platforms: ['android'],
  ios: {
    bundleIdentifier: 'com.petecho.app',
  },
  android: {
    package: 'com.petecho.app',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: [
      'CAMERA',
      'READ_MEDIA_IMAGES',
      'READ_EXTERNAL_STORAGE',
      'POST_NOTIFICATIONS',
      'INTERNET',
      'VIBRATE',
    ],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'petecho' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    predictiveBackGestureEnabled: true,
  },
  plugins: [
    'expo-router',
    'expo-dev-client',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    withReadExternalStorageMaxSdk as unknown as string,
    'expo-secure-store',
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Pet Echo to access your photos to create your companion.',
        cameraPermission: 'Allow Pet Echo to take photos of your pet.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? '',
    },
    ...getExpoPublicEnv(),
  },
};

export default config;
