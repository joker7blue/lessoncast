// Runs against the real Supabase project when .env has its keys, and skips itself otherwise.

import { afterAll, describe, expect, test } from "vitest";
import { supabase } from "../../supabase/server";
import { createLesson, getLesson, recordMetrics, setScenePath, updateLesson } from "../repo";

const live = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
const ids: string[] = [];

async function newLesson() {
  const row = await createLesson({ language: "pcm", ipHash: null, pageCount: 1, style: "auto", targetSeconds: 120 });
  ids.push(row.id);
  return row;
}

describe.skipIf(!live)("lessons table (live Supabase)", { timeout: 30_000 }, () => {
  afterAll(async () => {
    if (ids.length) await supabase().from("lessons").delete().in("id", ids);
  });

  test("create, update, set scene paths in parallel, record metrics, read back", async () => {
    const row = await newLesson();
    expect(row.status).toBe("queued");
    expect(row.language).toBe("pcm");
    expect(row.scenePaths).toEqual([]);
    expect(row.metrics).toEqual({});

    await Promise.all([3, 2, 1].map((n) => setScenePath(row.id, n, `x/${n}.jpg`)));
    await Promise.all([
      recordMetrics(row.id, "write-script", { seconds: 22.7, costUsd: 0.033 }),
      recordMetrics(row.id, "narrate", { seconds: 4.1, costUsd: 0.002 }),
    ]);
    await updateLesson(row.id, { status: "reading", triggerRunId: "run_123" });

    const back = await getLesson(row.id);
    expect(back?.status).toBe("reading");
    expect(back?.triggerRunId).toBe("run_123");
    expect(back?.scenePaths).toEqual(["x/1.jpg", "x/2.jpg", "x/3.jpg"]);
    expect(back?.metrics["write-script"]).toEqual({ seconds: 22.7, costUsd: 0.033 });
    expect(back?.metrics.narrate).toEqual({ seconds: 4.1, costUsd: 0.002 });
  });

  test("a scene that arrives before the earlier ones keeps its position", async () => {
    const row = await newLesson();
    await setScenePath(row.id, 3, "x/3.jpg");
    expect((await getLesson(row.id))?.scenePaths).toEqual([null, null, "x/3.jpg"]);
  });

  test("the database rejects a status outside the pipeline's steps", async () => {
    const row = await newLesson();
    // @ts-expect-error: not a LessonStatus
    await expect(updateLesson(row.id, { status: "paused" })).rejects.toThrow(/lessons_status_check/);
  });

  test("a lesson stores its page count and the teacher's style", async () => {
    const row = await createLesson({ language: "fr", ipHash: null, pageCount: 3, style: "realistic", targetSeconds: 120 });
    ids.push(row.id);
    expect([row.pageCount, row.style]).toEqual([3, "realistic"]);
  });

  test("the database refuses a fifth page", async () => {
    await expect(createLesson({ language: "fr", ipHash: null, pageCount: 5, style: "auto", targetSeconds: 120 })).rejects.toThrow(/page_count/);
  });

  test("an unknown or malformed id reads as no lesson", async () => {
    expect(await getLesson(crypto.randomUUID())).toBeNull();
    expect(await getLesson("not-a-uuid")).toBeNull();
  });
});
