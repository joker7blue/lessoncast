// Draws a lesson's scenes with Muse Image: scene 1 from scratch, then the others as edits of scene 1
// so the characters and the style stay the same, 4 at a time. Scenes already drawn are skipped, so a
// retried run only pays for what is missing.

import type { Lesson } from "../lesson/schema";
import { scenePrompt } from "../meta/images";

const EDIT_ATTEMPTS = 2;
const CONCURRENCY = 4;

type ImageDeps = {
  generateImage(prompt: string): Promise<Uint8Array>;
  editImage(prompt: string, referenceUrl: string): Promise<Uint8Array>;
  warn?(message: string): void;
};

/** Scene `index` as an edit of the reference image. After two failed edits (a safety filter, a
 * timeout), a plain generation, so one scene never fails the lesson. */
export async function drawScene(lesson: Lesson, index: number, deps: ImageDeps & { referenceUrl: string }): Promise<Uint8Array> {
  const prompt = scenePrompt(lesson, index);
  for (let attempt = 1; attempt <= EDIT_ATTEMPTS; attempt++) {
    try {
      return await deps.editImage(prompt, deps.referenceUrl);
    } catch (error) {
      deps.warn?.(`Scene ${index + 1}: edit attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return deps.generateImage(prompt);
}

async function forEachLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const worker = async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await fn(item);
  };
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, worker));
}

/**
 * Draws every scene not yet in `drawn` (the public URL of each scene, or null) and saves it with
 * `saveScene(n, bytes)`, which returns the saved image's public URL. Returns how many were drawn.
 */
export async function drawAllScenes(
  lesson: Lesson,
  drawn: (string | null)[],
  deps: ImageDeps & { saveScene(n: number, bytes: Uint8Array): Promise<string> },
): Promise<number> {
  let count = 0;
  let referenceUrl = drawn[0];
  if (!referenceUrl) {
    referenceUrl = await deps.saveScene(1, await deps.generateImage(scenePrompt(lesson, 0)));
    count++;
  }
  const missing = lesson.scenes.map((_, i) => i).filter((i) => i > 0 && !drawn[i]);
  await forEachLimit(missing, CONCURRENCY, async (i) => {
    await deps.saveScene(i + 1, await drawScene(lesson, i, { ...deps, referenceUrl }));
    count++;
  });
  return count;
}
