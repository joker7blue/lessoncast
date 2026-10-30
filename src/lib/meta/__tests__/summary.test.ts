import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { LANGUAGES } from "../../lesson/languages";
import { SPARK_MODEL } from "../models";
import { summarizeLesson } from "../summary";

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
const ANSWER = {
  summary: "Zuciya tana tura jini zuwa dukkan jiki ta hanyar jijiyoyi, dare da rana.",
  keyTerms: [
    { term: "zuciya", meaning: "Nama mai tura jini." },
    { term: "jijiya", meaning: "Hanyar da jini ke bi." },
  ],
};

function completion(content: unknown) {
  const usage = { prompt_tokens: 3000, completion_tokens: 800, prompt_tokens_details: { cached_tokens: 0 } };
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) }, finish_reason: "stop" }], usage }), { status: 200 });
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

test("asks Muse Spark for a summary in the chosen language, from the lesson's pages", async () => {
  fetchMock.mockResolvedValue(completion(ANSWER));
  const written = await summarizeLesson({ pdf: PDF, pageCount: 4 }, "hau");
  expect(written.summary).toEqual(ANSWER);
  expect(written.costUsd).toBeGreaterThan(0);
  const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
  expect(body.model).toBe(SPARK_MODEL);
  expect(body.response_format.json_schema.strict).toBe(true);
  expect(Object.keys(body.response_format.json_schema.schema.properties)).toEqual(["summary", "keyTerms"]);
  const content = body.messages.find((m: { role: string }) => m.role === "user").content;
  expect(content[0].text).toContain(`Write the summary in Hausa: ${LANGUAGES.hau.writing}`);
  expect(content[1].file.file_data).toMatch(/^data:application\/pdf;base64,/);
});

test("refuses an answer that doesn't match the schema", async () => {
  fetchMock.mockResolvedValue(completion({ summary: "Short.", keyTerms: [] }));
  await expect(summarizeLesson({ pdf: PDF, pageCount: 4 }, "fr")).rejects.toThrow();
});
