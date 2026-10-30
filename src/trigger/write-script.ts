// Step 1: Muse Spark reads the lesson's pages and writes the lesson: the teacher's photos, or for a
// lesson of a book, its pages cut out of the book's PDF.

import { AbortTaskRunError, logger, schemaTask } from "@trigger.dev/sdk";
import { bookLessonPdf } from "../lib/books/lesson-pages";
import { getBook } from "../lib/books/repo";
import { type LessonRow, recordMetrics, updateLesson } from "../lib/lessons/repo";
import { type LessonPages, writeLesson } from "../lib/meta/lesson";
import { warmVoice } from "../lib/modal/client";
import { downloadFile, lessonPaths, publicUrl } from "../lib/supabase/storage";
import { LessonPayload, loadLesson } from "./shared";

async function pagesOf(row: LessonRow): Promise<LessonPages> {
  if (!row.bookId || !row.bookLesson) {
    return { photoUrls: Array.from({ length: row.pageCount }, (_, i) => publicUrl(lessonPaths.page(row.id, i + 1))) };
  }
  const book = await getBook(row.bookId);
  if (!book || book.status !== "ready") throw new AbortTaskRunError(`Book ${row.bookId} of lesson ${row.id} is not ready`);
  const { bytes, pageCount } = await bookLessonPdf(book, row.bookLesson, downloadFile);
  return { pdf: bytes, pageCount };
}

export const writeScript = schemaTask({
  id: "write-script",
  schema: LessonPayload,
  // Room for two answers from Muse Spark, when the first turns the pages down.
  maxDuration: 300,
  // A book lesson's slices (up to two of 30 pages) are loaded to cut its pages.
  machine: "small-1x",
  run: async ({ lessonId }) => {
    // The voice's cold start (about 30 s) overlaps the script writing instead of delaying the narration.
    await warmVoice().catch((error: unknown) => logger.warn("Could not warm the voice", { error: String(error) }));

    const row = await loadLesson(lessonId);
    const written = await writeLesson(await pagesOf(row), row.style, row.language, row.targetSeconds ?? undefined, row.quizQuestions ?? undefined);
    const { seconds, costUsd } = written;
    await recordMetrics(lessonId, "write-script", { seconds, costUsd });
    if (!written.isTextbookPage) {
      logger.info("Not a textbook page", { seconds, costUsd });
      return { isTextbookPage: false };
    }
    const { lesson } = written;
    await updateLesson(lessonId, { script: lesson });
    logger.info("Lesson written", { language: row.language, style: lesson.style, scenes: lesson.scenes.length, seconds, costUsd });
    return { isTextbookPage: lesson.page.isTextbookPage };
  },
});
