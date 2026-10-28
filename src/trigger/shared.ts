// What every pipeline task shares: the payload, and the lesson row with its script.

import { AbortTaskRunError } from "@trigger.dev/sdk";
import { z } from "zod";
import type { Lesson } from "../lib/lesson/schema";
import { getLesson, type LessonRow } from "../lib/lessons/repo";

export const LessonPayload = z.object({ lessonId: z.uuid() });

export async function loadLesson(lessonId: string): Promise<LessonRow> {
  const row = await getLesson(lessonId);
  if (!row) throw new AbortTaskRunError(`Lesson ${lessonId} not found`);
  return row;
}

/** The lesson row once write-script has stored the script. */
export async function loadScript(lessonId: string): Promise<{ row: LessonRow; lesson: Lesson }> {
  const row = await loadLesson(lessonId);
  if (!row.script) throw new AbortTaskRunError(`Lesson ${lessonId} has no script yet`);
  return { row, lesson: row.script };
}
