import { expect, test } from "vitest";
import { quizChoice } from "../video-choice";

test("without a choice, the quiz that fits the length", () => {
  expect(quizChoice(undefined, 120, "fr")).toEqual({ ok: true, quizQuestions: 3 });
  expect(quizChoice(null, 15, "fr")).toEqual({ ok: true, quizQuestions: 0 });
});

test("a choice the length has room for, from a form field or JSON", () => {
  expect(quizChoice("2", 60, "pcm")).toEqual({ ok: true, quizQuestions: 2 });
  expect(quizChoice(0, 180, "fr")).toEqual({ ok: true, quizQuestions: 0 });
});

test("a slower language has room for fewer questions in the same length", () => {
  expect(quizChoice(1, 60, "swh")).toEqual({ ok: true, quizQuestions: 1 });
  expect(quizChoice(2, 60, "swh")).toEqual({ ok: false, error: "This video has room for 1 quiz question at most." });
});

test("refuses a quiz that doesn't fit, or isn't a number of questions", () => {
  expect(quizChoice(1, 30, "fr")).toEqual({ ok: false, error: "This video is too short for a quiz." });
  expect(quizChoice(6, 180, "fr")).toMatchObject({ ok: false });
  expect(quizChoice("two", 180, "fr")).toMatchObject({ ok: false });
});
