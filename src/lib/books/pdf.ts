// A book's PDF, cut with pdf-lib (pure JavaScript, no rendering): into slices of 30 pages that Muse
// Spark reads whole, and into the pages of one lesson for its video. Pages are numbered from 1.

import { PDFDocument } from "pdf-lib";

// Muse Spark sees the images of a PDF's first 50 pages only (derisk test 7): 30 leaves room.
export const SLICE_PAGES = 30;
export const MAX_BOOK_PAGES = 600;
// A lesson longer than this is filmed from its first pages: the video lasts about 2 minutes anyway.
export const MAX_LESSON_PAGES = 20;

export type Slice = { firstPage: number; lastPage: number; bytes: Uint8Array };

/** A PDF the teacher has to fix: protected, damaged, empty or too long. `message` is for them. */
export class UnreadablePdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnreadablePdfError";
  }
}

async function open(bytes: Uint8Array): Promise<PDFDocument> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch {
    throw new UnreadablePdfError("This file can't be opened as a PDF. Export the book as a PDF again and upload it.");
  }
  if (doc.isEncrypted) throw new UnreadablePdfError("This PDF is protected by a password. Save a copy without protection and upload it.");
  if (doc.getPageCount() === 0) throw new UnreadablePdfError("This PDF has no pages.");
  return doc;
}

async function copy(source: PDFDocument, indexes: number[], into = PDFDocument.create()): Promise<PDFDocument> {
  const target = await into;
  for (const page of await target.copyPages(source, indexes)) target.addPage(page);
  return target;
}

/** The book cut into slices of `size` pages, in order. */
export async function slicePdf(bytes: Uint8Array, size = SLICE_PAGES): Promise<{ pageCount: number; slices: Slice[] }> {
  const doc = await open(bytes);
  const pageCount = doc.getPageCount();
  if (pageCount > MAX_BOOK_PAGES) {
    throw new UnreadablePdfError(`This PDF has ${pageCount} pages; LessonCast reads books of up to ${MAX_BOOK_PAGES}. Upload one part of it.`);
  }
  const slices: Slice[] = [];
  for (let firstPage = 1; firstPage <= pageCount; firstPage += size) {
    const lastPage = Math.min(firstPage + size - 1, pageCount);
    const indexes = Array.from({ length: lastPage - firstPage + 1 }, (_, i) => firstPage - 1 + i);
    slices.push({ firstPage, lastPage, bytes: await (await copy(doc, indexes)).save() });
  }
  return { pageCount, slices };
}

/** Pages first to last of the book, at most MAX_LESSON_PAGES, as one PDF, from the slices that hold them. */
export async function cutPages(slices: Slice[], first: number, last: number): Promise<Uint8Array> {
  const end = Math.min(last, first + MAX_LESSON_PAGES - 1);
  const out = PDFDocument.create();
  for (let page = first; page <= end; ) {
    const slice = slices.find((s) => s.firstPage <= page && page <= s.lastPage);
    if (!slice) throw new RangeError(`No slice holds page ${page}`);
    const upTo = Math.min(end, slice.lastPage);
    const indexes = Array.from({ length: upTo - page + 1 }, (_, i) => page - slice.firstPage + i);
    await copy(await PDFDocument.load(slice.bytes), indexes, out);
    page = upTo + 1;
  }
  return (await out).save();
}
