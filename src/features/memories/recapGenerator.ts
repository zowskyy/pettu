import { generateRecap } from '@/services/ai/RecapService';
import type { RecapInput, RecapResult } from '@/services/ai/types';

/** Feature wrapper for monthly recap generation (Slice 24 stub). */
export async function generateMonthlyRecap(input: RecapInput): Promise<RecapResult> {
  return generateRecap(input);
}
