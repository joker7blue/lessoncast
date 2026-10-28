// GET /api/lessons/:id: what the lesson page polls every 2 s while the lesson is being made.

import { getLesson } from "@/lib/lessons/repo";
import { isStalled, STALLED_MESSAGE } from "@/lib/lessons/stalled";
import type { LessonView } from "@/lib/lessons/view";
import { publicUrl } from "@/lib/supabase/storage";

export async function GET(_request: Request, ctx: RouteContext<"/api/lessons/[id]">) {
  const { id } = await ctx.params;
  const lesson = await getLesson(id);
  if (!lesson) return Response.json({ error: "This lesson doesn't exist." }, { status: 404 });

  const lastWord = lesson.words?.at(-1);
  // A lesson whose run died reads as failed, so the page stops waiting; if it finishes after all, it reads as done.
  const stalled = isStalled(lesson.status, lesson.createdAt, Date.now());
  return Response.json({
    status: stalled ? "failed" : lesson.status,
    language: lesson.language,
    createdAt: lesson.createdAt,
    pageCount: lesson.pageCount,
    error: stalled ? STALLED_MESSAGE : lesson.error,
    title: lesson.script?.title[lesson.language] ?? null,
    // The style actually used once Muse Spark has written the script, the teacher's choice before.
    style: lesson.script?.style ?? lesson.style,
    sceneCount: lesson.script?.scenes.length ?? null,
    // Slot-aligned: scenes finish out of order, and each must appear in its own place.
    sceneImageUrls: lesson.scenePaths.map((path) => (path ? publicUrl(path) : null)),
    voice: lesson.words && lastWord ? { seconds: lastWord.end, words: lesson.words.length } : null,
    videoUrl: lesson.videoPath ? publicUrl(lesson.videoPath) : null,
    // Each finished step's duration and estimated cost, for the pipeline graph.
    metrics: lesson.metrics,
  } satisfies LessonView);
}
