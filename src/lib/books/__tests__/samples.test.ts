import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { MAX_BOOK_PAGES } from "../pdf";
import { SAMPLE_BOOKS } from "../samples";

const PUBLIC = path.resolve(import.meta.dirname, "../../../../public");

test("every sample book is a PDF in the lessons bucket, with its cover in public/samples", () => {
  expect(SAMPLE_BOOKS.length).toBeGreaterThan(0);
  for (const sample of SAMPLE_BOOKS) {
    expect(sample.name).toMatch(/^[a-z0-9-]+$/);
    expect(sample.url).toMatch(new RegExp(`/storage/v1/object/public/lessons/samples/${sample.name}\\.pdf$`));
    // Its cover: a JPEG of the first page, under the same name.
    expect(sample.cover).toBe(`/samples/${sample.name}.jpg`);
    const cover = readFileSync(path.join(PUBLIC, sample.cover));
    expect([cover[0], cover[1]], `${sample.cover} is not a JPEG`).toEqual([0xff, 0xd8]);
  }
});

test("each sample says what it holds, fits the upload, and names are unique", () => {
  for (const sample of SAMPLE_BOOKS) {
    for (const field of [sample.title, sample.subject, sample.level, sample.description]) expect(field.trim()).not.toBe("");
    expect(sample.pages).toBeGreaterThan(0);
    expect(sample.pages).toBeLessThanOrEqual(MAX_BOOK_PAGES);
  }
  expect(new Set(SAMPLE_BOOKS.map((s) => s.name)).size).toBe(SAMPLE_BOOKS.length);
});
