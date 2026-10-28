// Step 1: Muse Spark reads the page photos and writes the lesson.

import { logger, schemaTask } from "@trigger.dev/sdk";
import { recordMetrics, updateLesson } from "../lib/lessons/repo";
import { writeLesson } from "../lib/meta/lesson";
import { warmVoice } from "../lib/modal/client";
import { lessonPaths, publicUrl } from "../lib/supabase/storage";
import { LessonPayload, loadLesson } from "./shared";

export const writeScript = schemaTask({
  id: "write-script",
  schema: LessonPayload,
  maxDuration: 180,
  run: async ({ lessonId }) => {
    // The voice's cold start (about 30 s) overlaps the script writing instead of delaying the narration.
    await warmVoice().catch((error: unknown) => logger.warn("Could not warm the voice", { error: String(error) }));

    const row = await loadLesson(lessonId);
    const pages = Array.from({ length: row.pageCount }, (_, i) => publicUrl(lessonPaths.page(lessonId, i + 1)));
    const { lesson, seconds, costUsd } = await writeLesson(pages, row.style);
    await updateLesson(lessonId, { script: lesson });
    await recordMetrics(lessonId, "write-script", { seconds, costUsd });
    logger.info("Lesson written", { title: lesson.title.fr, style: lesson.style, scenes: lesson.scenes.length, seconds, costUsd });
    return { isTextbookPage: lesson.page.isTextbookPage };
  },
});
