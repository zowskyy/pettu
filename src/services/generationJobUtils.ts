import type { GenerationJobRecord, GenerationJobStatus } from '@/types/generation';

export const JOB_TTL_MS = 10 * 60 * 1000;
export const POLL_INTERVAL_MS = 1500;
export const PROCESSING_STUCK_MS = 5 * 60 * 1000;

export function isTerminalStatus(status: GenerationJobStatus): boolean {
  return (
    status === 'succeeded' ||
    status === 'failed' ||
    status === 'cancelled' ||
    status === 'expired'
  );
}

export function isJobExpired(job: GenerationJobRecord, now = Date.now()): boolean {
  if (job.expires_at) {
    return new Date(job.expires_at).getTime() <= now;
  }

  const createdAt = new Date(job.created_at).getTime();
  return now - createdAt >= JOB_TTL_MS;
}

export function isProcessingStuck(job: GenerationJobRecord, now = Date.now()): boolean {
  if (job.status !== 'processing' || !job.started_at) {
    return false;
  }

  return now - new Date(job.started_at).getTime() >= PROCESSING_STUCK_MS;
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Polling cancelled'));
      return;
    }

    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new Error('Polling cancelled'));
      },
      { once: true },
    );
  });
}
