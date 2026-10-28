import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ApiError } from "../client";
import { segment } from "../sam";

const STREAM = readFileSync(path.join(__dirname, "fixtures", "sam-stream.txt"), "utf8");
const IMAGE = "data:image/jpeg;base64,AAAA";

const sse = (text: string) => new Response(text, { status: 200, headers: { "Content-Type": "text/event-stream" } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubEnv("MODEL_API_KEY", "test-key");
  fetchMock = vi.fn().mockImplementation(async () => sse(STREAM));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("segment", () => {
  test("sends sam-3.1 a streamed request with the prompt then the image", async () => {
    await segment(IMAGE, "globe");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/\/responses$/);
    expect(init.headers.Accept).toBe("text/event-stream");
    expect(JSON.parse(init.body)).toEqual({
      model: "sam-3.1",
      stream: true,
      metadata: { include_confidence: "true" },
      input: [
        {
          type: "message",
          role: "user",
          content: [
            { type: "input_text", text: "globe" },
            { type: "input_image", image_url: IMAGE },
          ],
        },
      ],
    });
  });

  test("turns the recorded stream into matches", async () => {
    const matches = await segment(IMAGE, "globe");
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      expect(m.d).toMatch(/^M/);
      expect(m.maskWidth).toBeGreaterThan(0);
      expect(m.maskHeight).toBeGreaterThan(0);
      expect(m.box[2]).toBeGreaterThan(m.box[0]);
      expect(m.box[3]).toBeGreaterThan(m.box[1]);
      expect(m.confidence).toBeGreaterThan(0.5);
    }
  });

  test("returns no match for a stream without masks", async () => {
    // The recorded stream with its output text (the box and mask records) emptied.
    const empty = STREAM.replace(/"(text|delta)":"(?:[^"\\]|\\.)+"/g, '"$1":""');
    expect(empty).not.toContain("<|mask");
    fetchMock.mockImplementation(async () => sse(empty));
    expect(await segment(IMAGE, "unicorn")).toEqual([]);
  });

  test("throws ApiError on HTTP 500", async () => {
    fetchMock.mockImplementation(async () => new Response("boom", { status: 500 }));
    await expect(segment(IMAGE, "globe")).rejects.toBeInstanceOf(ApiError);
  });
});
