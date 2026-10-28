// The lesson pipeline: write the script, then draw the scenes and record the voice in parallel, then
// find the highlights with SAM, then render the video. Each step is a child task with its own retries;
// waiting on them is not billed.

import { AbortTaskRunError, batch, logger, schemaTask } from "@trigger.dev/sdk";
import { runLesson, StepError } from "../lib/lessons/pipeline";
import { getLesson, updateLesson } from "../lib/lessons/repo";
import { drawScenes } from "./draw-scenes";
import { findHighlights } from "./find-highlights";
import { narrate } from "./narrate";
import { renderVideo } from "./render-video";
import { LessonPayload } from "./shared";
import { writeScript } from "./write-script";

export const generateLesson = schemaTask({
  id: "generate-lesson",
  schema: LessonPayload,
  maxDuration: 1200,
  // The steps retry on their own; a failed lesson is final (the teacher sends new photos).
  retry: { maxAttempts: 1 },
  run: async ({ lessonId }) => {
    const result = await runLesson(lessonId, {
      getLessonStatus: async (id) => (await getLesson(id))?.status ?? null,
      updateLesson,
      writeScript: () => writeScript.triggerAndWait({ lessonId }).unwrap(),
      drawAndNarrate: async () => {
        const {
          runs: [scenes, voice],
        } = await batch.triggerByTaskAndWait([
          { task: drawScenes, payload: { lessonId } },
          { task: narrate, payload: { lessonId } },
        ]);
        if (!scenes.ok) throw new StepError("draw-scenes", scenes.error);
        if (!voice.ok) throw new StepError("narrate", voice.error);
        return { audioSeconds: voice.output.audioSeconds };
      },
      findHighlights: async () => {
        const result = await findHighlights.triggerAndWait({ lessonId });
        if (!result.ok) throw result.error;
      },
      renderVideo: async (audioSeconds) => {
        await renderVideo.triggerAndWait({ lessonId, audioSeconds }).unwrap();
      },
      warn: (message) => logger.warn(message),
    });

    if (result.outcome === "failed") {
      logger.error(`Lesson failed at ${result.step}`, { error: String(result.error) });
      throw new AbortTaskRunError(`${result.step} failed: ${String(result.error)}`);
    }
    return result;
  },
});
