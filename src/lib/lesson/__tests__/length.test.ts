import { describe, expect, test } from "vitest";
import { LANGUAGE_CODES, LANGUAGES } from "../languages";
import { defaultLength, LENGTHS, lengthPlan, maxQuizQuestions, quizQuestionsFor, VideoLength, videoSeconds } from "../length";

describe("lengthPlan", () => {
  test("a 15 s video is one short scene and no quiz", () => {
    expect(lengthPlan(15)).toEqual({ scenes: 1, wordsPerScene: 21, quizQuestions: 0 });
  });

  test("30 s: one scene, still no quiz", () => {
    expect(lengthPlan(30)).toEqual({ scenes: 1, wordsPerScene: 60, quizQuestions: 0 });
  });

  test("1 minute: one quiz question", () => {
    expect(lengthPlan(60)).toEqual({ scenes: 2, wordsPerScene: 38, quizQuestions: 1 });
  });

  test("2 and 3 minutes: the full quiz, and as many scenes as the time allows", () => {
    expect(lengthPlan(120)).toMatchObject({ scenes: 3, quizQuestions: 3 });
    expect(lengthPlan(180)).toMatchObject({ scenes: 7, quizQuestions: 3 });
  });

  test("the script fills the time it is given, in every language, whatever the quiz", () => {
    for (const code of LANGUAGE_CODES) {
      const pace = LANGUAGES[code].wordsPerSecond;
      for (const seconds of LENGTHS) {
        for (let questions = 0; questions <= maxQuizQuestions(seconds, pace); questions++) {
          const { scenes, wordsPerScene } = lengthPlan(seconds, pace, questions);
          expect(Math.abs(videoSeconds(scenes * wordsPerScene, questions, pace) - seconds)).toBeLessThanOrEqual(seconds * 0.05);
        }
      }
    }
  });
});

test("videoSeconds gives the length of the videos really made, within 5 %", () => {
  // Measured on 29 October: the narration's words, the quiz questions and the video's length.
  const made = [
    { language: "hau", words: 98, questions: 1, seconds: 87.9 },
    { language: "ful", words: 70, questions: 0, seconds: 39.7 },
    { language: "yor", words: 48, questions: 2, seconds: 58.6 },
    { language: "swh", words: 38, questions: 2, seconds: 75.9 },
  ] as const;
  for (const { language, words, questions, seconds } of made) {
    expect(Math.abs(videoSeconds(words, questions, LANGUAGES[language].wordsPerSecond) - seconds)).toBeLessThanOrEqual(seconds * 0.05);
  }
});

test("quizQuestionsFor: none up to 30 s, one at a minute, three beyond, never more than fit", () => {
  expect(LENGTHS.map((seconds) => quizQuestionsFor(seconds))).toEqual([0, 0, 1, 3, 3]);
  for (const code of LANGUAGE_CODES) {
    const pace = LANGUAGES[code].wordsPerSecond;
    for (const seconds of LENGTHS) expect(quizQuestionsFor(seconds, pace)).toBeLessThanOrEqual(maxQuizQuestions(seconds, pace));
  }
});

test("defaultLength: 2 minutes for one or two pages, 3 for more", () => {
  expect([1, 2, 3, 4, 12].map(defaultLength)).toEqual([120, 120, 180, 180, 180]);
});

test("VideoLength accepts only the offered lengths", () => {
  expect(VideoLength.safeParse(60).success).toBe(true);
  expect(VideoLength.safeParse(45).success).toBe(false);
});

test("a slower voice gets fewer words for the same time", () => {
  // Hausa's voice reads about 1.8 words a second, Pidgin's 2.6.
  expect(lengthPlan(60, 1.8)).toEqual({ scenes: 1, wordsPerScene: 43, quizQuestions: 1 });
  expect(lengthPlan(60, 2.6)).toEqual({ scenes: 2, wordsPerScene: 38, quizQuestions: 1 });
});

test("maxQuizQuestions: what fits beside at least 10 s of lesson, at the language's pace", () => {
  expect(LENGTHS.map((seconds) => maxQuizQuestions(seconds))).toEqual([0, 0, 2, 5, 5]);
  // A Swahili question and its answer take about 21 s to read, a Yoruba one 15 s.
  expect(LENGTHS.map((seconds) => maxQuizQuestions(seconds, LANGUAGES.swh.wordsPerSecond))).toEqual([0, 0, 1, 4, 5]);
  expect(LENGTHS.map((seconds) => maxQuizQuestions(seconds, LANGUAGES.yor.wordsPerSecond))).toEqual([0, 0, 2, 5, 5]);
});

test("a quiz the teacher chose takes its part of the time from the scenes", () => {
  expect(lengthPlan(120, 2.6, 5)).toEqual({ scenes: 1, wordsPerScene: 54, quizQuestions: 5 });
  expect(lengthPlan(120, 2.6, 0)).toEqual({ scenes: 7, wordsPerScene: 42, quizQuestions: 0 });
});
