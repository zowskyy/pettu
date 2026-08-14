import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/companionEngine/**/*.ts'],
    },
  },
  define: {
    __DEV__: true,
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react-native': path.resolve(__dirname, './tests/mocks/react-native.ts'),
      'expo-secure-store': path.resolve(__dirname, './tests/mocks/expo-secure-store.ts'),
      'expo-linking': path.resolve(__dirname, './tests/mocks/expo-linking.ts'),
    },
  },
});
