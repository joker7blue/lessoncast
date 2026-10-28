// Step 2b, in parallel with the scenes: MMS reads the lesson on Modal and times every word.

import { schemaTask } from "@trigger.dev/sdk";
import { narrationGroups } from "../lib/lesson/narration";
import { recordMetrics, updateLesson } from "../lib/lessons/repo";
import { modalCostUsd, narrate as narrateOnModal } from "../lib/modal/client";
import { lessonPaths, signedUploadUrl } from "../lib/supabase/storage";
import { LessonPayload, loadScript } from "./shared";

export const narrate = schemaTask({
  id: "narrate",
  schema: LessonPayload,
  maxDuration: 300,
  run: async ({ lessonId }) => {
    const { row, lesson } = await loadScript(lessonId);
    const path = lessonPaths.voice(lessonId);
    const { words, audioSeconds, seconds } = await narrateOnModal({
      groups: narrationGroups(lesson, row.language),
      language: row.language,
      uploadUrl: await signedUploadUrl(path),
    });
    await updateLesson(lessonId, { words, audioPath: path });
    await recordMetrics(lessonId, "narrate", { seconds, costUsd: modalCostUsd(seconds) });
    return { audioSeconds };
  },
});
