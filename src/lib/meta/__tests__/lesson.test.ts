import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { makeScript } from "../../lesson/lesson.fixture";
import { ApiError } from "../client";
import { STYLES } from "../../lesson/styles";
import { LESSON_INSTRUCTIONS, writeLesson } from "../lesson";

/** The lesson of a result that must be a textbook page. */
async function lessonOf(result: ReturnType<typeof writeLesson>) {
  const written = await result;
  if (!written.isTextbookPage) throw new Error("expected a textbook page");
  return written.lesson;
}

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
    fetchMock.mockResolvedValue(completion(makeScript(7)));
    await writeLesson({ photoUrls: [PHOTO] }, "auto", "fr");
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
    const lesson = makeScript(7);
    fetchMock.mockResolvedValue(completion(lesson));
    expect(await lessonOf(writeLesson({ photoUrls: [PHOTO] }, "auto", "fr"))).toEqual(lesson);
  });

  test("computes the cost from the token usage", async () => {
    fetchMock.mockResolvedValue(completion(makeScript(7)));
    expect((await writeLesson({ photoUrls: [PHOTO] }, "auto", "fr")).costUsd).toBeCloseTo(0.0333, 4);
  });

  test("throws ApiError with the HTTP status on a billing error", async () => {
    fetchMock.mockImplementation(async () => new Response('{"error":{"code":"billing_not_configured"}}', { status: 402 }));
    await expect(writeLesson({ photoUrls: [PHOTO] }, "auto", "fr")).rejects.toMatchObject({ name: "ApiError", status: 402 });
    await expect(writeLesson({ photoUrls: [PHOTO] }, "auto", "fr")).rejects.toBeInstanceOf(ApiError);
  });

  test("sends every page as an image, in page order", async () => {
    fetchMock.mockResolvedValue(completion(makeScript(7)));
    await writeLesson({ photoUrls: PAGES }, "auto", "fr");
    expect(userContent().filter((part) => part.type === "image_url").map((part) => part.image_url?.url)).toEqual(PAGES);
    expect(userContent()[0]!.text).toMatch(/3 pages of the lesson, in order/);
  });

  test("refuses 0 or 5 pages without calling the API", async () => {
    await expect(writeLesson({ photoUrls: [] }, "auto", "fr")).rejects.toThrow(RangeError);
    await expect(writeLesson({ photoUrls: [...PAGES, ...PAGES].slice(0, 5) }, "auto", "fr")).rejects.toThrow(RangeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("sends a book lesson's pages as one inline PDF", async () => {
    fetchMock.mockResolvedValue(completion(makeScript(7)));
    const pdf = new TextEncoder().encode("%PDF-1.7 pages");
    await writeLesson({ pdf, pageCount: 6 }, "auto", "fr");
    const content = userContent() as unknown as { type: string; text?: string; file?: { filename: string; file_data: string } }[];
    expect(content[0]!.text).toMatch(/6 pages of the lesson, as a PDF, in order/);
    expect(content[1]).toEqual({ type: "file", file: { filename: "lesson.pdf", file_data: `data:application/pdf;base64,${Buffer.from(pdf).toString("base64")}` } });
    expect(content.some((part) => part.type === "image_url")).toBe(false);
  });

  test("refuses a book lesson of more than 20 pages without calling the API", async () => {
    await expect(writeLesson({ pdf: new Uint8Array([1]), pageCount: 21 }, "auto", "fr")).rejects.toThrow(RangeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a forced style wins over the model's choice", async () => {
    fetchMock.mockResolvedValue(completion({ ...makeScript(7), style: "comic" }));
    const lesson = await lessonOf(writeLesson({ photoUrls: [PHOTO] }, "realistic", "fr"));
    expect(lesson.style).toBe("realistic");
    expect(userContent()[0]!.text).toContain('Use the image style "realistic".');
  });

  test("in Automatique the model's style is kept and every rule is sent", async () => {
    fetchMock.mockResolvedValue(completion({ ...makeScript(7), style: "diagram" }));
    const lesson = await lessonOf(writeLesson({ photoUrls: [PHOTO] }, "auto", "fr"));
    expect(lesson.style).toBe("diagram");
    for (const [key, style] of Object.entries(STYLES)) expect(userContent()[0]!.text).toContain(`${key}: ${style.when}`);
  });

  test("a page that isn't a textbook is reported even when the rest of the answer is incomplete", async () => {
    const page = { isTextbookPage: false, subject: "", level: "", topic: "", keyText: "" };
    fetchMock.mockResolvedValue(completion({ page, title: { fr: "", pcm: "" }, scenes: [], quiz: [] }));
    const written = await writeLesson({ photoUrls: [PHOTO] }, "auto", "fr");
    expect(written.isTextbookPage).toBe(false);
    expect(written.costUsd).toBeGreaterThan(0);
  });

  test("asks for the video's language, with its writing rule, and its length", async () => {
    fetchMock.mockResolvedValue(completion(makeScript(4, "hau")));
    await writeLesson({ photoUrls: [PHOTO] }, "auto", "hau", 120);
    const text = userContent()[0]!.text!;
    expect(text).toContain("Write the lesson in Hausa: Hausa as spoken in northern Cameroon");
    // Hausa's voice is slower: fewer words for the same 2 minutes.
    expect(text).toContain("The video lasts about 2 minutes: write 4 scenes, each narration about 26 words.");
    const schema = JSON.parse(fetchMock.mock.calls[0]![1].body).response_format.json_schema.schema;
    expect(Object.keys(schema.properties.title.properties)).toEqual(["hau"]);
    expect(schema.properties.videoText).toBeDefined();
  });

  test("a lesson from before the length choice asks for about three minutes", async () => {
    fetchMock.mockResolvedValue(completion(makeScript(7)));
    await writeLesson({ photoUrls: [PHOTO] }, "auto", "fr");
    expect(userContent()[0]!.text).toContain("The video lasts about 3 minutes: write 8 scenes");
  });

  test("rejects a script missing the video's language", async () => {
    fetchMock.mockResolvedValue(completion(makeScript(4, "fr")));
    await expect(writeLesson({ photoUrls: [PHOTO] }, "auto", "yor")).rejects.toThrow();
  });

  test("rejects an answer that does not match the schema", async () => {
    fetchMock.mockResolvedValue(completion({ title: "nope" }));
    await expect(writeLesson({ photoUrls: [PHOTO] }, "auto", "fr")).rejects.toThrow();
  });
});

describe("LESSON_INSTRUCTIONS", () => {
  test("ask for the scenes the request asks for, a textbook-page check and no digits", () => {
    expect(LESSON_INSTRUCTIONS).toMatch(/number of scenes the request asks for/);
    expect(LESSON_INSTRUCTIONS).toMatch(/isTextbookPage/);
    expect(LESSON_INSTRUCTIONS).toMatch(/digits/);
  });

  test("ask for the recurring characters and places, and every text in the request's language", () => {
    expect(LESSON_INSTRUCTIONS).toMatch(/visualNotes/);
    expect(LESSON_INSTRUCTIONS).not.toMatch(/artStyle/);
    expect(LESSON_INSTRUCTIONS).toMatch(/request's language only/);
  });

  test("ask to keep apostrophes and accents in the spoken text", () => {
    expect(LESSON_INSTRUCTIONS).toMatch(/apostrophes/);
    expect(LESSON_INSTRUCTIONS).toMatch(/l'histoire/);
  });

  test("ask for every highlight object to be drawn in its scene's image prompt", () => {
    expect(LESSON_INSTRUCTIONS).toMatch(/imagePrompt[^.]*(name|show)[^.]*highlight/i);
  });
});
