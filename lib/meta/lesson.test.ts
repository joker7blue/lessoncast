import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { makeLesson } from "../lesson/lesson.fixture";
import { ApiError } from "./client";
import { LESSON_INSTRUCTIONS, writeLesson } from "./lesson";

const PHOTO = "https://example.supabase.co/storage/v1/object/public/lessons/abc/photo.jpg";

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
    await writeLesson(PHOTO);
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
    expect((await writeLesson(PHOTO)).lesson).toEqual(lesson);
  });

  test("computes the cost from the token usage", async () => {
    fetchMock.mockResolvedValue(completion(makeLesson(7)));
    expect((await writeLesson(PHOTO)).costUsd).toBeCloseTo(0.0333, 4);
  });

  test("throws ApiError with the HTTP status on a billing error", async () => {
    fetchMock.mockImplementation(async () => new Response('{"error":{"code":"billing_not_configured"}}', { status: 402 }));
    await expect(writeLesson(PHOTO)).rejects.toMatchObject({ name: "ApiError", status: 402 });
    await expect(writeLesson(PHOTO)).rejects.toBeInstanceOf(ApiError);
  });

  test("rejects an answer that does not match the schema", async () => {
    fetchMock.mockResolvedValue(completion({ title: "nope" }));
    await expect(writeLesson(PHOTO)).rejects.toThrow();
  });
});

describe("LESSON_INSTRUCTIONS", () => {
  test("ask for 7 scenes of 40–50 words, a textbook-page check and no digits", () => {
    expect(LESSON_INSTRUCTIONS).toMatch(/7 scenes/);
    expect(LESSON_INSTRUCTIONS).toMatch(/40.50 words/);
    expect(LESSON_INSTRUCTIONS).toMatch(/isTextbookPage/);
    expect(LESSON_INSTRUCTIONS).toMatch(/digits/);
  });

  test("ask for every highlight object to be drawn in its scene's image prompt", () => {
    expect(LESSON_INSTRUCTIONS).toMatch(/imagePrompt[^.]*(name|show)[^.]*highlight/i);
  });
});
