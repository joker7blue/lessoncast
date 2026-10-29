import { describe, expect, test } from "vitest";
import { defaultLength, lengthPlan, quizQuestionsFor, VideoLength } from "../length";

describe("lengthPlan", () => {
  test("a 15 s video is one short scene and no quiz", () => {
    expect(lengthPlan(15)).toEqual({ scenes: 1, wordsPerScene: 27, quizQuestions: 0 });
  });

  test("30 s: two scenes, still no quiz", () => {
    expect(lengthPlan(30)).toMatchObject({ scenes: 2, quizQuestions: 0 });
  });

  test("1 minute: one quiz question", () => {
    expect(lengthPlan(60)).toMatchObject({ scenes: 2, quizQuestions: 1 });
  });

  test("2 and 3 minutes: the full quiz, and as many scenes as the time allows", () => {
    expect(lengthPlan(120)).toMatchObject({ scenes: 4, quizQuestions: 3 });
    expect(lengthPlan(180)).toMatchObject({ scenes: 8, quizQuestions: 3 });
  });

  test("the narration fills the time at the voice's 2.7 words a second", () => {
    for (const seconds of [15, 30, 60, 120, 180] as const) {
      const { scenes, wordsPerScene, quizQuestions } = lengthPlan(seconds);
      const quiz = quizQuestions ? 4 + quizQuestions * 15 : 0;
      const spoken = (scenes * wordsPerScene) / 2.7 + 5 + quiz;
      expect(Math.abs(spoken - seconds)).toBeLessThanOrEqual(seconds * 0.12 + 2);
    }
  });
});

test("quizQuestionsFor: none up to 30 s, one at a minute, three beyond", () => {
  expect([15, 30, 60, 120, 180].map(quizQuestionsFor)).toEqual([0, 0, 1, 3, 3]);
});

test("defaultLength: 2 minutes for one or two pages, 3 for more", () => {
  expect([1, 2, 3, 4, 12].map(defaultLength)).toEqual([120, 120, 180, 180, 180]);
});

test("VideoLength accepts only the offered lengths", () => {
  expect(VideoLength.safeParse(60).success).toBe(true);
  expect(VideoLength.safeParse(45).success).toBe(false);
});

test("a slower voice gets fewer words for the same time", () => {
  // Hausa's voice reads about 1.6 words a second, Pidgin's 2.7.
  expect(lengthPlan(60, 1.6).wordsPerScene).toBeLessThan(lengthPlan(60, 2.7).wordsPerScene);
  expect(lengthPlan(60, 1.6)).toMatchObject({ scenes: 2, wordsPerScene: 29, quizQuestions: 1 });
});

