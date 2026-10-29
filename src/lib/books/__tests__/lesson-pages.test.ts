import { PDFDocument } from "pdf-lib";
import { describe, expect, test, vi } from "vitest";
import { bookLessonPdf } from "../lesson-pages";
import { slicePdf } from "../pdf";

async function book(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let n = 1; n <= pageCount; n++) doc.addPage([100 + n, 200]);
  return doc.save();
}
const pagesOf = async (bytes: Uint8Array) => (await PDFDocument.load(bytes)).getPages().map((p) => p.getWidth() - 100);

async function storedBook(pageCount: number) {
  const { slices } = await slicePdf(await book(pageCount));
  const files = new Map(slices.map((s) => [`books/b/slices/${s.firstPage}-${s.lastPage}.pdf`, s.bytes]));
  const stored = slices.map(({ firstPage, lastPage }) => ({ firstPage, lastPage, path: `books/b/slices/${firstPage}-${lastPage}.pdf` }));
  const download = vi.fn(async (path: string) => files.get(path)!);
  return { stored, download };
}

const lesson = (firstPage: number, lastPage: number) => ({ title: "L", firstPage, lastPage, summary: "S." });

describe("bookLessonPdf", () => {
  test("cuts a lesson's pages out of the one slice that holds them", async () => {
    const { stored, download } = await storedBook(65);
    const { bytes, pageCount } = await bookLessonPdf({ slices: stored, lessons: [lesson(3, 6), lesson(40, 44)] }, 2, download);
    expect(await pagesOf(bytes)).toEqual([40, 41, 42, 43, 44]);
    expect(pageCount).toBe(5);
    expect(download).toHaveBeenCalledTimes(1);
  });

  test("downloads both slices for a lesson across a boundary, and caps it at 20 pages", async () => {
    const { stored, download } = await storedBook(65);
    const { bytes, pageCount } = await bookLessonPdf({ slices: stored, lessons: [lesson(25, 50)] }, 1, download);
    expect(await pagesOf(bytes)).toEqual(Array.from({ length: 20 }, (_, i) => 25 + i));
    expect(pageCount).toBe(20);
    expect(download).toHaveBeenCalledTimes(2);
  });

  test("throws on a lesson number the book doesn't have", async () => {
    const { stored, download } = await storedBook(10);
    await expect(bookLessonPdf({ slices: stored, lessons: [lesson(1, 2)] }, 2, download)).rejects.toThrow(/lesson 2/);
  });
});
