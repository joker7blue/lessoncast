import { describe, expect, test, vi } from "vitest";
import { jpegHeader } from "../../image/__tests__/jpeg.fixture";
import { makeLesson } from "../../lesson/lesson.fixture";
import type { SamMatch } from "../../meta/sam";
import { findAllHighlights, keepShapes } from "../highlights";

const IMAGE = { width: 2048, height: 1152 };

function match(confidence: number | null, box: SamMatch["box"] = [100, 100, 400, 300], mask = { width: 300, height: 200 }): SamMatch {
  return { confidence, box, maskWidth: mask.width, maskHeight: mask.height, d: "M0 0L1 0L2 0L2 2Z" };
}

describe("keepShapes", () => {
  test("drops matches under 0.5 confidence and keeps those without one", () => {
    const shapes = keepShapes([match(0.49), match(0.5), match(null)], IMAGE);
    expect(shapes.map((s) => s.confidence)).toEqual([0.5, null]);
  });

  test("drops a box over 70 % of the image", () => {
    expect(keepShapes([match(0.95, [0, 0, 2048, 1152])], IMAGE)).toEqual([]);
    expect(keepShapes([match(0.95, [0, 0, 1600, 1100])], IMAGE)).toEqual([]);
    expect(keepShapes([match(0.95, [0, 0, 1711, 881])], IMAGE)).toHaveLength(1);
  });

  test("keeps the 3 most confident", () => {
    const shapes = keepShapes([match(0.6), match(0.9), match(0.7), match(0.8)], IMAGE);
    expect(shapes.map((s) => s.confidence)).toEqual([0.9, 0.8, 0.7]);
  });

  test("stretches the mask over its box and simplifies its outline", () => {
    const [shape] = keepShapes([match(0.9, [0, 48, 1711, 929], { width: 1024, height: 527 })], { width: 2048, height: 1152 * 2 });
    expect(shape).toMatchObject({ left: 0, top: 48, d: "M0 0L2 0L2 2Z" });
    expect(shape!.scaleX).toBeCloseTo(1711 / 1024, 4);
    expect(shape!.scaleY).toBeCloseTo(881 / 527, 4);
  });
});

describe("findAllHighlights", () => {
  // Two scenes: the first with "heart" and "lungs", the second with "heart".
  function lesson() {
    const l = makeLesson(2);
    l.scenes[0]!.highlights.push({ samPrompt: "lungs", fr: "poumons", pcm: "lungs" });
    return l;
  }
  const images = [jpegHeader(2048, 1152), jpegHeader(1280, 720)];

  test("sends one request per highlight with its scene image and samPrompt", async () => {
    const segment = vi.fn(async () => [match(0.9)]);
    await findAllHighlights(lesson(), images, { segment });
    expect(segment).toHaveBeenCalledTimes(3);
    const calls = segment.mock.calls as unknown as [string, string][];
    const sent = calls.map(([url, prompt]) => [url.slice(0, 23), prompt, url.slice(23)]);
    const b64 = (i: number) => Buffer.from(images[i]!).toString("base64");
    expect(sent).toEqual(
      expect.arrayContaining([
        ["data:image/jpeg;base64,", "heart", b64(0)],
        ["data:image/jpeg;base64,", "lungs", b64(0)],
        ["data:image/jpeg;base64,", "heart", b64(1)],
      ]),
    );
  });

  test("returns each scene's size and objects in the script's order", async () => {
    const segment = vi.fn(async () => [match(0.9)]);
    const { scenes } = await findAllHighlights(lesson(), images, { segment });
    expect(scenes.map((s) => [s.imageWidth, s.imageHeight, s.objects.map((o) => o.samPrompt)])).toEqual([
      [2048, 1152, ["heart", "lungs"]],
      [1280, 720, ["heart"]],
    ]);
    expect(scenes[0]!.objects[0]).toMatchObject({ fr: "cœur", pcm: "Heart" });
  });

  test("drops an object whose request fails and keeps the others", async () => {
    const warn = vi.fn();
    const segment = vi.fn(async (_url: string, prompt: string) => {
      if (prompt === "lungs") throw new Error("timeout");
      return [match(0.9)];
    });
    const result = await findAllHighlights(lesson(), images, { segment, warn });
    expect(result.scenes[0]!.objects.map((o) => o.samPrompt)).toEqual(["heart"]);
    expect(result).toMatchObject({ found: 2, requested: 3 });
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/lungs.*timeout/));
  });

  test("counts found objects, not shapes, and drops objects SAM didn't find", async () => {
    const segment = vi.fn(async (_url: string, prompt: string) => (prompt === "heart" ? [match(0.9), match(0.8)] : [match(0.2)]));
    const result = await findAllHighlights(lesson(), images, { segment });
    expect(result).toMatchObject({ found: 2, requested: 3 });
    expect(result.scenes[0]!.objects[0]!.shapes).toHaveLength(2);
  });

  test("finishes with no objects when every request fails", async () => {
    const segment = vi.fn(async () => Promise.reject(new Error("HTTP 503")));
    const result = await findAllHighlights(lesson(), images, { segment, warn: () => {} });
    expect(result).toEqual({
      scenes: [
        { imageWidth: 2048, imageHeight: 1152, objects: [] },
        { imageWidth: 1280, imageHeight: 720, objects: [] },
      ],
      found: 0,
      requested: 3,
    });
  });
});
