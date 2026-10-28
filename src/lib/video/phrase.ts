// Finds the words of the narration that name a highlight ("le cœur", "di heart"), so the object lights
// up when the voice says them. Muse Spark copies the phrase from its narration, but not always to the
// letter: case, accents, punctuation and a French elision are ignored, and a plural still matches.

import type { TimedWord } from "./words";

const FALLBACK_MIN_LETTERS = 4;

/** "L'Humanité," → "humanite": lowercase, no accents, no elision, letters and digits only. */
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/^(?:[ldjmnstc]|qu)['’]/, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/** The indexes of the first and last word of the phrase's first occurrence in `words`. Failing an
 * exact match, the phrase's longest word, when long enough, matched as the start of a word (or the
 * other way round, for a plural in the phrase). Null when the narration doesn't say it. */
export function findPhrase(words: TimedWord[], phrase: string): { first: number; last: number } | null {
  const tokens = phrase.split(/\s+/).map(normalizeWord).filter(Boolean);
  if (tokens.length === 0) return null;
  const normalized = words.map((w) => normalizeWord(w.word));

  for (let i = 0; i + tokens.length <= normalized.length; i++) {
    if (tokens.every((token, k) => normalized[i + k] === token)) return { first: i, last: i + tokens.length - 1 };
  }

  const longest = tokens.reduce((a, b) => (b.length > a.length ? b : a));
  if (longest.length < FALLBACK_MIN_LETTERS) return null;
  const i = normalized.findIndex((w) => w.length >= FALLBACK_MIN_LETTERS && (w.startsWith(longest) || longest.startsWith(w)));
  return i === -1 ? null : { first: i, last: i };
}
