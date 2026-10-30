// POST /api/books/:id/lessons/:n/summary { language }: a short text summary of the lesson in that language,
// written by Muse Spark from the lesson's pages. Each one is saved as a JSON file next to the book, so it is
// written once per lesson and language and read back on every later click.

import { z } from "zod";
import { bookLessonPdf } from "@/lib/books/lesson-pages";
import { getBook } from "@/lib/books/repo";
import { Language } from "@/lib/lesson/schema";
import { LessonSummary, summarizeLesson } from "@/lib/meta/summary";
import { bookPaths, downloadFile, uploadFile } from "@/lib/supabase/storage";

// Muse Spark reads up to 20 pages: room for one answer.
export const maxDuration = 120;

const Body = z.object({ language: Language });

const fail = (status: number, error: string) => Response.json({ error }, { status });

async function saved(path: string): Promise<LessonSummary | null> {
  try {
    return LessonSummary.parse(JSON.parse(new TextDecoder().decode(await downloadFile(path))));
  } catch {
    // None yet (or unreadable): it is written again.
    return null;
  }
}

export async function POST(request: Request, ctx: RouteContext<"/api/books/[id]/lessons/[n]/summary">) {
  const { id, n: raw } = await ctx.params;
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(400, "Choose one of the eight languages.");
  const { language } = body.data;
  const n = Number(raw);
  const book = await getBook(id);
  if (!book) return fail(404, "This book doesn't exist.");
  if (book.status !== "ready") return fail(409, "A lesson can be summarized once the book has been read.");
  if (!Number.isInteger(n) || !book.lessons[n - 1]) return fail(404, "This book has no such lesson.");

  const path = bookPaths.summary(id, n, language);
  const existing = await saved(path);
  if (existing) return Response.json({ language, ...existing });

  try {
    const { bytes, pageCount } = await bookLessonPdf(book, n, downloadFile);
    const { summary } = await summarizeLesson({ pdf: bytes, pageCount }, language);
    await uploadFile(path, new TextEncoder().encode(JSON.stringify(summary)), "application/json");
    return Response.json({ language, ...summary });
  } catch (error) {
    console.error("Lesson summary failed", error);
    return fail(502, "The summary couldn't be written. Try again in a minute.");
  }
}
