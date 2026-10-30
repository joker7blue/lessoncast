import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { SAMPLE_BOOKS } from "../samples";

const PUBLIC = path.resolve(import.meta.dirname, "../../../../public");

test("every sample book is a PDF in public/samples that the upload accepts", () => {
  expect(SAMPLE_BOOKS.length).toBeGreaterThan(0);
  for (const sample of SAMPLE_BOOKS) {
    const file = path.join(PUBLIC, sample.url);
    expect(existsSync(file), `${sample.url} is missing from public/`).toBe(true);
    const bytes = readFileSync(file);
    expect(bytes.subarray(0, 4).toString(), `${sample.url} is not a PDF`).toBe("%PDF");
    expect(bytes.length).toBeLessThanOrEqual(50 * 1024 * 1024);
    expect(sample.url).toMatch(/^\/samples\/[a-z0-9-]+\.pdf$/);
    // Its cover: a JPEG of the first page, under the same name.
    expect(sample.cover).toBe(sample.url.replace(/\.pdf$/, ".jpg"));
    const cover = readFileSync(path.join(PUBLIC, sample.cover));
    expect([cover[0], cover[1]], `${sample.cover} is not a JPEG`).toEqual([0xff, 0xd8]);
  }
});

test("each sample says what it holds, and names are unique", () => {
  for (const sample of SAMPLE_BOOKS) {
    for (const field of [sample.title, sample.subject, sample.level, sample.description]) expect(field.trim()).not.toBe("");
    expect(sample.pages).toBeGreaterThan(0);
  }
  expect(new Set(SAMPLE_BOOKS.map((s) => s.url)).size).toBe(SAMPLE_BOOKS.length);
});
