import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { segment } from "../../meta/sam";
import { SceneHighlights, shapesCenter, simplifyPath } from "../highlights";

const points = (d: string) => (d.match(/[ML]/g) ?? []).length;

describe("simplifyPath", () => {
  test("drops the points inside a straight run", () => {
    expect(simplifyPath("M0 0L1 0L2 0L3 0L3 1L3 2Z")).toBe("M0 0L3 0L3 2Z");
  });

  test("keeps every subpath and its Z", () => {
    expect(simplifyPath("M0 0L1 0L2 0L2 2ZM5 5L5 6L5 7L6 7Z")).toBe("M0 0L2 0L2 2ZM5 5L5 7L6 7Z");
  });

  test("keeps the corners of a 2-pixel staircase", () => {
    const stairs = "M0 0L2 0L2 2L4 2L4 4Z";
    expect(simplifyPath(stairs)).toBe(stairs);
  });

  test("smooths half-pixel steps along a slope", () => {
    expect(simplifyPath("M0 0L1 0L1 1L2 1L2 2L3 2L3 3Z")).toBe("M0 0L1 0L3 3Z");
  });

  test("keeps negative and half-pixel coordinates as written", () => {
    expect(simplifyPath("M258.5 0L259 -0.5L260 -0.5L261 -0.5L261 3L258.5 3Z")).toBe("M258.5 0L261 -0.5L261 3L258.5 3Z");
  });

  describe("on a real SAM outline", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    });

    test("shrinks it at least 3 times", async () => {
      const stream = readFileSync(path.join(__dirname, "../../meta/__tests__/fixtures/sam-stream.txt"), "utf8");
      vi.stubEnv("MODEL_API_KEY", "test-key");
      vi.stubGlobal("fetch", async () => new Response(stream));
      const [match] = await segment("data:image/jpeg;base64,AAAA", "globe");
      const simplified = simplifyPath(match!.d);
      expect(simplified.startsWith(match!.d.slice(0, match!.d.indexOf("L")))).toBe(true);
      expect(points(simplified) * 3).toBeLessThanOrEqual(points(match!.d));
    });
  });
});

describe("SceneHighlights", () => {
  const shape = { d: "M0 0L1 0Z", left: 10, top: 20, scaleX: 1, scaleY: 1, confidence: 0.9 };
  const object = { samPrompt: "heart", fr: "le cœur", pcm: "di heart", shapes: [shape] };

  test("accepts a scene with its found objects", () => {
    expect(SceneHighlights.parse({ imageWidth: 2048, imageHeight: 1152, objects: [object] }).objects).toHaveLength(1);
  });

  test("rejects an object without shapes", () => {
    expect(() => SceneHighlights.parse({ imageWidth: 2048, imageHeight: 1152, objects: [{ ...object, shapes: [] }] })).toThrow();
  });
});

describe("shapesCenter", () => {
  test("is the centre of the shapes' outlines placed on the image", () => {
    const square = { d: "M0 0L10 0L10 10L0 10Z", left: 100, top: 50, scaleX: 2, scaleY: 3, confidence: 0.9 };
    expect(shapesCenter([square])).toEqual({ x: 110, y: 65 });
    expect(shapesCenter([square, { ...square, left: 300 }])).toEqual({ x: 210, y: 65 });
  });
});
