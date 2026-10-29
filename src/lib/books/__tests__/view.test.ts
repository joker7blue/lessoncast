import { describe, expect, test } from "vitest";
import type { BookRow } from "../repo";
import { BOOK_STALLED_MESSAGE, bookView } from "../view";

const NOW = Date.parse("2026-10-29T08:00:00Z");
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

function book(patch: Partial<BookRow> = {}): BookRow {
  return {
    id: "b",
    createdAt: minutesAgo(2),
    status: "ready",
    error: null,
    fileName: "book.pdf",
    fileBytes: 1000,
    pageCount: 60,
    title: "Sciences CM1",
    subject: "Sciences",
    level: "CM1",
    language: "fr",
    lessons: [
      { title: "A", firstPage: 3, lastPage: 6, summary: "A." },
      { title: "B", firstPage: 7, lastPage: 9, summary: "B." },
    ],
    slices: [
      { firstPage: 1, lastPage: 30, path: "p1" },
      { firstPage: 31, lastPage: 60, path: "p2" },
    ],
    slicesRead: 1,
    metrics: {},
    ipHash: null,
    triggerRunId: null,
    editKeyHash: null,
    ...patch,
  };
}

describe("bookView", () => {
  test("numbers the lessons and lists each one's videos", () => {
    const videos = [
      { id: "v2", bookLesson: 2, status: "done" as const, language: "fr" as const, style: "auto" as const, createdAt: minutesAgo(1) },
      { id: "v1", bookLesson: 2, status: "drawing" as const, language: "pcm" as const, style: "comic" as const, createdAt: minutesAgo(1) },
    ];
    const view = bookView(book(), videos, NOW);
    expect(view.lessons.map((l) => [l.n, l.title, l.videos.map((v) => v.id)])).toEqual([
      [1, "A", []],
      [2, "B", ["v2", "v1"]],
    ]);
    expect(view.progress).toBeNull();
  });

  test("shows the progress while reading", () => {
    expect(bookView(book({ status: "reading", lessons: [] }), [], NOW).progress).toEqual({ read: 1, slices: 2 });
  });

  test("reads as failed when the reading stopped long ago", () => {
    const view = bookView(book({ status: "reading", createdAt: minutesAgo(25) }), [], NOW);
    expect(view).toMatchObject({ status: "failed", error: BOOK_STALLED_MESSAGE });
  });
});
