// GET /api/lessons/:id: what the lesson page polls every 2 s while the lesson is being made.

import { getLesson } from "@/lib/lessons/repo";
import type { LessonView } from "@/lib/lessons/view";
import { publicUrl } from "@/lib/supabase/storage";

export async function GET(_request: Request, ctx: RouteContext<"/api/lessons/[id]">) {
  const { id } = await ctx.params;
  const lesson = await getLesson(id);
  if (!lesson) return Response.json({ error: "This lesson doesn't exist." }, { status: 404 });

  const lastWord = lesson.words?.at(-1);
  return Response.json({
    status: lesson.status,
    language: lesson.language,
    createdAt: lesson.createdAt,
    pageCount: lesson.pageCount,
    error: lesson.error,
    title: lesson.script?.title[lesson.language] ?? null,
    // The style actually used once Muse Spark has written the script, the teacher's choice before.
    style: lesson.script?.style ?? lesson.style,
    sceneCount: lesson.script?.scenes.length ?? null,
    sceneImageUrls: lesson.scenePaths.filter((path) => path !== null).map(publicUrl),
    voice: lesson.words && lastWord ? { seconds: lastWord.end, words: lesson.words.length } : null,
    videoUrl: lesson.videoPath ? publicUrl(lesson.videoPath) : null,
    // Each finished step's duration and estimated cost, for the pipeline graph.
    metrics: lesson.metrics,
  } satisfies LessonView);
}
