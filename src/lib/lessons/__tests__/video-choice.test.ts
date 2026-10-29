import { expect, test } from "vitest";
import { quizChoice } from "../video-choice";

test("without a choice, the quiz that fits the length", () => {
  expect(quizChoice(undefined, 120)).toEqual({ ok: true, quizQuestions: 3 });
  expect(quizChoice(null, 15)).toEqual({ ok: true, quizQuestions: 0 });
});

test("a choice the length has room for, from a form field or JSON", () => {
  expect(quizChoice("2", 60)).toEqual({ ok: true, quizQuestions: 2 });
  expect(quizChoice(0, 180)).toEqual({ ok: true, quizQuestions: 0 });
});

test("refuses a quiz that doesn't fit, or isn't a number of questions", () => {
  expect(quizChoice(1, 30)).toEqual({ ok: false, error: "This video is too short for a quiz." });
  expect(quizChoice(6, 180)).toMatchObject({ ok: false });
  expect(quizChoice("two", 180)).toMatchObject({ ok: false });
});
