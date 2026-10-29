// How long a video lasts, chosen by the teacher, and what that means for the script: the number of scenes,
// the words in each narration, and how many quiz questions fit. The voices read about 2.7 words a second
// (330 words in 122 s on a real lesson); the title and end cards take about 5 s, a quiz question about 15.

import { z } from "zod";

export const LENGTHS = [15, 30, 60, 120, 180] as const;
export const VideoLength = z.literal(LENGTHS);
export type VideoLength = z.infer<typeof VideoLength>;

const WORDS_PER_SECOND = 2.7;
const CARDS_SECONDS = 5;
const QUIZ_INTRO_SECONDS = 4;
const QUIZ_QUESTION_SECONDS = 15;
const SECONDS_PER_SCENE = 16;
const MAX_SCENES = 8;

export function quizQuestionsFor(seconds: number): number {
  return seconds <= 30 ? 0 : seconds <= 60 ? 1 : 3;
}

export function lengthPlan(seconds: number): { scenes: number; wordsPerScene: number; quizQuestions: number } {
  const quizQuestions = quizQuestionsFor(seconds);
  const quizSeconds = quizQuestions ? QUIZ_INTRO_SECONDS + quizQuestions * QUIZ_QUESTION_SECONDS : 0;
  const lessonSeconds = Math.max(8, seconds - CARDS_SECONDS - quizSeconds);
  const scenes = Math.min(MAX_SCENES, Math.max(1, Math.round(lessonSeconds / SECONDS_PER_SCENE)));
  return { scenes, wordsPerScene: Math.round((lessonSeconds * WORDS_PER_SECOND) / scenes), quizQuestions };
}

/** The length offered first: one or two pages make a 2-minute lesson, more pages a 3-minute one. */
export function defaultLength(pages: number): VideoLength {
  return pages <= 2 ? 120 : 180;
}

/** "15 s", "1 min", "2 min", for the site. */
export function formatLength(seconds: VideoLength): string {
  return seconds < 60 ? `${seconds} s` : `${seconds / 60} min`;
}
