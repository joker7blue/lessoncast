// Reads every slice of a book with Muse Spark, 4 at a time. A slice that fails twice is left out: its
// lessons are missing from the list, the others are kept.

import { forEachLimit } from "../limit";
import type { SliceAnswer } from "./lessons";
import type { Slice } from "./pdf";
import type { BookSlice } from "./schema";

const CONCURRENCY = 4;
const ATTEMPTS = 2;

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

type ReadDeps = {
  readSlice(slice: Slice, pageCount: number): Promise<{ answer: BookSlice; seconds: number; costUsd: number }>;
  /** Called after each slice is read, for the progress the book page shows. */
  onRead?(): Promise<void>;
  warn?(message: string): void;
};

export async function readAllSlices(slices: Slice[], pageCount: number, deps: ReadDeps): Promise<{ answers: SliceAnswer[]; costUsd: number }> {
  const answers: SliceAnswer[] = slices.map(({ firstPage, lastPage }) => ({ firstPage, lastPage, answer: null }));
  let costUsd = 0;
  await forEachLimit(
    slices.map((slice, i) => ({ slice, i })),
    CONCURRENCY,
    async ({ slice, i }) => {
      for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
        try {
          const read = await deps.readSlice(slice, pageCount);
          answers[i]!.answer = read.answer;
          costUsd += read.costUsd;
          break;
        } catch (error) {
          deps.warn?.(`Pages ${slice.firstPage} to ${slice.lastPage}: reading attempt ${attempt} failed: ${reason(error)}`);
        }
      }
      await deps.onRead?.();
    },
  );
  return { answers, costUsd };
}
