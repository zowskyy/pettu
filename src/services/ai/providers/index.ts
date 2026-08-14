import type { AIProvider } from '../AIProvider';
import { mockProvider } from './MockProvider';

/**
 * Active AI provider. Swap this export to change providers without touching screens.
 * Production uses edge functions; mock is default for local dev and tests.
 */
export const activeProvider: AIProvider = mockProvider;

export { mockProvider, MockProvider } from './MockProvider';
