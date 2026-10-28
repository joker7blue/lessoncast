// POST /api/lessons: one to four page photos, in page order, become a lesson. The browser has already
// turned each photo into a JPEG of at most 1600 px, so anything else is refused.

import { tasks } from "@trigger.dev/sdk";
import { Language } from "@/lib/lesson/schema";
import { StyleChoice } from "@/lib/lesson/styles";
import { hashIp } from "@/lib/lessons/ip";
import { createLesson, updateLesson } from "@/lib/lessons/repo";
import { MAX_PAGES } from "@/lib/meta/lesson";
import { lessonPaths, uploadFile } from "@/lib/supabase/storage";
import type { generateLesson } from "@/trigger/generate-lesson";

// Vercel refuses request bodies over 4.5 MB.
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;

const fail = (status: number, error: string) => Response.json({ error }, { status });

const isJpeg = (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "Le formulaire envoyé est illisible. Rechargez la page et réessayez.");
  }

  const photos = form.getAll("photos").filter((value): value is File => value instanceof File);
  if (photos.length < 1 || photos.length > MAX_PAGES) return fail(400, "Envoyez entre une et quatre photos de pages.");
  if (photos.reduce((sum, photo) => sum + photo.size, 0) > MAX_TOTAL_BYTES) {
    return fail(400, "Les photos sont trop lourdes. Envoyez moins de pages à la fois.");
  }
  const pages = await Promise.all(photos.map(async (photo) => new Uint8Array(await photo.arrayBuffer())));
  if (photos.some((photo, i) => photo.type !== "image/jpeg" || !isJpeg(pages[i]!))) {
    return fail(400, "Ce format de photo n'est pas pris en charge. Prenez la photo avec l'appareil photo du téléphone.");
  }

  const language = Language.safeParse(form.get("language"));
  if (!language.success) return fail(400, "Choisissez le français ou le pidgin.");
  const style = StyleChoice.safeParse(form.get("style"));
  if (!style.success) return fail(400, "Ce style d'image n'existe pas.");

  const lesson = await createLesson({ language: language.data, ipHash: hashIp(request), pageCount: pages.length, style: style.data });
  try {
    await Promise.all(pages.map((bytes, i) => uploadFile(lessonPaths.page(lesson.id, i + 1), bytes, "image/jpeg")));
    const run = await tasks.trigger<typeof generateLesson>("generate-lesson", { lessonId: lesson.id }, { idempotencyKey: lesson.id });
    await updateLesson(lesson.id, { triggerRunId: run.id });
  } catch (error) {
    console.error(`Lesson ${lesson.id} could not start`, error);
    const message = "La leçon n'a pas pu démarrer. Réessayez dans quelques minutes.";
    await updateLesson(lesson.id, { status: "failed", error: message }).catch(() => {});
    return fail(500, message);
  }
  return Response.json({ id: lesson.id }, { status: 201 });
}
