// POST /api/books/:id/read: the PDF has been uploaded; Muse Spark starts reading the book.

import { tasks } from "@trigger.dev/sdk";
import { getBook, updateBook } from "@/lib/books/repo";
import { bookPaths, fileSize } from "@/lib/supabase/storage";
import type { readBook } from "@/trigger/read-book";

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(_request: Request, ctx: RouteContext<"/api/books/[id]/read">) {
  const { id } = await ctx.params;
  const book = await getBook(id);
  if (!book) return fail(404, "This book doesn't exist.");
  // A second click, or a book already read, does nothing.
  if (book.status !== "uploading") return Response.json({ id }, { status: 200 });
  if (!(await fileSize(bookPaths.pdf(id)))) return fail(409, "The PDF hasn't arrived. Upload it again.");

  try {
    await updateBook(id, { status: "reading" });
    const run = await tasks.trigger<typeof readBook>("read-book", { bookId: id }, { idempotencyKey: `read-${id}` });
    await updateBook(id, { triggerRunId: run.id });
  } catch (error) {
    console.error(`Book ${id} could not start`, error);
    const message = "Reading the book couldn't start. Try again in a few minutes.";
    await updateBook(id, { status: "failed", error: message }).catch(() => {});
    return fail(500, message);
  }
  return Response.json({ id }, { status: 202 });
}
