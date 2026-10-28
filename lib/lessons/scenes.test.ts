import { describe, expect, test, vi } from "vitest";
import { makeLesson } from "../lesson/lesson.fixture";
import { scenePrompt } from "../meta/images";
import { drawAllScenes, drawScene } from "./scenes";

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
      generateImage: vi.fn(async () => bytes(0)),
      editImage: vi.fn(async () => {
        running++;
        deps.maxRunning = Math.max(deps.maxRunning, running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        running--;
        return bytes(9);
      }),
      saveScene: vi.fn(async (n: number) => `https://x/scenes/${n}.jpg`),
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

  test("a retried run only draws the scenes still missing", async () => {
    const deps = fakes();
    const drawn = await drawAllScenes(lesson, ["https://x/scenes/1.jpg", "https://x/scenes/2.jpg", null, null, "https://x/scenes/5.jpg", null], deps);
    expect(drawn).toBe(3);
    expect(deps.generateImage).not.toHaveBeenCalled();
    expect(deps.saveScene.mock.calls.map((call) => call[0]).sort()).toEqual([3, 4, 6]);
  });
});
