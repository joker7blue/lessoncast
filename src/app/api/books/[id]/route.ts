// GET /api/books/:id: what the book page polls while Muse Spark reads the book, then its lessons and the
// videos made from them. PATCH: the device that uploaded the book renames it, its subject, its level or
// its lessons; it proves it with the key it got at upload.

import { z } from "zod";
import { EDIT_KEY_HEADER, editKeyMatches } from "@/lib/books/edit-key";
import { getBook, updateBook, videosOfBook } from "@/lib/books/repo";
import { bookView } from "@/lib/books/view";

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function GET(_request: Request, ctx: RouteContext<"/api/books/[id]">) {
  const { id } = await ctx.params;
  const book = await getBook(id);
  if (!book) return fail(404, "This book doesn't exist.");
  return Response.json(bookView(book, book.status === "ready" ? await videosOfBook(id) : [], Date.now()));
}

const Text = (max: number) => z.string().trim().min(1).max(max);
const Patch = z.object({
  title: Text(160).optional(),
  subject: Text(80).nullable().optional(),
  level: Text(40).nullable().optional(),
  lessonTitles: z.array(z.object({ n: z.int().positive(), title: Text(160) })).max(200).optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/books/[id]">) {
  const { id } = await ctx.params;
  const book = await getBook(id);
  if (!book) return fail(404, "This book doesn't exist.");
  if (!editKeyMatches(request.headers.get(EDIT_KEY_HEADER), book.editKeyHash)) {
    return fail(403, "This book can only be edited from the device that uploaded it.");
  }
  if (book.status !== "ready") return fail(409, "The book can be edited once it has been read.");
  const patch = Patch.safeParse(await request.json().catch(() => null));
  if (!patch.success) return fail(400, "A title is empty or too long.");

  const { title, subject, level, lessonTitles } = patch.data;
  const titles = new Map(lessonTitles?.map((l) => [l.n, l.title]));
  if ([...titles.keys()].some((n) => n > book.lessons.length)) return fail(400, "This lesson isn't in the book.");
  await updateBook(id, {
    ...(title !== undefined && { title }),
    ...(subject !== undefined && { subject }),
    ...(level !== undefined && { level }),
    ...(titles.size > 0 && { lessons: book.lessons.map((lesson, i) => ({ ...lesson, title: titles.get(i + 1) ?? lesson.title })) }),
  });
  const saved = (await getBook(id))!;
  return Response.json(bookView(saved, await videosOfBook(id), Date.now()));
}
