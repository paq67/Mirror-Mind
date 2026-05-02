import { crypto } from "crypto";

type JobStatus = "pending" | "complete" | "error";

interface JobProgress {
  status: JobStatus;
  step: string;
  result?: unknown;
  error?: string;
  createdAt: number;
}

const progressMap = new Map<string, JobProgress>();

const JOB_TTL = 5 * 60 * 1000; // 5 minutes

// Clean up stale jobs periodically
setInterval(() => {
  const now = Date.now();
  for (const [jobId, progress] of progressMap.entries()) {
    if (now - progress.createdAt > JOB_TTL) {
      progressMap.delete(jobId);
    }
  }
}, JOB_TTL);

export function createJob(): string {
  const jobId = crypto.randomUUID();
  progressMap.set(jobId, {
    status: "pending",
    step: "fetching_store",
    createdAt: Date.now(),
  });
  return jobId;
}

export function updateJobStep(jobId: string, step: string): void {
  const job = progressMap.get(jobId);
  if (job) {
    job.step = step;
  }
}

export function completeJob(jobId: string, result: unknown): void {
  progressMap.set(jobId, {
    status: "complete",
    step: "complete",
    result,
    createdAt: Date.now(),
  });
}

export function failJob(jobId: string, error: string): void {
  progressMap.set(jobId, {
    status: "error",
    step: "error",
    error,
    createdAt: Date.now(),
  });
}

export function getJobProgress(jobId: string): JobProgress | undefined {
  return progressMap.get(jobId);
}
