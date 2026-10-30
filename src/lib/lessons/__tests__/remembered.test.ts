import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { bookChoices, rememberBook, rememberBookChoices, rememberedBooks, rememberedLessons, rememberLesson } from "../remembered";

let store: Record<string, string>;
beforeEach(() => {
  store = {};
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

test("the newest lesson comes first, without duplicates", () => {
  rememberLesson("a");
  rememberLesson("b");
  rememberLesson("a");
  expect(rememberedLessons()).toEqual(["a", "b"]);
});

test("blocked or broken storage reads as no lessons and never throws", () => {
  store["lessoncast:lessons"] = "not json";
  expect(rememberedLessons()).toEqual([]);
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  });
  expect(() => rememberLesson("a")).not.toThrow();
  expect(rememberedLessons()).toEqual([]);
});

test("books are remembered apart from lessons", () => {
  rememberLesson("lesson");
  rememberBook("book-1");
  rememberBook("book-2");
  expect(rememberedBooks()).toEqual(["book-2", "book-1"]);
  expect(rememberedLessons()).toEqual(["lesson"]);
});

test("a book's choices are kept for its lessons, and a book without any starts from none", () => {
  rememberBookChoices("book-1", { language: "hau", length: 60, style: "comic" });
  rememberBookChoices("book-2", { quiz: 0 });
  expect(bookChoices("book-1")).toEqual({ language: "hau", length: 60, style: "comic" });
  expect(bookChoices("book-2")).toEqual({ quiz: 0 });
  expect(bookChoices("book-3")).toEqual({});
  store["lessoncast:book-choices"] = "not json";
  expect(bookChoices("book-1")).toEqual({});
});
