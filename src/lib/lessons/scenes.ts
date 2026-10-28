// Draws a lesson's scenes with Muse Image: scene 1 from scratch, then the others as edits of scene 1
// so the characters and the style stay the same, 4 at a time. Scenes already drawn are skipped, so a
// retried run only pays for what is missing. A scene that can't be drawn at all (a safety refusal on
// its content) shows scene 1 again rather than failing the lesson.

import type { Lesson } from "../lesson/schema";
import { openingPrompt, scenePrompt } from "../meta/images";

const EDIT_ATTEMPTS = 2;
const CONCURRENCY = 4;

type ImageDeps = {
  generateImage(prompt: string): Promise<Uint8Array>;
  editImage(prompt: string, referenceUrl: string): Promise<Uint8Array>;
  warn?(message: string): void;
  /** Fetches an image already saved; defaults to fetch. */
  download?(url: string): Promise<Uint8Array>;
};

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function downloadImage(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Download of ${url} failed: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** Scene 1, the reference: as written, or, if refused, the characters alone. */
async function drawOpening(lesson: Lesson, deps: ImageDeps): Promise<Uint8Array> {
  try {
    return await deps.generateImage(scenePrompt(lesson, 0));
  } catch (error) {
    deps.warn?.(`Scene 1 failed (${reason(error)}): drawing the characters alone`);
    return deps.generateImage(openingPrompt(lesson));
  }
}

/** Scene `index` as an edit of the reference image. After two failed edits (a safety filter, a
 * timeout), a plain generation, so one scene never fails the lesson. */
export async function drawScene(lesson: Lesson, index: number, deps: ImageDeps & { referenceUrl: string }): Promise<Uint8Array> {
  const prompt = scenePrompt(lesson, index);
  for (let attempt = 1; attempt <= EDIT_ATTEMPTS; attempt++) {
    try {
      return await deps.editImage(prompt, deps.referenceUrl);
    } catch (error) {
      deps.warn?.(`Scene ${index + 1}: edit attempt ${attempt} failed: ${reason(error)}`);
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
  let referenceBytes: Uint8Array | undefined;
  let saved = drawn[0];
  if (!saved) {
    referenceBytes = await drawOpening(lesson, deps);
    saved = await deps.saveScene(1, referenceBytes);
    count++;
  }
  const referenceUrl = saved;
  const reference = async () => (referenceBytes ??= await (deps.download ?? downloadImage)(referenceUrl));

  const missing = lesson.scenes.map((_, i) => i).filter((i) => i > 0 && !drawn[i]);
  await forEachLimit(missing, CONCURRENCY, async (i) => {
    let image: Uint8Array;
    try {
      image = await drawScene(lesson, i, { ...deps, referenceUrl });
    } catch (error) {
      deps.warn?.(`Scene ${i + 1} couldn't be drawn (${reason(error)}): showing scene 1 again`);
      image = await reference();
    }
    await deps.saveScene(i + 1, image);
    count++;
  });
  return count;
}
