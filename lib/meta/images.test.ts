import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { makeLesson } from "../lesson/lesson.fixture";
import { editImage, generateImage, scenePrompt } from "./images";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

function imageResponse() {
  return new Response(JSON.stringify({ data: [{ b64_json: Buffer.from(JPEG).toString("base64") }], output_format: "jpeg" }), { status: 200 });
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubEnv("MODEL_API_KEY", "test-key");
  fetchMock = vi.fn().mockImplementation(async () => imageResponse());
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const sentBody = () => JSON.parse(fetchMock.mock.calls[0]![1].body);

describe("generateImage", () => {
  test("asks Muse Image for a 16:9 JPEG and returns the decoded bytes", async () => {
    const bytes = await generateImage("a heart");
    expect(String(fetchMock.mock.calls[0]![0])).toMatch(/\/images\/generations$/);
    expect(sentBody()).toMatchObject({ model: "muse-image-1.0", prompt: "a heart", size: "1280x720", output_format: "jpeg", response_format: "b64_json" });
    expect(bytes).toEqual(JPEG);
  });
});

describe("editImage", () => {
  test("sends the reference as images[0].image_url and returns the decoded bytes", async () => {
    const bytes = await editImage("a river", "https://x/scenes/1.jpg");
    expect(String(fetchMock.mock.calls[0]![0])).toMatch(/\/images\/edits$/);
    const body = sentBody();
    expect(body.images).toEqual([{ image_url: "https://x/scenes/1.jpg" }]);
    expect(body.prompt).toContain("a river");
    expect(body.prompt).toMatch(/same art style/i);
    expect(bytes).toEqual(JPEG);
  });
});

describe("scenePrompt", () => {
  test("starts with the art style, then the scene, and forbids text in the image", () => {
    const lesson = makeLesson(6);
    const prompt = scenePrompt(lesson, 2);
    expect(prompt.startsWith(lesson.artStyle)).toBe(true);
    expect(prompt).toContain(lesson.scenes[2]!.imagePrompt);
    expect(prompt).toMatch(/No text, letters or numbers/);
  });
});
