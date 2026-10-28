// GET /api/lessons/:id: what the lesson page polls every 2 s while the lesson is being made.

import { getLesson } from "@/lib/lessons/repo";
import { publicUrl } from "@/lib/supabase/storage";

export async function GET(_request: Request, ctx: RouteContext<"/api/lessons/[id]">) {
  const { id } = await ctx.params;
  const lesson = await getLesson(id);
  if (!lesson) return Response.json({ error: "Cette leçon n'existe pas." }, { status: 404 });

  return Response.json({
    status: lesson.status,
    error: lesson.error,
    title: lesson.script?.title[lesson.language] ?? null,
    // The style actually used once Muse Spark has written the script, the teacher's choice before.
    style: lesson.script?.style ?? lesson.style,
    sceneCount: lesson.script?.scenes.length ?? null,
    sceneImageUrls: lesson.scenePaths.filter((path) => path !== null).map(publicUrl),
    videoUrl: lesson.videoPath ? publicUrl(lesson.videoPath) : null,
  });
}
