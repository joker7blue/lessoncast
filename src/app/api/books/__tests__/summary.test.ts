import { beforeEach, expect, test, vi } from "vitest";
import type { BookRow } from "@/lib/books/repo";

const books = vi.hoisted(() => ({ getBook: vi.fn() }));
const pages = vi.hoisted(() => ({ bookLessonPdf: vi.fn() }));
const spark = vi.hoisted(() => ({ summarizeLesson: vi.fn() }));
const storage = vi.hoisted(() => ({ downloadFile: vi.fn(), uploadFile: vi.fn() }));
vi.mock("@/lib/books/repo", () => books);
vi.mock("@/lib/books/lesson-pages", () => pages);
vi.mock("@/lib/meta/summary", async (importOriginal) => ({ ...(await importOriginal<object>()), ...spark }));
vi.mock("@/lib/supabase/storage", async (importOriginal) => ({ ...(await importOriginal<object>()), ...storage }));

import { POST as summaryRoute } from "../[id]/lessons/[n]/summary/route";

const ID = "7d1f2c3a-5b6e-4f70-8a91-b2c3d4e5f607";
const SUMMARY = { summary: "Le cœur pompe le sang dans tout le corps.", keyTerms: [{ term: "cœur", meaning: "Le muscle qui pompe le sang." }, { term: "artère", meaning: "Un vaisseau qui part du cœur." }] };

function book(patch: Partial<BookRow> = {}): BookRow {
  return {
    id: ID,
    status: "ready",
    lessons: [{ title: "Le cœur", firstPage: 3, lastPage: 6, summary: "Le cœur pompe le sang." }],
    slices: [{ path: `books/${ID}/slices/1-30.pdf`, firstPage: 1, lastPage: 30 }],
    ...patch,
  } as BookRow;
}

const post = (n: string, body: unknown) =>
  summaryRoute(new Request(`http://localhost/api/books/${ID}/lessons/${n}/summary`, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }), {
    params: Promise.resolve({ id: ID, n }),
  });

beforeEach(() => {
  vi.resetAllMocks();
  pages.bookLessonPdf.mockResolvedValue({ bytes: new Uint8Array([1]), pageCount: 4 });
  spark.summarizeLesson.mockResolvedValue({ summary: SUMMARY, seconds: 9, costUsd: 0.01 });
});

test("a summary already made is read back, without asking Muse Spark again", async () => {
  books.getBook.mockResolvedValue(book());
  storage.downloadFile.mockResolvedValue(new TextEncoder().encode(JSON.stringify(SUMMARY)));
  const res = await post("1", { language: "pcm" });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ language: "pcm", ...SUMMARY });
  expect(storage.downloadFile).toHaveBeenCalledWith(`books/${ID}/summaries/1-pcm.json`);
  expect(spark.summarizeLesson).not.toHaveBeenCalled();
});

test("a new summary is written from the lesson's pages and saved as JSON", async () => {
  books.getBook.mockResolvedValue(book());
  storage.downloadFile.mockRejectedValue(new Error("Object not found"));
  const res = await post("1", { language: "hau" });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ language: "hau", ...SUMMARY });
  expect(spark.summarizeLesson).toHaveBeenCalledWith({ pdf: new Uint8Array([1]), pageCount: 4 }, "hau");
  const [path, bytes, type] = storage.uploadFile.mock.calls[0]!;
  expect([path, type]).toEqual([`books/${ID}/summaries/1-hau.json`, "application/json"]);
  expect(JSON.parse(new TextDecoder().decode(bytes as Uint8Array))).toEqual(SUMMARY);
});

test("refuses a language LessonCast doesn't speak, a missing lesson, and a book still being read", async () => {
  books.getBook.mockResolvedValue(book());
  expect((await post("1", { language: "xx" })).status).toBe(400);
  expect((await post("2", { language: "fr" })).status).toBe(404);
  books.getBook.mockResolvedValue(book({ status: "reading" }));
  expect((await post("1", { language: "fr" })).status).toBe(409);
  books.getBook.mockResolvedValue(null);
  expect((await post("1", { language: "fr" })).status).toBe(404);
  expect(spark.summarizeLesson).not.toHaveBeenCalled();
});
