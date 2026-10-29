import { PDFDocument } from "pdf-lib";
import { describe, expect, test } from "vitest";
import { cutPages, slicePdf, UnreadablePdfError } from "../pdf";

// Page n of a test book is 100 + n points wide, so a page's width tells which page it is.
async function book(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let n = 1; n <= pageCount; n++) doc.addPage([100 + n, 200]);
  return doc.save();
}

async function pagesOf(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => page.getWidth() - 100);
}

describe("slicePdf", () => {
  test("cuts the book into slices of 30 pages, the last one shorter", async () => {
    const { pageCount, slices } = await slicePdf(await book(65));
    expect(pageCount).toBe(65);
    expect(slices.map((s) => [s.firstPage, s.lastPage])).toEqual([
      [1, 30],
      [31, 60],
      [61, 65],
    ]);
    expect(await pagesOf(slices[1]!.bytes)).toEqual(Array.from({ length: 30 }, (_, i) => 31 + i));
  });

  test("keeps a short book in one slice", async () => {
    const { slices } = await slicePdf(await book(4));
    expect(slices.map((s) => [s.firstPage, s.lastPage])).toEqual([[1, 4]]);
  });

  test("refuses bytes that aren't a PDF", async () => {
    await expect(slicePdf(new TextEncoder().encode("<html>not a pdf</html>"))).rejects.toBeInstanceOf(UnreadablePdfError);
  });

  test("refuses a PDF with no pages", async () => {
    const empty = await (await PDFDocument.create()).save({ addDefaultPage: false });
    await expect(slicePdf(empty)).rejects.toBeInstanceOf(UnreadablePdfError);
  });
});

describe("cutPages", () => {
  test("cuts a lesson inside one slice", async () => {
    const { slices } = await slicePdf(await book(65));
    expect(await pagesOf(await cutPages(slices, 12, 15))).toEqual([12, 13, 14, 15]);
  });

  test("joins a lesson that spans two slices", async () => {
    const { slices } = await slicePdf(await book(65));
    expect(await pagesOf(await cutPages(slices, 28, 33))).toEqual([28, 29, 30, 31, 32, 33]);
  });

  test("keeps the first 20 pages of a longer lesson", async () => {
    const { slices } = await slicePdf(await book(65));
    expect(await pagesOf(await cutPages(slices, 5, 40))).toEqual(Array.from({ length: 20 }, (_, i) => 5 + i));
  });

  test("throws on pages outside the slices", async () => {
    const { slices } = await slicePdf(await book(10));
    await expect(cutPages(slices, 9, 12)).rejects.toThrow(/page 11/);
  });
});
