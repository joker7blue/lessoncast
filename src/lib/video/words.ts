// A narration word as the voice service times it. `group` is its narration group: 0 for the title,
// then one per scene. Words the aligner can't time (a digit, lone punctuation) come back with
// end === start and score 0, so they still show in the subtitles.

import { z } from "zod";

export const TimedWord = z.object({
  word: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  score: z.number(),
  group: z.int().nonnegative(),
});
export type TimedWord = z.infer<typeof TimedWord>;
