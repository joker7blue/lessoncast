import { describe, expect, test, vi } from "vitest";
import { makeLesson } from "../../lesson/lesson.fixture";
import { openingPrompt, scenePrompt } from "../../meta/images";
import { drawAllScenes, drawScene } from "../scenes";

const lesson = makeLesson(6);
const bytes = (n: number) => new Uint8Array([n]);

describe("drawScene", () => {
  test("a scene whose edit fails twice falls back to a generation without reference", async () => {
    const editImage = vi.fn().mockRejectedValue(new Error("safety"));
    const generateImage = vi.fn().mockResolvedValue(bytes(1));
    expect(await drawScene(lesson, 2, { editImage, generateImage, referenceUrl: "u" })).toEqual(bytes(1));
    expect(editImage).toHaveBeenCalledTimes(2);
    expect(editImage).toHaveBeenCalledWith(scenePrompt(lesson, 2), "u");
    expect(generateImage).toHaveBeenCalledTimes(1);
  });

  test("a scene drawn on the first edit never pays for a generation", async () => {
    const editImage = vi.fn().mockResolvedValue(bytes(2));
    const generateImage = vi.fn();
    await drawScene(lesson, 1, { editImage, generateImage, referenceUrl: "u" });
    expect(generateImage).not.toHaveBeenCalled();
  });
});

describe("drawAllScenes", () => {
  function fakes() {
    let running = 0;
    const deps = {
      maxRunning: 0,
      generateImage: vi.fn<(prompt: string) => Promise<Uint8Array>>(async () => bytes(0)),
      editImage: vi.fn<(prompt: string, referenceUrl: string) => Promise<Uint8Array>>(async () => {
        running++;
        deps.maxRunning = Math.max(deps.maxRunning, running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        running--;
        return bytes(9);
      }),
      saveScene: vi.fn<(n: number, image: Uint8Array) => Promise<string>>(async (n) => `https://x/scenes/${n}.jpg`),
      download: vi.fn<(url: string) => Promise<Uint8Array>>(async () => bytes(0)),
    };
    return deps;
  }

  test("draws scene 1 from scratch, then the others as edits of it, 4 at a time", async () => {
    const deps = fakes();
    const drawn = await drawAllScenes(lesson, [null, null, null, null, null, null], deps);
    expect(drawn).toBe(6);
    expect(deps.generateImage).toHaveBeenCalledTimes(1);
    expect(deps.generateImage).toHaveBeenCalledWith(scenePrompt(lesson, 0));
    expect(deps.editImage).toHaveBeenCalledTimes(5);
    expect(deps.editImage.mock.calls.every((call) => (call as unknown[])[1] === "https://x/scenes/1.jpg")).toBe(true);
    expect(deps.saveScene.mock.calls.map((call) => call[0]).sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(deps.maxRunning).toBe(4);
  });

  test("a scene 1 refused as written is drawn from the style and the characters alone", async () => {
    const deps = fakes();
    deps.generateImage.mockImplementation(async (prompt: string) => {
      if (prompt === scenePrompt(lesson, 0)) throw new Error("safety");
      return bytes(1);
    });
    expect(await drawAllScenes(lesson, [null, null, null, null, null, null], deps)).toBe(6);
    expect(deps.generateImage).toHaveBeenCalledWith(openingPrompt(lesson));
    expect(deps.saveScene).toHaveBeenCalledWith(1, bytes(1));
  });

  test("a scene refused every way reuses the first scene's picture instead of failing the lesson", async () => {
    const distinct = { ...lesson, scenes: lesson.scenes.map((scene, i) => ({ ...scene, imagePrompt: `scene ${i + 1}` })) };
    const first = bytes(1);
    const deps = fakes();
    deps.editImage.mockRejectedValue(new Error("safety"));
    deps.generateImage.mockImplementation(async (prompt) => {
      if (prompt === scenePrompt(distinct, 0)) return first;
      throw new Error("safety");
    });
    expect(await drawAllScenes(distinct, [null, null, null, null, null, null], deps)).toBe(6);
    expect(deps.saveScene.mock.calls.map(([n, image]) => [n, image === first])).toEqual(
      expect.arrayContaining([1, 2, 3, 4, 5, 6].map((n) => [n, true])),
    );
  });

  test("on a retried run the reused picture is downloaded from scene 1", async () => {
    const deps = { ...fakes(), download: vi.fn(async () => bytes(7)) };
    deps.editImage.mockRejectedValue(new Error("safety"));
    deps.generateImage.mockRejectedValue(new Error("safety"));
    await drawAllScenes(lesson, ["https://x/scenes/1.jpg", null, "https://x/scenes/3.jpg", "https://x/scenes/4.jpg", "https://x/scenes/5.jpg", "https://x/scenes/6.jpg"], deps);
    expect(deps.download).toHaveBeenCalledWith("https://x/scenes/1.jpg");
    expect(deps.saveScene).toHaveBeenCalledWith(2, bytes(7));
  });

  test("a retried run only draws the scenes still missing", async () => {
    const deps = fakes();
    const drawn = await drawAllScenes(lesson, ["https://x/scenes/1.jpg", "https://x/scenes/2.jpg", null, null, "https://x/scenes/5.jpg", null], deps);
    expect(drawn).toBe(3);
    expect(deps.generateImage).not.toHaveBeenCalled();
    expect(deps.saveScene.mock.calls.map((call) => call[0]).sort()).toEqual([3, 4, 6]);
  });
});
