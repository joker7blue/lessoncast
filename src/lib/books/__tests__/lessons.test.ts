import { describe, expect, test } from "vitest";
import { joinSlices } from "../lessons";
import type { BookSlice } from "../schema";

const book = { title: "Sciences CM1", subject: "Sciences", level: "CM1" };
const lesson = (title: string, firstPage: number, lastPage: number, continuesPrevious = false) => ({
  title,
  firstPage,
  lastPage,
  summary: `${title}.`,
  continuesPrevious,
});
const answer = (lessons: BookSlice["lessons"], info = book, isTextbook = true, language: BookSlice["language"] = "fr"): BookSlice => ({
  isTextbook,
  language,
  book: info,
  lessons,
});

describe("joinSlices", () => {
  test("maps each slice's pages back to the book's pages", () => {
    const joined = joinSlices([
      { firstPage: 1, lastPage: 30, answer: answer([lesson("Le cœur", 3, 6)]) },
      { firstPage: 31, lastPage: 60, answer: answer([lesson("L'eau", 2, 5)]) },
    ]);
    expect(joined.lessons.map((l) => [l.title, l.firstPage, l.lastPage])).toEqual([
      ["Le cœur", 3, 6],
      ["L'eau", 32, 35],
    ]);
    expect(joined.book).toEqual(book);
  });

  test("joins a lesson that goes on into the next slice", () => {
    const joined = joinSlices([
      { firstPage: 1, lastPage: 30, answer: answer([lesson("Le cœur", 3, 6), lesson("Le sang", 27, 30)]) },
      { firstPage: 31, lastPage: 60, answer: answer([lesson("Le sang (suite)", 1, 3, true), lesson("L'eau", 4, 8)]) },
    ]);
    expect(joined.lessons.map((l) => [l.title, l.firstPage, l.lastPage])).toEqual([
      ["Le cœur", 3, 6],
      ["Le sang", 27, 33],
      ["L'eau", 34, 38],
    ]);
  });

  test("keeps a continuing lesson of the first slice as a lesson of its own", () => {
    const joined = joinSlices([{ firstPage: 1, lastPage: 30, answer: answer([lesson("Suite", 1, 2, true)]) }]);
    expect(joined.lessons.map((l) => [l.title, l.firstPage, l.lastPage])).toEqual([["Suite", 1, 2]]);
  });

  test("clamps pages to the slice and drops empty or reversed ranges", () => {
    const joined = joinSlices([
      { firstPage: 31, lastPage: 40, answer: answer([lesson("Trop long", 8, 15), lesson("À l'envers", 6, 4), lesson("Hors tranche", 12, 14)]) },
    ]);
    expect(joined.lessons.map((l) => [l.title, l.firstPage, l.lastPage])).toEqual([["Trop long", 38, 40]]);
  });

  test("sorts the lessons by page and skips a slice that couldn't be read", () => {
    const joined = joinSlices([
      { firstPage: 1, lastPage: 30, answer: answer([lesson("B", 20, 22), lesson("A", 5, 8)]) },
      { firstPage: 31, lastPage: 60, answer: null },
      { firstPage: 61, lastPage: 70, answer: answer([lesson("C", 1, 4, true)]) },
    ]);
    expect(joined.lessons.map((l) => [l.title, l.firstPage, l.lastPage])).toEqual([
      ["A", 5, 8],
      ["B", 20, 22],
      ["C", 61, 64],
    ]);
  });

  test("takes the book's title from the first slice that shows it", () => {
    const joined = joinSlices([
      { firstPage: 1, lastPage: 30, answer: answer([], { title: "", subject: "", level: "" }) },
      { firstPage: 31, lastPage: 60, answer: answer([lesson("A", 1, 2)]) },
    ]);
    expect(joined.book).toEqual(book);
  });

  test("says when no slice looks like a textbook", () => {
    const joined = joinSlices([{ firstPage: 1, lastPage: 3, answer: answer([], { title: "Roman", subject: "", level: "" }, false) }]);
    expect(joined).toMatchObject({ isTextbook: false, lessons: [] });
  });
});

test("the book's language is the one most of its slices are written in", () => {
  const joined = joinSlices([
    { firstPage: 1, lastPage: 30, answer: answer([], book, true, "en") },
    { firstPage: 31, lastPage: 60, answer: answer([], book, true, "en") },
    { firstPage: 61, lastPage: 70, answer: answer([], book, true, "fr") },
  ]);
  expect(joined.language).toBe("en");
});
