// Muse Image draws the scenes: scene 1 from scratch, the others from scene 1 as a reference so the
// characters and the style stay the same (derisk test 2, strategy B).

import type { Lesson } from "../lesson/schema";
import { STYLES } from "../lesson/styles";
import { postJson } from "./client";
import { IMAGE_MODEL } from "./models";

const MODEL = IMAGE_MODEL;
// Sets the aspect ratio only (16:9); the API picks the pixel size (2048 × 1152 in the derisk run).
const SIZE = "1280x720";
// One image takes 10–25 s; past this, the scene is retried or drawn another way.
const TIMEOUT_MS = 90_000;

const NO_TEXT = "No text, letters or numbers anywhere in the image, not even on posters, boards or books.";

function prompt(lesson: Lesson, scene: string): string {
  return [STYLES[lesson.style].prompt, `Recurring characters, places and objects: ${lesson.visualNotes}`, `Scene: ${scene}`, NO_TEXT].join(
    "\n\n",
  );
}

/** The style's fixed prompt, then the lesson's recurring characters and places, then the scene. */
export function scenePrompt(lesson: Lesson, index: number): string {
  return prompt(lesson, lesson.scenes[index]?.imagePrompt ?? "");
}

/** An opening picture of the characters alone, for when a scene's own content is what gets refused. */
export function openingPrompt(lesson: Lesson): string {
  return prompt(lesson, "the recurring characters together in their usual setting, ready to learn");
}

async function requestImage(pathname: string, body: Record<string, unknown>): Promise<Uint8Array> {
  const res = await postJson(
    pathname,
    { model: MODEL, size: SIZE, output_format: "jpeg", response_format: "b64_json", ...body },
    { timeoutMs: TIMEOUT_MS },
  );
  const json = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("Muse Image returned no image");
  return new Uint8Array(Buffer.from(b64, "base64"));
}

export function generateImage(prompt: string): Promise<Uint8Array> {
  return requestImage("/images/generations", { prompt });
}

/** Draws `prompt` in the style and with the characters of the reference image. */
export function editImage(prompt: string, referenceUrl: string): Promise<Uint8Array> {
  return requestImage("/images/edits", {
    prompt: `Draw a new illustration in exactly the same art style, palette, line quality and character design as the reference image.\n\n${prompt}`,
    images: [{ image_url: referenceUrl }],
  });
}
