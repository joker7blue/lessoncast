// Step 3: SAM 3.1 cuts out the objects each scene's narration names, and the masks are stored for the
// render. An object SAM can't find is dropped; generate-lesson renders without highlights if this fails.

import { AbortTaskRunError, logger, schemaTask } from "@trigger.dev/sdk";
import { findAllHighlights } from "../lib/lessons/highlights";
import { recordMetrics, updateLesson } from "../lib/lessons/repo";
import { SAM_COST_USD } from "../lib/meta/prices";
import { segment } from "../lib/meta/sam";
import { downloadFile, lessonPaths, uploadFile } from "../lib/supabase/storage";
import { LessonPayload, loadScript } from "./shared";

export const findHighlights = schemaTask({
  id: "find-highlights",
  schema: LessonPayload,
  // About 25 s: 14 requests of 4 to 15 s, 4 at a time.
  maxDuration: 300,
  run: async ({ lessonId }) => {
    const { row, lesson } = await loadScript(lessonId);
    const start = performance.now();
    const images = await Promise.all(
      lesson.scenes.map((_, i) => {
        const path = row.scenePaths[i];
        if (!path) throw new AbortTaskRunError(`Scene ${i + 1} of lesson ${lessonId} has no image`);
        return downloadFile(path);
      }),
    );
    const { scenes, found, requested } = await findAllHighlights(lesson, images, { segment, warn: (message) => logger.warn(message) });

    const path = lessonPaths.highlights(lessonId);
    await uploadFile(path, new TextEncoder().encode(JSON.stringify(scenes)), "application/json");
    await updateLesson(lessonId, { highlightsPath: path });
    const seconds = (performance.now() - start) / 1000;
    await recordMetrics(lessonId, "find-highlights", { seconds, costUsd: requested * SAM_COST_USD, found, requested });
    return { found, requested };
  },
});
