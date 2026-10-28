// A lesson whose run died without saying so (the worker stopped, the machine ran out of memory, a
// dev run expired before it started) would wait forever. Past these limits, it reads as stopped.

import type { LessonStatus } from "./repo";

// A dev run that never started expires after ten minutes.
const QUEUED_LIMIT_MS = 10 * 60_000;
// A lesson takes about four minutes; twenty means something stopped.
const RUNNING_LIMIT_MS = 20 * 60_000;

export const STALLED_MESSAGE = "This lesson stopped before it was finished. Try again with the same photos.";

export function isStalled(status: LessonStatus, createdAt: string, now: number): boolean {
  if (status === "done" || status === "failed") return false;
  const age = now - Date.parse(createdAt);
  return age > (status === "queued" ? QUEUED_LIMIT_MS : RUNNING_LIMIT_MS);
}
