import { describe, expect, it } from 'vitest';
import {
  isJobExpired,
  isProcessingStuck,
  JOB_TTL_MS,
  PROCESSING_STUCK_MS,
} from '../../src/services/generationJobUtils';
import type { GenerationJobRecord } from '../../src/types/generation';

function makeJob(overrides: Partial<GenerationJobRecord> = {}): GenerationJobRecord {
  return {
    id: 'job-1',
    companion_id: 'companion-1',
    profile_id: 'profile-1',
    ai_generation_id: null,
    job_type: 'companion_image',
    status: 'queued',
    attempt_count: 0,
    max_attempts: 3,
    error_message: null,
    result_bucket: null,
    result_path: null,
    expires_at: null,
    started_at: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('generationJobUtils', () => {
  it('detects expired jobs from expires_at', () => {
    const job = makeJob({
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });

    expect(isJobExpired(job)).toBe(true);
  });

  it('detects expired jobs from TTL when expires_at is missing', () => {
    const job = makeJob({
      created_at: new Date(Date.now() - JOB_TTL_MS - 1000).toISOString(),
    });

    expect(isJobExpired(job)).toBe(true);
  });

  it('detects stuck processing jobs', () => {
    const job = makeJob({
      status: 'processing',
      started_at: new Date(Date.now() - PROCESSING_STUCK_MS - 1000).toISOString(),
    });

    expect(isProcessingStuck(job)).toBe(true);
  });

  it('does not mark fresh processing jobs as stuck', () => {
    const job = makeJob({
      status: 'processing',
      started_at: new Date().toISOString(),
    });

    expect(isProcessingStuck(job)).toBe(false);
  });
});
