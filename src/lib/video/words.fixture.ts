// Test helper: word timings shaped like the voice service's output. Words take 0.3 s, sentences are
// separated by 0.35 s and groups by 0.6 s, the title group lasts at least 3 s, and tokens without a
// letter (digits, lone punctuation) come back unaligned: zero length, score 0.

import type { TimedWord } from "./words";

export function timedWordsFor(groups: string[][]): { words: TimedWord[]; audioSeconds: number } {
  const words: TimedWord[] = [];
  let t = 0;
  groups.forEach((sentences, group) => {
    for (const sentence of sentences) {
      for (const word of sentence.split(/\s+/).filter(Boolean)) {
        const aligned = /\p{L}/u.test(word);
        words.push({ word, start: t, end: aligned ? t + 0.3 : t, score: aligned ? 0.9 : 0, group });
        if (aligned) t += 0.3;
      }
      t += 0.35;
    }
    if (group === 0) t = Math.max(t, 3);
    t += 0.6;
  });
  return { words, audioSeconds: t - 0.6 };
}
