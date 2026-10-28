// POST /api/lessons: one to four page photos, in page order, become a lesson. The browser has already
// turned each photo into a JPEG of at most 1600 px, so anything else is refused.

import { tasks } from "@trigger.dev/sdk";
import { Language, MAX_PAGES } from "@/lib/lesson/schema";
import { StyleChoice } from "@/lib/lesson/styles";
import { hashIp } from "@/lib/lessons/ip";
import { checkRateLimit } from "@/lib/lessons/rate-limit";
import { createLesson, updateLesson } from "@/lib/lessons/repo";
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
    return fail(400, "The form couldn't be read. Reload the page and try again.");
  }

  const photos = form.getAll("photos").filter((value): value is File => value instanceof File);
  if (photos.length < 1 || photos.length > MAX_PAGES) return fail(400, "Send one to four page photos.");
  if (photos.reduce((sum, photo) => sum + photo.size, 0) > MAX_TOTAL_BYTES) {
    return fail(400, "The photos are too large. Send fewer pages at once.");
  }
  const pages = await Promise.all(photos.map(async (photo) => new Uint8Array(await photo.arrayBuffer())));
  if (photos.some((photo, i) => photo.type !== "image/jpeg" || !isJpeg(pages[i]!))) {
    return fail(400, "This photo format isn't supported. Take the photo with the phone's camera.");
  }

  const language = Language.safeParse(form.get("language"));
  if (!language.success) return fail(400, "Choose French or Pidgin.");
  const style = StyleChoice.safeParse(form.get("style"));
  if (!style.success) return fail(400, "This image style doesn't exist.");

  const ipHash = hashIp(request);
  const limited = await checkRateLimit(ipHash);
  if (limited) return fail(429, limited);

  const lesson = await createLesson({ language: language.data, ipHash, pageCount: pages.length, style: style.data });
  try {
    await Promise.all(pages.map((bytes, i) => uploadFile(lessonPaths.page(lesson.id, i + 1), bytes, "image/jpeg")));
    const run = await tasks.trigger<typeof generateLesson>("generate-lesson", { lessonId: lesson.id }, { idempotencyKey: lesson.id });
    await updateLesson(lesson.id, { triggerRunId: run.id });
  } catch (error) {
    console.error(`Lesson ${lesson.id} could not start`, error);
    const message = "The lesson couldn't start. Try again in a few minutes.";
    await updateLesson(lesson.id, { status: "failed", error: message }).catch(() => {});
    return fail(500, message);
  }
  return Response.json({ id: lesson.id }, { status: 201 });
}
