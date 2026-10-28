import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { makeLesson } from "../lesson/lesson.fixture";
import { ApiError } from "./client";
import { STYLES } from "../lesson/styles";
import { LESSON_INSTRUCTIONS, writeLesson } from "./lesson";

const PHOTO = "https://example.supabase.co/storage/v1/object/public/lessons/abc/pages/1.jpg";
const PAGES = [1, 2, 3].map((n) => `https://example.supabase.co/storage/v1/object/public/lessons/abc/pages/${n}.jpg`);

type Part = { type: string; text?: string; image_url?: { url: string } };
const userContent = (): Part[] =>
  JSON.parse(fetchMock.mock.calls[0]![1].body).messages.find((m: { role: string }) => m.role === "user").content;

function completion(content: unknown, usage = { prompt_tokens: 3166, completion_tokens: 6901, prompt_tokens_details: { cached_tokens: 0 } }) {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) }, finish_reason: "stop" }], usage }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubEnv("MODEL_API_KEY", "test-key");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("writeLesson", () => {
  test("sends the photo URL and the strict Lesson schema to Muse Spark", async () => {
    fetchMock.mockResolvedValue(completion(makeLesson(7)));
    await writeLesson([PHOTO], "auto");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/\/chat\/completions$/);
    expect(init.headers.Authorization).toBe("Bearer test-key");
    const body = JSON.parse(init.body);
    expect(body.model).toBe("muse-spark-1.3");
    expect(body.reasoning_effort).toBe("medium");
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.response_format.json_schema.schema.properties.page.properties.isTextbookPage.type).toBe("boolean");
    const userContent = body.messages.find((m: { role: string }) => m.role === "user").content;
    expect(userContent).toContainEqual({ type: "image_url", image_url: { url: PHOTO } });
  });

  test("returns the parsed lesson", async () => {
    const lesson = makeLesson(7);
    fetchMock.mockResolvedValue(completion(lesson));
    expect((await writeLesson([PHOTO], "auto")).lesson).toEqual(lesson);
  });

  test("computes the cost from the token usage", async () => {
    fetchMock.mockResolvedValue(completion(makeLesson(7)));
    expect((await writeLesson([PHOTO], "auto")).costUsd).toBeCloseTo(0.0333, 4);
  });

  test("throws ApiError with the HTTP status on a billing error", async () => {
    fetchMock.mockImplementation(async () => new Response('{"error":{"code":"billing_not_configured"}}', { status: 402 }));
    await expect(writeLesson([PHOTO], "auto")).rejects.toMatchObject({ name: "ApiError", status: 402 });
    await expect(writeLesson([PHOTO], "auto")).rejects.toBeInstanceOf(ApiError);
  });

  test("sends every page as an image, in page order", async () => {
    fetchMock.mockResolvedValue(completion(makeLesson(7)));
    await writeLesson(PAGES, "auto");
    expect(userContent().filter((part) => part.type === "image_url").map((part) => part.image_url?.url)).toEqual(PAGES);
    expect(userContent()[0]!.text).toMatch(/3 pages of the lesson, in order/);
  });

  test("refuses 0 or 5 pages without calling the API", async () => {
    await expect(writeLesson([], "auto")).rejects.toThrow(RangeError);
    await expect(writeLesson([...PAGES, ...PAGES].slice(0, 5), "auto")).rejects.toThrow(RangeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a forced style wins over the model's choice", async () => {
    fetchMock.mockResolvedValue(completion({ ...makeLesson(7), style: "comic" }));
    const { lesson } = await writeLesson([PHOTO], "realistic");
    expect(lesson.style).toBe("realistic");
    expect(userContent()[0]!.text).toContain('Use the image style "realistic".');
  });

  test("in Automatique the model's style is kept and every rule is sent", async () => {
    fetchMock.mockResolvedValue(completion({ ...makeLesson(7), style: "diagram" }));
    const { lesson } = await writeLesson([PHOTO], "auto");
    expect(lesson.style).toBe("diagram");
    for (const [key, style] of Object.entries(STYLES)) expect(userContent()[0]!.text).toContain(`${key}: ${style.when}`);
  });

  test("rejects an answer that does not match the schema", async () => {
    fetchMock.mockResolvedValue(completion({ title: "nope" }));
    await expect(writeLesson([PHOTO], "auto")).rejects.toThrow();
  });
});

describe("LESSON_INSTRUCTIONS", () => {
  test("ask for 7 scenes of 40–50 words, a textbook-page check and no digits", () => {
    expect(LESSON_INSTRUCTIONS).toMatch(/7 scenes/);
    expect(LESSON_INSTRUCTIONS).toMatch(/40.50 words/);
    expect(LESSON_INSTRUCTIONS).toMatch(/isTextbookPage/);
    expect(LESSON_INSTRUCTIONS).toMatch(/digits/);
  });

  test("ask for the recurring characters and places, and a narration at the page's level", () => {
    expect(LESSON_INSTRUCTIONS).toMatch(/visualNotes/);
    expect(LESSON_INSTRUCTIONS).not.toMatch(/artStyle/);
    expect(LESSON_INSTRUCTIONS).toMatch(/secondary school/);
  });

  test("ask to keep apostrophes and accents in the spoken text", () => {
    expect(LESSON_INSTRUCTIONS).toMatch(/apostrophes/);
    expect(LESSON_INSTRUCTIONS).toMatch(/l'histoire/);
  });

  test("ask for every highlight object to be drawn in its scene's image prompt", () => {
    expect(LESSON_INSTRUCTIONS).toMatch(/imagePrompt[^.]*(name|show)[^.]*highlight/i);
  });
});
