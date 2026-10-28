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
      error: null,
      title: null,
      style: "auto",
      sceneCount: null,
      sceneImageUrls: [],
      videoUrl: null,
    });
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
    repo.getLesson.mockResolvedValue(row({ status: "failed", error: "Le montage de la vidéo a échoué. Réessayez dans quelques minutes." }));
    expect((await (await get(ID)).json()).error).toMatch(/montage/);
  });
});
