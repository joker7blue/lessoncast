// GET /api/books/:id: what the book page polls while Muse Spark reads the book, then its lessons and the
// videos made from them.

import { getBook, videosOfBook } from "@/lib/books/repo";
import { bookView } from "@/lib/books/view";

export async function GET(_request: Request, ctx: RouteContext<"/api/books/[id]">) {
  const { id } = await ctx.params;
  const book = await getBook(id);
  if (!book) return Response.json({ error: "This book doesn't exist." }, { status: 404 });
  return Response.json(bookView(book, book.status === "ready" ? await videosOfBook(id) : [], Date.now()));
}
