// Step 4: the timeline is built from the script, the word timings, the images and the highlights SAM
// found, then Remotion renders the MP4 on Modal.

import { AbortTaskRunError, logger, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { loadHighlights } from "../lib/lessons/highlights";
import { recordMetrics, updateLesson } from "../lib/lessons/repo";
import { modalCostUsd, renderVideo as renderOnModal } from "../lib/modal/client";
import { downloadFile, lessonPaths, publicUrl, signedUploadUrl } from "../lib/supabase/storage";
import { buildVideoProps } from "../lib/video/timeline";
import { LessonPayload, loadScript } from "./shared";

export const renderVideo = schemaTask({
  id: "render-video",
  schema: LessonPayload.extend({ audioSeconds: z.number().positive() }),
  maxDuration: 600,
  run: async ({ lessonId, audioSeconds }) => {
    const { row, lesson } = await loadScript(lessonId);
    if (!row.words || !row.audioPath) throw new AbortTaskRunError(`Lesson ${lessonId} has no narration yet`);
    const sceneImageUrls = lesson.scenes.map((_, i) => {
      const path = row.scenePaths[i];
      if (!path) throw new AbortTaskRunError(`Scene ${i + 1} of lesson ${lessonId} has no image`);
      return publicUrl(path);
    });
    const props = buildVideoProps({
      lesson,
      language: row.language,
      words: row.words,
      audioUrl: publicUrl(row.audioPath),
      audioSeconds,
      sceneImageUrls,
      highlights: await loadHighlights(row.highlightsPath, { download: downloadFile, warn: (message) => logger.warn(message) }),
    });

    const path = lessonPaths.video(lessonId);
    const { bytes, seconds } = await renderOnModal({ props, uploadUrl: await signedUploadUrl(path) });
    await updateLesson(lessonId, { videoPath: path });
    await recordMetrics(lessonId, "render-video", { seconds, costUsd: modalCostUsd(seconds) });
    return { bytes };
  },
});
