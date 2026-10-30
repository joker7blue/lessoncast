// GET /api/books/:id/lessons/:n/pages: the lesson's own pages, cut out of the book as a small PDF the
// browser shows in the book page, so the teacher sees what the lesson holds before filming it.

import { bookLessonPdf } from "@/lib/books/lesson-pages";
import { getBook } from "@/lib/books/repo";
import { downloadFile } from "@/lib/supabase/storage";

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function GET(_request: Request, ctx: RouteContext<"/api/books/[id]/lessons/[n]/pages">) {
  const { id, n: raw } = await ctx.params;
  const n = Number(raw);
  const book = await getBook(id);
  if (!book) return fail(404, "This book doesn't exist.");
  if (book.status !== "ready") return fail(409, "The book's lessons can be seen once it has been read.");
  const lesson = Number.isInteger(n) ? book.lessons[n - 1] : undefined;
  if (!lesson) return fail(404, "This book has no such lesson.");

  const { bytes, pageCount } = await bookLessonPdf(book, n, downloadFile);
  const last = lesson.firstPage + pageCount - 1;
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="lesson-${n}-pages-${lesson.firstPage}-${last}.pdf"`,
      // A lesson's pages never change once the book is read.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
