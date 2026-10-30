import { beforeEach, expect, test, vi } from "vitest";
import type { BookRow } from "@/lib/books/repo";

const books = vi.hoisted(() => ({ getBook: vi.fn() }));
const pages = vi.hoisted(() => ({ bookLessonPdf: vi.fn() }));
vi.mock("@/lib/books/repo", () => books);
vi.mock("@/lib/books/lesson-pages", () => pages);

import { GET as pagesRoute } from "../[id]/lessons/[n]/pages/route";

const ID = "7d1f2c3a-5b6e-4f70-8a91-b2c3d4e5f607";
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

function book(patch: Partial<BookRow> = {}): BookRow {
  return {
    id: ID,
    createdAt: new Date().toISOString(),
    status: "ready",
    error: null,
    fileName: "sciences-cm1.pdf",
    fileBytes: 12_000_000,
    pageCount: 120,
    title: "Sciences CM1",
    subject: "Sciences",
    level: "CM1",
    language: "fr",
    lessons: [{ title: "Le cœur", firstPage: 3, lastPage: 6, summary: "Le cœur pompe le sang." }],
    slices: [{ path: `books/${ID}/slices/1.pdf`, firstPage: 1, lastPage: 30 }],
    slicesRead: 1,
    metrics: {},
    ipHash: null,
    triggerRunId: null,
    editKeyHash: null,
    ...patch,
  } as BookRow;
}

const get = (n: string) => pagesRoute(new Request(`http://localhost/api/books/${ID}/lessons/${n}/pages`), { params: Promise.resolve({ id: ID, n }) });

beforeEach(() => {
  vi.resetAllMocks();
  pages.bookLessonPdf.mockResolvedValue({ bytes: PDF, pageCount: 4 });
});

test("serves a lesson's pages as a PDF the browser shows in the page", async () => {
  books.getBook.mockResolvedValue(book());
  const res = await get("1");
  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toBe("application/pdf");
  expect(res.headers.get("Content-Disposition")).toBe('inline; filename="lesson-1-pages-3-6.pdf"');
  expect(new Uint8Array(await res.arrayBuffer())).toEqual(PDF);
  expect(pages.bookLessonPdf).toHaveBeenCalledWith(expect.objectContaining({ id: ID }), 1, expect.any(Function));
});

test("answers 404 for a book or a lesson that isn't there", async () => {
  books.getBook.mockResolvedValue(null);
  expect((await get("1")).status).toBe(404);
  books.getBook.mockResolvedValue(book());
  expect((await get("2")).status).toBe(404);
  expect((await get("one")).status).toBe(404);
  expect(pages.bookLessonPdf).not.toHaveBeenCalled();
});

test("answers 409 while the book is still being read", async () => {
  books.getBook.mockResolvedValue(book({ status: "reading" }));
  expect((await get("1")).status).toBe(409);
});
