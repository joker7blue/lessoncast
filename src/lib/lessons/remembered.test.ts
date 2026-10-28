import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { rememberedLessons, rememberLesson } from "./remembered";

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
