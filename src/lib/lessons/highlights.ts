// Finds the objects each scene's narration names with SAM 3.1, one request per object, 4 at a time.
// An object SAM can't find, or whose request fails, is dropped: a highlight never fails a lesson.

import { jpegSize } from "../image/size";
import type { Lesson } from "../lesson/schema";
import { forEachLimit } from "../limit";
import type { SamMatch } from "../meta/sam";
import { type FoundObject, SceneHighlights, type Shape, simplifyPath } from "../video/highlights";

export const MIN_CONFIDENCE = 0.5;
// A box this large would light up the whole scene, as a "landscape" does (derisk test 3).
export const MAX_BOX_SHARE = 0.7;
export const MAX_SHAPES = 3;
const CONCURRENCY = 4;

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** The matches worth lighting up, the most confident first, each stretched over its box. A match
 * without a confidence is kept: SAM only returns the matches it accepts. */
export function keepShapes(matches: SamMatch[], image: { width: number; height: number }): Shape[] {
  const imageArea = image.width * image.height;
  return matches
    .filter((m) => m.confidence === null || m.confidence >= MIN_CONFIDENCE)
    .filter(({ box: [left, top, right, bottom] }) => (right - left) * (bottom - top) <= MAX_BOX_SHARE * imageArea)
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .slice(0, MAX_SHAPES)
    .map(({ box: [left, top, right, bottom], maskWidth, maskHeight, confidence, d }) => ({
      d: simplifyPath(d),
      left,
      top,
      scaleX: (right - left) / maskWidth,
      scaleY: (bottom - top) / maskHeight,
      confidence,
    }));
}

type SegmentDeps = {
  segment(imageDataUrl: string, prompt: string): Promise<SamMatch[]>;
  warn?(message: string): void;
};

/** `images[i]` is scene i's JPEG. `requested` counts the objects asked for, `found` those kept. */
export async function findAllHighlights(
  lesson: Lesson,
  images: Uint8Array[],
  deps: SegmentDeps,
): Promise<{ scenes: SceneHighlights[]; found: number; requested: number }> {
  const jobs = lesson.scenes.flatMap((scene, s) => scene.highlights.map((highlight, h) => ({ s, h, highlight })));
  const shapes = new Map<string, Shape[]>();
  const dataUrls = images.map((bytes) => `data:image/jpeg;base64,${Buffer.from(bytes).toString("base64")}`);
  const sizes = images.map(jpegSize);

  await forEachLimit(jobs, CONCURRENCY, async ({ s, h, highlight }) => {
    try {
      const kept = keepShapes(await deps.segment(dataUrls[s]!, highlight.samPrompt), sizes[s]!);
      if (kept.length > 0) shapes.set(`${s}:${h}`, kept);
    } catch (error) {
      deps.warn?.(`Scene ${s + 1}: SAM failed on "${highlight.samPrompt}" (${reason(error)}), no highlight`);
    }
  });

  const scenes = lesson.scenes.map((scene, s) => ({
    imageWidth: sizes[s]!.width,
    imageHeight: sizes[s]!.height,
    objects: scene.highlights.flatMap(({ samPrompt, fr, pcm }, h): FoundObject[] => {
      const found = shapes.get(`${s}:${h}`);
      return found ? [{ samPrompt, fr, pcm, shapes: found }] : [];
    }),
  }));
  return { scenes, found: shapes.size, requested: jobs.length };
}

/** What find-highlights stored at `path`, or null to render without highlights: no path (a lesson
 * from before highlights), or a file that can't be read or parsed. */
export async function loadHighlights(
  path: string | null,
  deps: { download(path: string): Promise<Uint8Array>; warn?(message: string): void },
): Promise<SceneHighlights[] | null> {
  if (!path) return null;
  try {
    return SceneHighlights.array().parse(JSON.parse(new TextDecoder().decode(await deps.download(path))));
  } catch (error) {
    deps.warn?.(`Highlights at ${path} can't be read (${reason(error)}): rendering without them`);
    return null;
  }
}
