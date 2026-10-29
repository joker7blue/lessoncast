import { createHash } from "node:crypto";
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
import { PATCH as editRoute } from "../[id]/route";

const ID = "7d1f2c3a-5b6e-4f70-8a91-b2c3d4e5f607";
const KEY = "0b2f0c4e-8a1d-4b3e-9c55-6f1d2a7b8c90";
const KEY_HASH = createHash("sha256").update(KEY).digest("hex");
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
    language: "fr",
    lessons: [
      { title: "Le cœur", firstPage: 3, lastPage: 6, summary: "Le cœur pompe le sang." },
      { title: "Les volcans", firstPage: 40, lastPage: 70, summary: "Un très long chapitre." },
    ],
    slices: [],
    slicesRead: 0,
    metrics: {},
    ipHash: null,
    triggerRunId: null,
    editKeyHash: KEY_HASH,
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
    const body = await res.json();
    expect(body).toMatchObject({ id: ID, uploadUrl: "https://storage.test/upload/sign/books/x/book.pdf?token=t" });
    // The device keeps the key; the server only its hash.
    expect(books.createBook).toHaveBeenCalledWith({
      fileName: "Sciences CM1.pdf",
      fileBytes: 12_000_000,
      ipHash: null,
      editKeyHash: createHash("sha256").update(body.editKey).digest("hex"),
    });
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
    expect(lessons.createLesson).toHaveBeenCalledWith({
      language: "pcm",
      style: "comic",
      ipHash: null,
      pageCount: 4,
      book: { id: ID, lesson: 1 },
      targetSeconds: 180,
    });
    expect(trigger.tasks.trigger).toHaveBeenCalledWith("generate-lesson", { lessonId: "lesson-1" }, { idempotencyKey: "lesson-1" });
  });

  test("makes the video in the language and length the teacher picked", async () => {
    books.getBook.mockResolvedValue(book());
    await post({ lesson: 1, language: "hau", style: "auto", length: 30 });
    expect(lessons.createLesson).toHaveBeenCalledWith(expect.objectContaining({ language: "hau", targetSeconds: 30 }));
  });


  test("counts at most 20 pages for a long lesson", async () => {
    books.getBook.mockResolvedValue(book());
    await post({ lesson: 2, language: "fr", style: "auto" });
    expect(lessons.createLesson).toHaveBeenCalledWith(expect.objectContaining({ pageCount: 20 }));
  });

  test("refuses a lesson the book doesn't have, a book not read yet, or a bad choice", async () => {
    books.getBook.mockResolvedValue(book());
    expect((await post({ lesson: 3, language: "fr", style: "auto" })).status).toBe(400);
    expect((await post({ lesson: 1, language: "xx", style: "auto" })).status).toBe(400);
    expect((await post({ lesson: 1, language: "fr", style: "auto", length: 45 })).status).toBe(400);
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

describe("PATCH /api/books/:id", () => {
  const patch = (body: unknown, key: string | null = KEY) =>
    editRoute(
      new Request(`http://localhost/api/books/${ID}`, {
        method: "PATCH",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json", ...(key && { "x-edit-key": key }) },
      }),
      ctx,
    );

  test("renames the book and a lesson with the device's key", async () => {
    books.getBook.mockResolvedValue(book());
    books.videosOfBook.mockResolvedValue([]);
    const res = await patch({ title: "Sciences et technologie, CM1", subject: "Sciences", lessonTitles: [{ n: 2, title: "Les volcans" }] });
    expect(res.status).toBe(200);
    expect(books.updateBook).toHaveBeenCalledWith(ID, {
      title: "Sciences et technologie, CM1",
      subject: "Sciences",
      lessons: [expect.objectContaining({ title: "Le cœur" }), expect.objectContaining({ title: "Les volcans", firstPage: 40 })],
    });
  });

  test("refuses without the key, with another key, and for a book from before keys", async () => {
    books.getBook.mockResolvedValue(book());
    expect((await patch({ title: "X" }, null)).status).toBe(403);
    expect((await patch({ title: "X" }, "another-key")).status).toBe(403);
    books.getBook.mockResolvedValue(book({ editKeyHash: null }));
    expect((await patch({ title: "X" })).status).toBe(403);
    expect(books.updateBook).not.toHaveBeenCalled();
  });

  test("refuses an empty title and a lesson the book doesn't have", async () => {
    books.getBook.mockResolvedValue(book());
    expect((await patch({ title: "   " })).status).toBe(400);
    expect((await patch({ lessonTitles: [{ n: 3, title: "Ailleurs" }] })).status).toBe(400);
    expect(books.updateBook).not.toHaveBeenCalled();
  });
});
