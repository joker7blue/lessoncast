// SAM 3.1 finds an object the script names ("heart", "river") in a scene image and returns its mask
// as an SVG outline: the layer the video lights up when the voice says the word (derisk test 3).

import { decodeMaskToSVGPath, parseImageStream, recordsOfKind, type ResponsesEvent } from "@meta-sam/parser";
import { postJson } from "./client";
import { SAM_MODEL } from "./models";
import { sseData } from "./sse";

// One request takes 4 to 15 s (derisk test 3).
const TIMEOUT_MS = 30_000;

/** One object SAM found. `d` is its outline in the mask raster's pixels (maskWidth × maskHeight),
 * which for a large object is smaller than its box: it has to be stretched over `box`. */
export type SamMatch = {
  confidence: number | null;
  box: [left: number, top: number, right: number, bottom: number];
  maskWidth: number;
  maskHeight: number;
  d: string;
};

/** The Responses API body for one object in one image, with each match's confidence. */
export function samRequestBody(imageDataUrl: string, prompt: string) {
  return {
    model: SAM_MODEL,
    stream: true,
    metadata: { include_confidence: "true" },
    input: [
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: imageDataUrl },
        ],
      },
    ],
  };
}

/** Every match of `prompt` in the image, an empty list when SAM finds none. */
export async function segment(imageDataUrl: string, prompt: string): Promise<SamMatch[]> {
  const res = await postJson("/responses", samRequestBody(imageDataUrl, prompt), { timeoutMs: TIMEOUT_MS, accept: "text/event-stream" });
  const { records } = await parseImageStream(sseData(res) as AsyncIterable<ResponsesEvent>).finalResult;
  const boxes = new Map(recordsOfKind(records, "box").map((b) => [b.objectId, b]));
  return recordsOfKind(records, "mask").map((m) => ({
    confidence: m.confidence ?? boxes.get(m.objectId)?.confidence ?? null,
    box: [m.bounds.left, m.bounds.top, m.bounds.right, m.bounds.bottom],
    maskWidth: m.mask.width,
    maskHeight: m.mask.height,
    d: decodeMaskToSVGPath(m.mask),
  }));
}
