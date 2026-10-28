// Step 2a: Muse Image draws the scenes, each uploaded and recorded as soon as it is ready, so the
// lesson page can show them while the others are drawn.

import { logger, schemaTask } from "@trigger.dev/sdk";
import { recordMetrics, setScenePath } from "../lib/lessons/repo";
import { drawAllScenes } from "../lib/lessons/scenes";
import { editImage, generateImage } from "../lib/meta/images";
import { IMAGE_COST_USD } from "../lib/meta/prices";
import { lessonPaths, publicUrl, uploadFile } from "../lib/supabase/storage";
import { LessonPayload, loadScript } from "./shared";

export const drawScenes = schemaTask({
  id: "draw-scenes",
  schema: LessonPayload,
  // Room for a timed-out image to be retried or redrawn: a task past its budget is not retried.
  maxDuration: 600,
  run: async ({ lessonId }) => {
    const { row, lesson } = await loadScript(lessonId);
    const start = performance.now();
    const drawn = lesson.scenes.map((_, i) => {
      const path = row.scenePaths[i];
      return path ? publicUrl(path) : null;
    });
    const count = await drawAllScenes(lesson, drawn, {
      generateImage,
      editImage,
      warn: (message) => logger.warn(message),
      saveScene: async (n, bytes) => {
        const path = lessonPaths.scene(lessonId, n);
        await uploadFile(path, bytes, "image/jpeg");
        await setScenePath(lessonId, n, path);
        return publicUrl(path);
      },
    });
    const seconds = (performance.now() - start) / 1000;
    await recordMetrics(lessonId, "draw-scenes", { seconds, costUsd: count * IMAGE_COST_USD });
    return { drawn: count };
  },
});
