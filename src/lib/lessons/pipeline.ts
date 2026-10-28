// The order of the lesson pipeline and the statuses the teacher sees, kept apart from Trigger.dev
// so it can be tested: the generate-lesson task wires each step to its child task.

import { NotATextbookPageError, type Step, teacherMessage } from "./errors";
import type { LessonPatch, LessonStatus } from "./repo";

/** A step that failed inside a parallel group, so the lesson is failed with that step's message. */
export class StepError extends Error {
  constructor(
    readonly step: Step,
    cause: unknown,
  ) {
    super(`${step} failed`, { cause });
    this.name = "StepError";
  }
}

export type PipelineDeps = {
  getLessonStatus(id: string): Promise<LessonStatus | null>;
  updateLesson(id: string, patch: LessonPatch): Promise<void>;
  writeScript(): Promise<{ isTextbookPage: boolean }>;
  /** The scene images and the narration, in parallel. */
  drawAndNarrate(): Promise<{ audioSeconds: number }>;
  /** SAM 3.1 on the scene images. Its failure is not the lesson's: the video renders without it. */
  findHighlights(): Promise<void>;
  renderVideo(audioSeconds: number): Promise<void>;
  warn?(message: string): void;
};

export type Outcome = { outcome: "skipped" } | { outcome: "done" } | { outcome: "failed"; step: Step; error: unknown };

export async function runLesson(lessonId: string, deps: PipelineDeps): Promise<Outcome> {
  // A second trigger of the same lesson, or a lesson already finished, does nothing.
  if ((await deps.getLessonStatus(lessonId)) !== "queued") return { outcome: "skipped" };

  let step: Step = "write-script";
  try {
    await deps.updateLesson(lessonId, { status: "reading" });
    const { isTextbookPage } = await deps.writeScript();
    if (!isTextbookPage) throw new NotATextbookPageError();

    step = "draw-scenes";
    await deps.updateLesson(lessonId, { status: "drawing" });
    const { audioSeconds } = await deps.drawAndNarrate();

    await deps.updateLesson(lessonId, { status: "highlighting" });
    try {
      await deps.findHighlights();
    } catch (error) {
      deps.warn?.(`find-highlights failed, rendering without highlights: ${error instanceof Error ? error.message : String(error)}`);
    }

    step = "render-video";
    await deps.updateLesson(lessonId, { status: "rendering" });
    await deps.renderVideo(audioSeconds);

    await deps.updateLesson(lessonId, { status: "done" });
    return { outcome: "done" };
  } catch (error) {
    const failed = error instanceof StepError ? error.step : step;
    const cause = error instanceof StepError ? error.cause : error;
    await deps.updateLesson(lessonId, { status: "failed", error: teacherMessage(failed, cause) });
    return { outcome: "failed", step: failed, error: cause };
  }
}
