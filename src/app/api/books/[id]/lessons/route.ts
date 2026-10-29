// POST /api/books/:id/lessons: the teacher makes the video of one lesson of the book, in the language
// and style they pick. It runs the same pipeline as photographed pages.

import { tasks } from "@trigger.dev/sdk";
import { z } from "zod";
import { MAX_LESSON_PAGES } from "@/lib/books/pdf";
import { getBook } from "@/lib/books/repo";
import { defaultLength, VideoLength } from "@/lib/lesson/length";
import { Language } from "@/lib/lesson/schema";
import { StyleChoice } from "@/lib/lesson/styles";
import { hashIp } from "@/lib/lessons/ip";
import { checkRateLimit } from "@/lib/lessons/rate-limit";
import { createLesson, updateLesson } from "@/lib/lessons/repo";
import { quizChoice } from "@/lib/lessons/video-choice";
import type { generateLesson } from "@/trigger/generate-lesson";

const Body = z.object({ lesson: z.int().positive(), language: Language, style: StyleChoice, length: VideoLength.optional(), quiz: z.unknown().optional() });

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request, ctx: RouteContext<"/api/books/[id]/lessons">) {
  const { id } = await ctx.params;
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(400, "Choose a lesson, a language and a picture style.");
  const book = await getBook(id);
  if (!book) return fail(404, "This book doesn't exist.");
  if (book.status !== "ready") return fail(409, "The book hasn't been read yet.");
  const lesson = book.lessons[body.data.lesson - 1];
  if (!lesson) return fail(400, "This lesson isn't in the book.");

  const ipHash = hashIp(request);
  const limited = await checkRateLimit(ipHash);
  if (limited) return fail(429, limited);

  const pageCount = Math.min(lesson.lastPage - lesson.firstPage + 1, MAX_LESSON_PAGES);
  const length = body.data.length ?? defaultLength(pageCount);
  const quiz = quizChoice(body.data.quiz, length, body.data.language);
  if (!quiz.ok) return fail(400, quiz.error);
  const created = await createLesson({
    language: body.data.language,
    style: body.data.style,
    ipHash,
    pageCount,
    book: { id, lesson: body.data.lesson },
    targetSeconds: length,
    quizQuestions: quiz.quizQuestions,
  });
  try {
    const run = await tasks.trigger<typeof generateLesson>("generate-lesson", { lessonId: created.id }, { idempotencyKey: created.id });
    await updateLesson(created.id, { triggerRunId: run.id });
  } catch (error) {
    console.error(`Lesson ${created.id} of book ${id} could not start`, error);
    const message = "The video couldn't start. Try again in a few minutes.";
    await updateLesson(created.id, { status: "failed", error: message }).catch(() => {});
    return fail(500, message);
  }
  return Response.json({ id: created.id }, { status: 201 });
}
