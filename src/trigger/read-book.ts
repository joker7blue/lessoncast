// A book: the PDF is cut into slices of 30 pages, Muse Spark reads them 4 at a time and lists their
// lessons, and the lessons are joined into the book's list. No video is made here: the teacher makes a
// lesson's video from the book page, whenever they want.

import { AbortTaskRunError, logger, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { joinSlices } from "../lib/books/lessons";
import { slicePdf, UnreadablePdfError } from "../lib/books/pdf";
import { readAllSlices } from "../lib/books/read";
import { countSliceRead, getBook, updateBook } from "../lib/books/repo";
import { readSlice } from "../lib/meta/book";
import { bookPaths, downloadFile, uploadFile } from "../lib/supabase/storage";

export const BookPayload = z.object({ bookId: z.uuid() });

const FAILED = "Reading the book failed. Try again in a few minutes.";

export const readBook = schemaTask({
  id: "read-book",
  schema: BookPayload,
  // The whole PDF (up to 50 MB) is in memory while it is cut.
  machine: "small-2x",
  // 400 pages are 14 slices: four rounds of about a minute, with room for retried slices.
  maxDuration: 900,
  // A second full reading would pay for every slice again: a slice already retries on its own.
  retry: { maxAttempts: 1 },
  run: async ({ bookId }) => {
    const book = await getBook(bookId);
    if (!book) throw new AbortTaskRunError(`Book ${bookId} not found`);
    if (book.status !== "reading") return { outcome: "skipped" as const };
    const start = performance.now();
    try {
      let cut: Awaited<ReturnType<typeof slicePdf>>;
      try {
        cut = await slicePdf(await downloadFile(bookPaths.pdf(bookId)));
      } catch (error) {
        if (!(error instanceof UnreadablePdfError)) throw error;
        await updateBook(bookId, { status: "failed", error: error.message });
        return { outcome: "failed" as const };
      }
      const { pageCount, slices } = cut;
      const stored = await Promise.all(
        slices.map(async ({ firstPage, lastPage, bytes }) => {
          const path = bookPaths.slice(bookId, firstPage, lastPage);
          await uploadFile(path, bytes, "application/pdf");
          return { firstPage, lastPage, path };
        }),
      );
      await updateBook(bookId, { pageCount, slices: stored });

      const { answers, costUsd } = await readAllSlices(slices, pageCount, {
        readSlice,
        onRead: () => countSliceRead(bookId),
        warn: (message) => logger.warn(message),
      });
      const { isTextbook, book: info, language, lessons } = joinSlices(answers);
      const seconds = (performance.now() - start) / 1000;
      const metrics = { "read-book": { seconds, costUsd } };
      if (lessons.length === 0) {
        const error = isTextbook ? "No lessons were found in this PDF." : "This PDF doesn't look like a school textbook.";
        await updateBook(bookId, { status: "failed", error, metrics });
        return { outcome: "failed" as const };
      }
      await updateBook(bookId, {
        status: "ready",
        title: info?.title.trim() || book.fileName.replace(/\.pdf$/i, ""),
        subject: info?.subject.trim() || null,
        level: info?.level.trim() || null,
        language,
        lessons,
        metrics,
      });
      logger.info("Book read", { pageCount, slices: slices.length, lessons: lessons.length, seconds, costUsd });
      return { outcome: "ready" as const, lessons: lessons.length };
    } catch (error) {
      await updateBook(bookId, { status: "failed", error: FAILED }).catch(() => {});
      throw error;
    }
  },
});
