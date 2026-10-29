// POST /api/books: a teacher is about to upload a textbook or ebook PDF. The PDF never goes through
// this server (Vercel refuses bodies over 4.5 MB): the answer is a signed URL the browser PUTs it to,
// and the key that lets this device edit the book later. POST /api/books/:id/read then starts the reading.

import { z } from "zod";
import { newEditKey } from "@/lib/books/edit-key";
import { createBook } from "@/lib/books/repo";
import { hashIp } from "@/lib/lessons/ip";
import { checkRateLimit } from "@/lib/lessons/rate-limit";
import { bookPaths, signedUploadUrl } from "@/lib/supabase/storage";

// The Supabase file limit, and the most Muse Spark takes inline.
export const MAX_BOOK_BYTES = 50 * 1024 * 1024;

const Body = z.object({ fileName: z.string().min(1).max(200), bytes: z.int().positive() });

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(400, "The request couldn't be read. Reload the page and try again.");
  const { fileName, bytes } = body.data;
  if (!/\.pdf$/i.test(fileName)) return fail(400, "Choose a PDF file.");
  if (bytes > MAX_BOOK_BYTES) return fail(400, "This PDF is over 50 MB. Upload one part of the book.");

  const ipHash = hashIp(request);
  const limited = await checkRateLimit(ipHash);
  if (limited) return fail(429, limited);

  const editKey = newEditKey();
  const book = await createBook({ fileName, fileBytes: bytes, ipHash, editKeyHash: editKey.hash });
  return Response.json({ id: book.id, uploadUrl: await signedUploadUrl(bookPaths.pdf(book.id)), editKey: editKey.key }, { status: 201 });
}
