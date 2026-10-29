// How long a video lasts, chosen by the teacher, and what that means for the script: the number of scenes,
// the words in each narration, and how many quiz questions fit. Each language's voice has its own pace
// (lib/lesson/languages.ts: 2.7 words a second in Pidgin, 1.6 in Hausa); the title and end cards take
// about 5 s, a quiz question about 15.

import { z } from "zod";

export const LENGTHS = [15, 30, 60, 120, 180] as const;
export const VideoLength = z.literal(LENGTHS);
export type VideoLength = z.infer<typeof VideoLength>;

const WORDS_PER_SECOND = 2.7; // Pidgin's pace, when the language's own isn't given
const CARDS_SECONDS = 5;
const QUIZ_INTRO_SECONDS = 4;
const QUIZ_QUESTION_SECONDS = 15;
const SECONDS_PER_SCENE = 16;
const MAX_SCENES = 8;

export const MAX_QUIZ_QUESTIONS = 5;
export const QuizQuestions = z.int().min(0).max(MAX_QUIZ_QUESTIONS);

/** The quiz offered first: none up to 30 s, one question at a minute, three beyond. */
export function quizQuestionsFor(seconds: number): number {
  return seconds <= 30 ? 0 : seconds <= 60 ? 1 : 3;
}

/** The most questions that fit in the video, leaving at least 10 s of lesson. */
export function maxQuizQuestions(seconds: number): number {
  const room = seconds - CARDS_SECONDS - 10 - QUIZ_INTRO_SECONDS;
  return Math.min(MAX_QUIZ_QUESTIONS, Math.max(0, Math.floor(room / QUIZ_QUESTION_SECONDS)));
}

/** The scenes and words that fill `seconds` once the quiz the teacher chose has taken its part. */
export function lengthPlan(
  seconds: number,
  wordsPerSecond = WORDS_PER_SECOND,
  quizQuestions = quizQuestionsFor(seconds),
): { scenes: number; wordsPerScene: number; quizQuestions: number } {
  const quizSeconds = quizQuestions ? QUIZ_INTRO_SECONDS + quizQuestions * QUIZ_QUESTION_SECONDS : 0;
  const lessonSeconds = Math.max(8, seconds - CARDS_SECONDS - quizSeconds);
  const scenes = Math.min(MAX_SCENES, Math.max(1, Math.round(lessonSeconds / SECONDS_PER_SCENE)));
  return { scenes, wordsPerScene: Math.round((lessonSeconds * wordsPerSecond) / scenes), quizQuestions };
}

/** The length offered first: one or two pages make a 2-minute lesson, more pages a 3-minute one. */
export function defaultLength(pages: number): VideoLength {
  return pages <= 2 ? 120 : 180;
}

/** "15 s", "1 min", "2 min", for the site. */
export function formatLength(seconds: VideoLength): string {
  return seconds < 60 ? `${seconds} s` : `${seconds / 60} min`;
}
