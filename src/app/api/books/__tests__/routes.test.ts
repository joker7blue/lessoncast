import { beforeEach, describe, expect, test, vi } from "vitest";
import type { BookRow } from "@/lib/books/repo";

const books = vi.hoisted(() => ({ createBook: vi.fn(), getBook: vi.fn(), updateBook: vi.fn(), videosOfBook: vi.fn() }));
const lessons = vi.hoisted(() => ({ createLesson: vi.fn(), updateLesson: vi.fn() }));
const storage = vi.hoisted(() => ({ signedUploadUrl: vi.fn(), fileSize: vi.fn() }));
const trigger = vi.hoisted(() => ({ tasks: { trigger: vi.fn() } }));
const limits = vi.hoisted(() => ({ checkRateLimit: vi.fn() }));
vi.mock("@/lib/books/repo", () => books);
vi.mock("@/lib/lessons/repo", () => lessons);
vi.mock("@/lib/supabase/storage", async (importOriginal) => ({ ...(await importOriginal<object>()), ...storage }));
vi.mock("@trigger.dev/sdk", () => trigger);
vi.mock("@/lib/lessons/rate-limit", () => limits);

import { POST as createBookRoute } from "../route";
import { POST as readRoute } from "../[id]/read/route";
import { POST as lessonRoute } from "../[id]/lessons/route";

const ID = "7d1f2c3a-5b6e-4f70-8a91-b2c3d4e5f607";
const ctx = { params: Promise.resolve({ id: ID }) };
const json = (body: unknown) => ({ method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

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
    lessons: [
      { title: "Le cœur", firstPage: 3, lastPage: 6, summary: "Le cœur pompe le sang." },
      { title: "Les volcans", firstPage: 40, lastPage: 70, summary: "Un très long chapitre." },
    ],
    slices: [],
    slicesRead: 0,
    metrics: {},
    ipHash: null,
    triggerRunId: null,
    ...patch,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  limits.checkRateLimit.mockResolvedValue(null);
  books.createBook.mockResolvedValue(book({ status: "uploading" }));
  storage.signedUploadUrl.mockResolvedValue("https://storage.test/upload/sign/books/x/book.pdf?token=t");
  trigger.tasks.trigger.mockResolvedValue({ id: "run_123" });
  lessons.createLesson.mockResolvedValue({ id: "lesson-1" });
  lessons.updateLesson.mockResolvedValue(undefined);
  books.updateBook.mockResolvedValue(undefined);
});

describe("POST /api/books", () => {
  const post = (body: unknown) => createBookRoute(new Request("http://localhost/api/books", json(body)));

  test("creates the book and answers with a signed URL to upload the PDF to", async () => {
    const res = await post({ fileName: "Sciences CM1.pdf", bytes: 12_000_000 });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: ID, uploadUrl: "https://storage.test/upload/sign/books/x/book.pdf?token=t" });
    expect(books.createBook).toHaveBeenCalledWith({ fileName: "Sciences CM1.pdf", fileBytes: 12_000_000, ipHash: null });
    expect(storage.signedUploadUrl).toHaveBeenCalledWith(`books/${ID}/book.pdf`);
  });

  test("refuses a file that isn't a PDF, or one over 50 MB", async () => {
    for (const body of [{ fileName: "page.jpg", bytes: 1000 }, { fileName: "book.pdf", bytes: 51 * 1024 * 1024 }, { fileName: "", bytes: 1 }]) {
      const res = await post(body);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/\.$/);
    }
    expect(books.createBook).not.toHaveBeenCalled();
  });

  test("answers 429 past the rate limit", async () => {
    limits.checkRateLimit.mockResolvedValue("LessonCast has made all its lessons for today. Try again tomorrow.");
    expect((await post({ fileName: "book.pdf", bytes: 1000 })).status).toBe(429);
    expect(books.createBook).not.toHaveBeenCalled();
  });
});

describe("POST /api/books/:id/read", () => {
  const post = () => readRoute(new Request(`http://localhost/api/books/${ID}/read`, { method: "POST" }), ctx);

  test("starts reading an uploaded book", async () => {
    books.getBook.mockResolvedValue(book({ status: "uploading" }));
    storage.fileSize.mockResolvedValue(12_000_000);
    const res = await post();
    expect(res.status).toBe(202);
    expect(books.updateBook).toHaveBeenNthCalledWith(1, ID, { status: "reading" });
    expect(trigger.tasks.trigger).toHaveBeenCalledWith("read-book", { bookId: ID }, { idempotencyKey: `read-${ID}` });
    expect(books.updateBook).toHaveBeenLastCalledWith(ID, { triggerRunId: "run_123" });
  });

  test("answers 409 when the PDF never arrived", async () => {
    books.getBook.mockResolvedValue(book({ status: "uploading" }));
    storage.fileSize.mockResolvedValue(null);
    expect((await post()).status).toBe(409);
    expect(trigger.tasks.trigger).not.toHaveBeenCalled();
  });

  test("does nothing for a book already being read, and 404 for an unknown one", async () => {
    books.getBook.mockResolvedValue(book({ status: "reading" }));
    expect((await post()).status).toBe(200);
    books.getBook.mockResolvedValue(null);
    expect((await post()).status).toBe(404);
    expect(trigger.tasks.trigger).not.toHaveBeenCalled();
  });
});

describe("POST /api/books/:id/lessons", () => {
  const post = (body: unknown) => lessonRoute(new Request(`http://localhost/api/books/${ID}/lessons`, json(body)), ctx);

  test("makes the video of one lesson, linked to the book", async () => {
    books.getBook.mockResolvedValue(book());
    const res = await post({ lesson: 1, language: "pcm", style: "comic" });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "lesson-1" });
    expect(lessons.createLesson).toHaveBeenCalledWith({ language: "pcm", style: "comic", ipHash: null, pageCount: 4, book: { id: ID, lesson: 1 } });
    expect(trigger.tasks.trigger).toHaveBeenCalledWith("generate-lesson", { lessonId: "lesson-1" }, { idempotencyKey: "lesson-1" });
  });

  test("counts at most 20 pages for a long lesson", async () => {
    books.getBook.mockResolvedValue(book());
    await post({ lesson: 2, language: "fr", style: "auto" });
    expect(lessons.createLesson).toHaveBeenCalledWith(expect.objectContaining({ pageCount: 20 }));
  });

  test("refuses a lesson the book doesn't have, a book not read yet, or a bad choice", async () => {
    books.getBook.mockResolvedValue(book());
    expect((await post({ lesson: 3, language: "fr", style: "auto" })).status).toBe(400);
    expect((await post({ lesson: 1, language: "en", style: "auto" })).status).toBe(400);
    books.getBook.mockResolvedValue(book({ status: "reading" }));
    expect((await post({ lesson: 1, language: "fr", style: "auto" })).status).toBe(409);
    expect(lessons.createLesson).not.toHaveBeenCalled();
  });

  test("marks the lesson failed when the pipeline can't start", async () => {
    books.getBook.mockResolvedValue(book());
    trigger.tasks.trigger.mockRejectedValue(new Error("Trigger.dev down"));
    const res = await post({ lesson: 1, language: "fr", style: "auto" });
    expect(res.status).toBe(500);
    expect(lessons.updateLesson).toHaveBeenCalledWith("lesson-1", { status: "failed", error: expect.stringMatching(/\.$/) });
  });
});
