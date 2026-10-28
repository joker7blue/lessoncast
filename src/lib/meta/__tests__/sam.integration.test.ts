// Calls SAM 3.1 on scene 1 of the fixture lesson ($0.0025). Runs when MODEL_API_KEY is set, and skips
// itself otherwise.

import { describe, expect, test } from "vitest";
import lesson from "../../video/fixtures/lesson.json";
import media from "../../video/fixtures/media.json";
import { segment } from "../sam";

describe.skipIf(!process.env.MODEL_API_KEY)("SAM 3.1 (live)", { timeout: 60_000 }, () => {
  test("finds the first object of scene 1 with a confident mask", async () => {
    const res = await fetch(media.sceneImageUrls[0]!);
    const dataUrl = `data:image/jpeg;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
    const matches = await segment(dataUrl, lesson.scenes[0]!.highlights[0]!.samPrompt);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]!.confidence).toBeGreaterThanOrEqual(0.5);
    expect(matches[0]!.d).toMatch(/^M/);
  });
});
