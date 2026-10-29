// Step 2b, in parallel with the scenes: MMS reads the lesson on Modal and times every word.

import { schemaTask } from "@trigger.dev/sdk";
import { quizQuestionsFor } from "../lib/lesson/length";
import { narrationPlan } from "../lib/lesson/narration";
import { recordMetrics, updateLesson } from "../lib/lessons/repo";
import { modalCostUsd, narrate as narrateOnModal } from "../lib/modal/client";
import { lessonPaths, signedUploadUrl } from "../lib/supabase/storage";
import { LessonPayload, loadScript } from "./shared";

export const narrate = schemaTask({
  id: "narrate",
  schema: LessonPayload,
  // The voice's cold start plus a CPU narration, within the Modal function's own 600 s.
  maxDuration: 600,
  run: async ({ lessonId }) => {
    const { row, lesson } = await loadScript(lessonId);
    const path = lessonPaths.voice(lessonId);
    // A lesson from before the length choice asks the whole quiz.
    const quizQuestions = row.targetSeconds === null ? undefined : quizQuestionsFor(row.targetSeconds);
    const { groups, pauses } = narrationPlan(lesson, row.language, quizQuestions);
    const { words, audioSeconds, seconds } = await narrateOnModal({
      groups,
      pauses,
      language: row.language,
      uploadUrl: await signedUploadUrl(path),
    });
    await updateLesson(lessonId, { words, audioPath: path });
    await recordMetrics(lessonId, "narrate", { seconds, costUsd: modalCostUsd(seconds) });
    return { audioSeconds };
  },
});
