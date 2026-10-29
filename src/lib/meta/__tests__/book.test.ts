import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { BOOK_INSTRUCTIONS, readSlice } from "../book";

const PDF = new TextEncoder().encode("%PDF-1.7 fake");
const slice = { firstPage: 31, lastPage: 60, bytes: PDF };
const answer = {
  isTextbook: true,
  language: "fr",
  book: { title: "Sciences CM1", subject: "Sciences", level: "CM1" },
  lessons: [{ title: "Le cœur", firstPage: 2, lastPage: 5, summary: "Le cœur pompe le sang.", continuesPrevious: false }],
};

function completion(content: unknown) {
  const usage = { prompt_tokens: 75_000, completion_tokens: 2_000, prompt_tokens_details: { cached_tokens: 0 } };
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) }, finish_reason: "stop" }], usage }), { status: 200 });
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubEnv("MODEL_API_KEY", "test-key");
  fetchMock = vi.fn(async () => completion(answer));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const sent = () => JSON.parse(fetchMock.mock.calls[0]![1].body);

describe("readSlice", () => {
  test("sends the slice inline as a PDF file with the strict BookSlice schema", async () => {
    await readSlice(slice, 120);
    const body = sent();
    expect(body.model).toBe("muse-spark-1.3");
    expect(body.messages[0]).toEqual({ role: "system", content: BOOK_INSTRUCTIONS });
    const [text, file] = body.messages[1].content;
    expect(text.text).toContain("pages 31 to 60 of a book of 120 pages");
    expect(file).toEqual({ type: "file", file: { filename: "pages-31-60.pdf", file_data: `data:application/pdf;base64,${Buffer.from(PDF).toString("base64")}` } });
    expect(body.response_format.json_schema).toMatchObject({ name: "BookSlice", strict: true });
    expect(body.response_format.json_schema.schema.properties.lessons).toBeDefined();
  });

  test("returns the parsed answer with its time and cost", async () => {
    const result = await readSlice(slice, 120);
    expect(result.answer).toEqual(answer);
    expect(result.costUsd).toBeCloseTo((75_000 * 1.25 + 2_000 * 4.25) / 1e6, 6);
    expect(result.seconds).toBeGreaterThanOrEqual(0);
  });

  test("throws when the answer doesn't match the schema", async () => {
    fetchMock.mockImplementation(async () => completion({ lessons: "none" }));
    await expect(readSlice(slice, 120)).rejects.toThrow();
  });
});
