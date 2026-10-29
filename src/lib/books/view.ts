// What GET /api/books/:id returns: everything the book page shows, while the book is read and after.

import type { LessonStatus } from "../lessons/repo";
import type { Language } from "../lesson/schema";
import type { StyleChoice } from "../lesson/styles";
import type { BookRow, BookStatus, BookVideo } from "./repo";
import type { BookLesson } from "./schema";

export type BookView = {
  status: BookStatus;
  error: string | null;
  createdAt: string;
  fileName: string;
  pageCount: number | null;
  title: string | null;
  subject: string | null;
  level: string | null;
  /** While reading: how many of the book's slices Muse Spark has read. */
  progress: { read: number; slices: number } | null;
  /** Lesson n at index n - 1, with the videos already made from it, newest first. */
  lessons: (BookLesson & { n: number; videos: { id: string; status: LessonStatus; language: Language; style: StyleChoice }[] })[];
};

// A book is read in a few minutes; past this, its run died without saying so.
const READING_LIMIT_MS = 20 * 60_000;
export const BOOK_STALLED_MESSAGE = "Reading this book stopped before the end. Upload it again.";

export function bookView(book: BookRow, videos: BookVideo[], now: number): BookView {
  const stalled = (book.status === "reading" || book.status === "uploading") && now - Date.parse(book.createdAt) > READING_LIMIT_MS;
  return {
    status: stalled ? "failed" : book.status,
    error: stalled ? BOOK_STALLED_MESSAGE : book.error,
    createdAt: book.createdAt,
    fileName: book.fileName,
    pageCount: book.pageCount,
    title: book.title,
    subject: book.subject,
    level: book.level,
    progress: book.status === "reading" && book.slices.length > 0 ? { read: book.slicesRead, slices: book.slices.length } : null,
    lessons: book.lessons.map((lesson, i) => ({
      ...lesson,
      n: i + 1,
      videos: videos.filter((v) => v.bookLesson === i + 1).map(({ id, status, language, style }) => ({ id, status, language, style })),
    })),
  };
}
