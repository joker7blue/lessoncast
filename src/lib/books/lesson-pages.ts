// The pages of one lesson of a book, cut into a small PDF for Muse Spark: only the stored slices that
// hold them are downloaded, never the whole book.

import { cutPages, MAX_LESSON_PAGES } from "./pdf";
import type { StoredSlice } from "./repo";
import type { BookLesson } from "./schema";

/** Lesson `n` (from 1) of the book, at most MAX_LESSON_PAGES pages from its first. */
export async function bookLessonPdf(
  book: { slices: StoredSlice[]; lessons: BookLesson[] },
  n: number,
  download: (path: string) => Promise<Uint8Array>,
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  const lesson = book.lessons[n - 1];
  if (!lesson) throw new RangeError(`The book has no lesson ${n}`);
  const last = Math.min(lesson.lastPage, lesson.firstPage + MAX_LESSON_PAGES - 1);
  const needed = book.slices.filter((s) => s.lastPage >= lesson.firstPage && s.firstPage <= last);
  const slices = await Promise.all(needed.map(async (s) => ({ ...s, bytes: await download(s.path) })));
  return { bytes: await cutPages(slices, lesson.firstPage, last), pageCount: last - lesson.firstPage + 1 };
}
