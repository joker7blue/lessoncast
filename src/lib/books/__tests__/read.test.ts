import { describe, expect, test, vi } from "vitest";
import type { Slice } from "../pdf";
import { readAllSlices } from "../read";
import type { BookSlice } from "../schema";

const slices: Slice[] = [
  { firstPage: 1, lastPage: 30, bytes: new Uint8Array([1]) },
  { firstPage: 31, lastPage: 60, bytes: new Uint8Array([2]) },
  { firstPage: 61, lastPage: 65, bytes: new Uint8Array([3]) },
];
const answer: BookSlice = { isTextbook: true, language: "fr", book: { title: "T", subject: "S", level: "L" }, lessons: [] };

describe("readAllSlices", () => {
  test("reads every slice and adds up their cost", async () => {
    const readSlice = vi.fn(async () => ({ answer, seconds: 10, costUsd: 0.05 }));
    const onRead = vi.fn(async () => {});
    const result = await readAllSlices(slices, 65, { readSlice, onRead });
    expect(readSlice).toHaveBeenCalledTimes(3);
    expect(readSlice).toHaveBeenCalledWith(slices[1], 65);
    expect(result.answers.map((a) => [a.firstPage, a.lastPage, a.answer])).toEqual([
      [1, 30, answer],
      [31, 60, answer],
      [61, 65, answer],
    ]);
    expect(result.costUsd).toBeCloseTo(0.15);
    expect(onRead).toHaveBeenCalledTimes(3);
  });

  test("tries a failed slice a second time", async () => {
    let calls = 0;
    const readSlice = vi.fn(async (slice: Slice) => {
      if (slice.firstPage === 31 && calls++ === 0) throw new Error("timeout");
      return { answer, seconds: 10, costUsd: 0.05 };
    });
    const result = await readAllSlices(slices, 65, { readSlice });
    expect(readSlice).toHaveBeenCalledTimes(4);
    expect(result.answers.every((a) => a.answer)).toBe(true);
  });

  test("leaves out a slice that fails twice and keeps the others", async () => {
    const warn = vi.fn();
    const readSlice = vi.fn(async (slice: Slice) => {
      if (slice.firstPage === 31) throw new Error("HTTP 500");
      return { answer, seconds: 10, costUsd: 0.05 };
    });
    const result = await readAllSlices(slices, 65, { readSlice, warn });
    expect(result.answers.map((a) => a.answer === null)).toEqual([false, true, false]);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/31.*60.*HTTP 500/));
  });
});
