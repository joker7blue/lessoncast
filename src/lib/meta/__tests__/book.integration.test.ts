// Muse Spark reads a small generated textbook PDF (about $0.01). Runs when MODEL_API_KEY is set, and
// skips itself otherwise.

import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, test } from "vitest";
import { joinSlices } from "../../books/lessons";
import { slicePdf } from "../../books/pdf";
import { readSlice } from "../book";

async function textbook(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages: string[][] = [
    ["SCIENCES CM1", "Éditions du Mont Cameroun"],
    ["Leçon 1 : Le cœur", "Le cœur est un muscle creux situé dans la poitrine.", "Il envoie le sang dans tout le corps."],
    ["Le sang revient au cœur par les veines.", "Retenons : le cœur est une pompe."],
    ["Leçon 2 : Les états de l'eau", "L'eau est solide, liquide ou gazeuse.", "La chaleur la fait changer d'état."],
  ];
  for (const lines of pages) {
    const page = doc.addPage([595, 842]);
    lines.forEach((line, i) => page.drawText(line, { x: 60, y: 760 - i * 28, size: i === 0 ? 18 : 13, font }));
  }
  return doc.save();
}

describe.skipIf(!process.env.MODEL_API_KEY)("Muse Spark reads a book PDF (live)", { timeout: 180_000 }, () => {
  test("lists the lessons of a slice with their pages", async () => {
    const { pageCount, slices } = await slicePdf(await textbook());
    const { answer, costUsd } = await readSlice(slices[0]!, pageCount);
    const { lessons, isTextbook } = joinSlices([{ ...slices[0]!, answer }]);
    expect(isTextbook).toBe(true);
    expect(lessons.length).toBeGreaterThanOrEqual(2);
    expect(lessons[0]).toMatchObject({ firstPage: 2, lastPage: 3 });
    expect(lessons[1]).toMatchObject({ firstPage: 4, lastPage: 4 });
    expect(costUsd).toBeLessThan(0.05);
  });
});
