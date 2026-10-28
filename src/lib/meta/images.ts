// Muse Image draws the scenes: scene 1 from scratch, the others from scene 1 as a reference so the
// characters and the style stay the same (derisk test 2, strategy B).

import type { Lesson } from "../lesson/schema";
import { STYLES } from "../lesson/styles";
import { postJson } from "./client";
import { IMAGE_MODEL } from "./models";

const MODEL = IMAGE_MODEL;
// Sets the aspect ratio only (16:9); the API picks the pixel size (2048 × 1152 in the derisk run).
const SIZE = "1280x720";

/** The style's fixed prompt, then the lesson's recurring characters and places, then the scene. */
export function scenePrompt(lesson: Lesson, index: number): string {
  return [
    STYLES[lesson.style].prompt,
    `Recurring characters, places and objects: ${lesson.visualNotes}`,
    `Scene: ${lesson.scenes[index]?.imagePrompt}`,
    "No text, letters or numbers anywhere in the image, not even on posters, boards or books.",
  ].join("\n\n");
}

async function requestImage(pathname: string, body: Record<string, unknown>): Promise<Uint8Array> {
  const res = await postJson(pathname, { model: MODEL, size: SIZE, output_format: "jpeg", response_format: "b64_json", ...body });
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
