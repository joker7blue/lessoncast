import { beforeEach, describe, expect, test, vi } from "vitest";
import { makeLesson } from "@/lib/lesson/lesson.fixture";
import type { LessonRow } from "@/lib/lessons/repo";

const repo = vi.hoisted(() => ({ getLesson: vi.fn() }));
vi.mock("@/lib/lessons/repo", () => repo);
vi.mock("@/lib/supabase/storage", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  publicUrl: (path: string) => `https://cdn.test/lessons/${path}`,
}));

import { GET } from "./route";

const ID = "4b4a8a4e-3c1a-4d55-9a57-2f0f6b2b8c11";

function row(patch: Partial<LessonRow> = {}): LessonRow {
  return {
    id: ID,
    createdAt: "2026-10-28T12:00:00Z",
    language: "pcm",
    pageCount: 1,
    style: "auto",
    status: "queued",
    error: null,
    script: null,
    scenePaths: [],
    audioPath: null,
    videoPath: null,
    words: null,
    metrics: {},
    ipHash: null,
    triggerRunId: null,
    ...patch,
  };
}

const get = (id: string) => GET(new Request(`http://localhost/api/lessons/${id}`), { params: Promise.resolve({ id }) });

beforeEach(() => vi.clearAllMocks());

describe("GET /api/lessons/:id", () => {
  test("404 for a malformed id and for an unknown id", async () => {
    repo.getLesson.mockResolvedValue(null);
    expect((await get("not-a-uuid")).status).toBe(404);
    expect((await get(ID)).status).toBe(404);
  });

  test("a queued lesson: the teacher's style, no title or images yet", async () => {
    repo.getLesson.mockResolvedValue(row());
    expect(await (await get(ID)).json()).toEqual({
      status: "queued",
      language: "pcm",
      createdAt: "2026-10-28T12:00:00Z",
      pageCount: 1,
      error: null,
      title: null,
      style: "auto",
      sceneCount: null,
      sceneImageUrls: [],
      voice: null,
      videoUrl: null,
      metrics: {},
    });
  });

  test("the graph gets each step's metrics and the voice's length and word count", async () => {
    const metrics = { "write-script": { seconds: 40.7, costUsd: 0.047 }, narrate: { seconds: 51.1, costUsd: 0.006 } };
    const words = [
      { word: "Heart", start: 0, end: 0.4, score: 0.9, group: 0 },
      { word: "na", start: 3.6, end: 3.8, score: 0.9, group: 1 },
    ];
    repo.getLesson.mockResolvedValue(row({ status: "drawing", script: makeLesson(6), metrics, words }));
    const body = await (await get(ID)).json();
    expect(body.metrics).toEqual(metrics);
    expect(body.voice).toEqual({ seconds: 3.8, words: 2 });
  });

  test("returns the title in the lesson's language and only the scene images already drawn", async () => {
    const lesson = { ...makeLesson(6), style: "comic" as const };
    repo.getLesson.mockResolvedValue(row({ status: "drawing", script: lesson, scenePaths: [`${ID}/scenes/1.jpg`, null, `${ID}/scenes/3.jpg`] }));
    const body = await (await get(ID)).json();
    expect(body.title).toBe("Heart na pump");
    expect(body.style).toBe("comic");
    expect(body.sceneCount).toBe(6);
    expect(body.sceneImageUrls).toEqual([`https://cdn.test/lessons/${ID}/scenes/1.jpg`, `https://cdn.test/lessons/${ID}/scenes/3.jpg`]);
  });

  test("a finished lesson gives its video URL; a failed one its message", async () => {
    repo.getLesson.mockResolvedValue(row({ status: "done", script: makeLesson(6), videoPath: `${ID}/video.mp4` }));
    expect((await (await get(ID)).json()).videoUrl).toBe(`https://cdn.test/lessons/${ID}/video.mp4`);
    repo.getLesson.mockResolvedValue(row({ status: "failed", error: "Putting the video together failed. Try again in a few minutes." }));
    expect((await (await get(ID)).json()).error).toMatch(/video together/);
  });
});
