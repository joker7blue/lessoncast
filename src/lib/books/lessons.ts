// Joins what Muse Spark found in each slice of a book into one list of lessons, with pages in the whole
// book. Muse Spark counts pages from 1 in each slice; a lesson cut by a slice boundary is joined back.

import type { BookLanguage, BookLesson, BookSlice } from "./schema";

export type SliceAnswer = { firstPage: number; lastPage: number; answer: BookSlice | null };

export type JoinedBook = {
  isTextbook: boolean;
  book: BookSlice["book"] | null;
  /** The language most slices are written in. */
  language: BookLanguage | null;
  lessons: BookLesson[];
};

function mostCommon<T>(values: T[]): T | null {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** `answer` is null for a slice Muse Spark couldn't read: its lessons are missing, the others stay. */
export function joinSlices(slices: SliceAnswer[]): JoinedBook {
  const lessons: BookLesson[] = [];
  const ordered = [...slices].sort((a, b) => a.firstPage - b.firstPage);
  for (const { firstPage, lastPage, answer } of ordered) {
    if (!answer) continue;
    const found = answer.lessons
      .map((l) => ({
        ...l,
        firstPage: Math.max(firstPage, firstPage - 1 + l.firstPage),
        lastPage: Math.min(lastPage, firstPage - 1 + l.lastPage),
      }))
      .filter((l) => l.firstPage <= l.lastPage)
      .sort((a, b) => a.firstPage - b.firstPage);
    for (const [i, { continuesPrevious, ...lesson }] of found.entries()) {
      // Joined only when the lesson before ran to the end of the previous slice: past a slice that
      // couldn't be read, the start of the lesson is lost and the rest stands alone.
      const previous = lessons.at(-1);
      if (i === 0 && continuesPrevious && previous && previous.lastPage >= firstPage - 1) previous.lastPage = lesson.lastPage;
      else lessons.push(lesson);
    }
  }
  lessons.sort((a, b) => a.firstPage - b.firstPage);

  const answers = ordered.flatMap((s) => (s.answer ? [s.answer] : []));
  const book = answers.find((a) => a.book.title.trim())?.book ?? answers[0]?.book ?? null;
  return { isTextbook: answers.some((a) => a.isTextbook), book, language: mostCommon(answers.map((a) => a.language)), lessons };
}
