import { describe, expect, test, vi } from "vitest";
import { NotATextbookPageError } from "./errors";
import { type PipelineDeps, runLesson, StepError } from "./pipeline";
import type { LessonStatus } from "./repo";

function deps(status: LessonStatus | null = "queued", overrides: Partial<PipelineDeps> = {}) {
  const updates: Record<string, unknown>[] = [];
  const d: PipelineDeps = {
    getLessonStatus: vi.fn(async () => status),
    updateLesson: vi.fn(async (_id, patch) => {
      updates.push(patch);
    }),
    writeScript: vi.fn(async () => ({ isTextbookPage: true })),
    drawAndNarrate: vi.fn(async () => ({ audioSeconds: 80 })),
    renderVideo: vi.fn(async () => {}),
    ...overrides,
  };
  return { d, updates };
}

describe("runLesson", () => {
  test("statuses go queued → reading → drawing → rendering → done", async () => {
    const { d, updates } = deps();
    expect(await runLesson("id", d)).toEqual({ outcome: "done" });
    expect(updates.map((u) => u.status)).toEqual(["reading", "drawing", "rendering", "done"]);
    expect(d.renderVideo).toHaveBeenCalledWith(80);
  });

  test("does nothing when the lesson is no longer queued, or gone", async () => {
    for (const status of ["drawing", "done", "failed", null] as const) {
      const { d, updates } = deps(status);
      expect(await runLesson("id", d)).toEqual({ outcome: "skipped" });
      expect(updates).toEqual([]);
      expect(d.writeScript).not.toHaveBeenCalled();
    }
  });

  test("a non-textbook page fails the lesson at reading and never starts drawing", async () => {
    const { d, updates } = deps("queued", { writeScript: vi.fn(async () => ({ isTextbookPage: false })) });
    const result = await runLesson("id", d);
    expect(result).toMatchObject({ outcome: "failed", step: "write-script" });
    expect(result.outcome === "failed" && result.error).toBeInstanceOf(NotATextbookPageError);
    expect(updates.at(-1)).toEqual({
      status: "failed",
      error: "Une photo ne ressemble pas à une page de manuel. Reprenez une photo nette de chaque page, en entier.",
    });
    expect(d.drawAndNarrate).not.toHaveBeenCalled();
  });

  test("a failed voice fails the lesson with the voice's message and never renders", async () => {
    const drawAndNarrate = vi.fn(async () => {
      throw new StepError("narrate", new Error("Modal timeout"));
    });
    const { d, updates } = deps("queued", { drawAndNarrate });
    expect(await runLesson("id", d)).toMatchObject({ outcome: "failed", step: "narrate" });
    expect(updates.at(-1)).toEqual({ status: "failed", error: "La voix n'a pas pu être enregistrée. Réessayez dans quelques minutes." });
    expect(d.renderVideo).not.toHaveBeenCalled();
  });

  test("a failed render fails the lesson at render-video", async () => {
    const { d, updates } = deps("queued", { renderVideo: vi.fn(async () => Promise.reject(new Error("Chrome"))) });
    expect(await runLesson("id", d)).toMatchObject({ outcome: "failed", step: "render-video" });
    expect(updates.map((u) => u.status)).toEqual(["reading", "drawing", "rendering", "failed"]);
  });
});
