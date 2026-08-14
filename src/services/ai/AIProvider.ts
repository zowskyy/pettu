import type { ArtStyle } from '@/types/generation';

export interface ImageGenerationInput {
  prompt: string;
  referenceImageUrls: string[];
  style: ArtStyle;
  width: number;
  height: number;
}

export interface ImageGenerationOutput {
  imageUrl: string;
  storagePath: string;
  mimeType: string;
}

export interface TextGenerationInput {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  responseFormat: 'json' | 'text';
}

export interface TextGenerationOutput {
  text: string;
  tokensUsed?: number;
  latencyMs?: number;
}

export interface AIProvider {
  readonly name: string;

  generateImage(input: ImageGenerationInput): Promise<ImageGenerationOutput>;
  generateText(input: TextGenerationInput): Promise<TextGenerationOutput>;
}
