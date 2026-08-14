import { supabase } from '@/lib/supabase';
import { generateCompanion } from '@/services/ai';
import type {
  CompanionGenerationPayload,
  GenerationJobRecord,
  GenerationJobType,
} from '@/types/generation';
import {
  isJobExpired,
  isProcessingStuck,
  isTerminalStatus,
  JOB_TTL_MS,
  POLL_INTERVAL_MS,
  sleep,
} from '@/services/generationJobUtils';

export {
  isJobExpired,
  isProcessingStuck,
  isTerminalStatus,
  JOB_TTL_MS,
  POLL_INTERVAL_MS,
  PROCESSING_STUCK_MS,
} from '@/services/generationJobUtils';

export class GenerationJobError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'not_found'
      | 'expired'
      | 'failed'
      | 'cancelled'
      | 'timeout'
      | 'unknown',
  ) {
    super(message);
    this.name = 'GenerationJobError';
  }
}

export interface QueueGenerationJobInput {
  companionId: string;
  profileId: string;
  jobType: GenerationJobType;
  payload: CompanionGenerationPayload;
  idempotencyKey?: string;
}

export interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
  onStatus?: (job: GenerationJobRecord) => void;
  signal?: AbortSignal;
}

async function rejectSleep(ms: number, signal?: AbortSignal): Promise<void> {
  try {
    await sleep(ms, signal);
  } catch {
    throw new GenerationJobError('Polling cancelled', 'cancelled');
  }
}

export async function getGenerationJob(jobId: string): Promise<GenerationJobRecord | null> {
  const { data, error } = await supabase
    .from('generation_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as GenerationJobRecord | null;
}

async function updateGenerationJob(
  jobId: string,
  patch: Partial<
    Pick<
      GenerationJobRecord,
      | 'status'
      | 'error_message'
      | 'result_bucket'
      | 'result_path'
      | 'started_at'
      | 'completed_at'
      | 'attempt_count'
      | 'ai_generation_id'
    >
  >,
): Promise<GenerationJobRecord> {
  const { data, error } = await supabase
    .from('generation_jobs')
    .update(patch)
    .eq('id', jobId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as GenerationJobRecord;
}

export async function markJobFailed(
  jobId: string,
  message: string,
): Promise<GenerationJobRecord> {
  return updateGenerationJob(jobId, {
    status: 'failed',
    error_message: message,
    completed_at: new Date().toISOString(),
  });
}

export async function markJobExpired(jobId: string): Promise<GenerationJobRecord> {
  return updateGenerationJob(jobId, {
    status: 'expired',
    error_message: 'Generation job expired before completion.',
    completed_at: new Date().toISOString(),
  });
}

export async function sweepExpiredJobs(companionId?: string): Promise<number> {
  let query = supabase
    .from('generation_jobs')
    .select('*')
    .in('status', ['queued', 'processing']);

  if (companionId) {
    query = query.eq('companion_id', companionId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const jobs = (data ?? []) as GenerationJobRecord[];
  const now = Date.now();
  let swept = 0;

  for (const job of jobs) {
    const expired = isJobExpired(job, now);
    const stuck = isProcessingStuck(job, now);

    if (expired || stuck) {
      if (job.status === 'processing' && stuck && !expired) {
        await markJobFailed(job.id, 'Generation timed out while processing.');
      } else {
        await markJobExpired(job.id);
      }
      swept += 1;
    }
  }

  return swept;
}

export async function queueGenerationJob(
  input: QueueGenerationJobInput,
): Promise<GenerationJobRecord> {
  const expiresAt = new Date(Date.now() + JOB_TTL_MS).toISOString();

  const { data: aiGeneration, error: aiError } = await supabase
    .from('ai_generations')
    .insert({
      companion_id: input.companionId,
      profile_id: input.profileId,
      generation_type: 'companion',
      provider: 'mock',
      status: 'pending',
      input_snapshot: input.payload,
    })
    .select('id')
    .single();

  if (aiError) {
    throw aiError;
  }

  const { data, error } = await supabase
    .from('generation_jobs')
    .insert({
      companion_id: input.companionId,
      profile_id: input.profileId,
      ai_generation_id: aiGeneration.id,
      job_type: input.jobType,
      status: 'queued',
      expires_at: expiresAt,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as GenerationJobRecord;
}

export async function processCompanionGenerationJob(
  jobId: string,
  payload: CompanionGenerationPayload,
): Promise<GenerationJobRecord> {
  const existing = await getGenerationJob(jobId);
  if (!existing) {
    throw new GenerationJobError('Generation job not found', 'not_found');
  }

  if (isTerminalStatus(existing.status)) {
    return existing;
  }

  if (isJobExpired(existing)) {
    return markJobExpired(jobId);
  }

  const processing = await updateGenerationJob(jobId, {
    status: 'processing',
    started_at: new Date().toISOString(),
    attempt_count: existing.attempt_count + 1,
  });

  try {
    const image = await generateCompanion(payload);

    const succeeded = await updateGenerationJob(jobId, {
      status: 'succeeded',
      result_bucket: 'generated-companions',
      result_path: image.storagePath,
      completed_at: new Date().toISOString(),
      error_message: null,
    });

    if (processing.ai_generation_id) {
      await supabase
        .from('ai_generations')
        .update({
          status: 'succeeded',
          output_payload: image,
          completed_at: new Date().toISOString(),
        })
        .eq('id', processing.ai_generation_id);
    }

    await supabase
      .from('companions')
      .update({
        generated_image_bucket: 'generated-companions',
        generated_image_path: image.storagePath,
        onboarding_step: 'reveal',
      })
      .eq('id', processing.companion_id);

    return succeeded;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Companion generation failed';

    if (processing.ai_generation_id) {
      await supabase
        .from('ai_generations')
        .update({
          status: 'failed',
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', processing.ai_generation_id);
    }

    return markJobFailed(jobId, message);
  }
}

export async function pollGenerationJob(
  jobId: string,
  options: PollOptions = {},
): Promise<GenerationJobRecord> {
  const intervalMs = options.intervalMs ?? POLL_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? JOB_TTL_MS;
  const startedAt = Date.now();

  while (true) {
    if (options.signal?.aborted) {
      throw new GenerationJobError('Polling cancelled', 'cancelled');
    }

    await sweepExpiredJobs();

    const job = await getGenerationJob(jobId);
    if (!job) {
      throw new GenerationJobError('Generation job not found', 'not_found');
    }

    options.onStatus?.(job);

    if (isTerminalStatus(job.status)) {
      if (job.status === 'failed') {
        throw new GenerationJobError(
          job.error_message ?? 'Generation failed',
          'failed',
        );
      }
      if (job.status === 'expired') {
        throw new GenerationJobError(
          job.error_message ?? 'Generation expired',
          'expired',
        );
      }
      if (job.status === 'cancelled') {
        throw new GenerationJobError('Generation cancelled', 'cancelled');
      }
      return job;
    }

    if (Date.now() - startedAt >= timeoutMs) {
      await markJobFailed(jobId, 'Polling timed out waiting for generation.');
      throw new GenerationJobError('Generation polling timed out', 'timeout');
    }

    await rejectSleep(intervalMs, options.signal);
  }
}

export async function retryGenerationJob(
  input: QueueGenerationJobInput,
  previousJobId?: string,
): Promise<GenerationJobRecord> {
  if (previousJobId) {
    const previous = await getGenerationJob(previousJobId);
    if (previous && !isTerminalStatus(previous.status)) {
      await updateGenerationJob(previousJobId, {
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        error_message: 'Superseded by retry',
      });
    }
  }

  const job = await queueGenerationJob(input);
  return processCompanionGenerationJob(job.id, input.payload);
}
