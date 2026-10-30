// How long a video lasts, chosen by the teacher, and what that means for the script: the number of scenes,
// the words in each narration, and how many quiz questions fit. Each language's voice has its own pace
// (lib/lesson/languages.ts: 2.6 words a second in Pidgin, 1.9 in Swahili), and the quiz is read aloud at
// that pace too. Measured on real videos: the title and end cards take about 7 s, the quiz's intro 7 s, and
// a question 5.5 s of countdown and pauses besides its words.

import { z } from "zod";

export const LENGTHS = [15, 30, 60, 120, 180] as const;
export const VideoLength = z.literal(LENGTHS);
export type VideoLength = z.infer<typeof VideoLength>;

const WORDS_PER_SECOND = 2.6; // Pidgin's pace, when the language's own isn't given
const CARDS_SECONDS = 7;
const QUIZ_INTRO_SECONDS = 7;
const QUIZ_PAUSES_SECONDS = 5.5;
// The words read for one question: its lead, the question and its three choices, then the answer.
const QUIZ_WORDS = 30;
const MIN_LESSON_SECONDS = 10;
const SECONDS_PER_SCENE = 16;
const MAX_SCENES = 8;

export const MAX_QUIZ_QUESTIONS = 5;
export const QuizQuestions = z.int().min(0).max(MAX_QUIZ_QUESTIONS);

const questionSeconds = (wordsPerSecond: number) => QUIZ_PAUSES_SECONDS + QUIZ_WORDS / wordsPerSecond;
const quizSeconds = (questions: number, wordsPerSecond: number) => (questions ? QUIZ_INTRO_SECONDS + questions * questionSeconds(wordsPerSecond) : 0);

/** The most questions that fit in the video, leaving at least 10 s of lesson: fewer in a slower language. */
export function maxQuizQuestions(seconds: number, wordsPerSecond = WORDS_PER_SECOND): number {
  const room = seconds - CARDS_SECONDS - MIN_LESSON_SECONDS - QUIZ_INTRO_SECONDS;
  return Math.min(MAX_QUIZ_QUESTIONS, Math.max(0, Math.floor(room / questionSeconds(wordsPerSecond))));
}

/** The quiz offered first: none up to 30 s, one question at a minute, three beyond, as far as they fit. */
export function quizQuestionsFor(seconds: number, wordsPerSecond = WORDS_PER_SECOND): number {
  return Math.min(seconds <= 30 ? 0 : seconds <= 60 ? 1 : 3, maxQuizQuestions(seconds, wordsPerSecond));
}

/** How long a video lasts with `words` of narration and `quizQuestions` quiz questions, read at `wordsPerSecond`. */
export function videoSeconds(words: number, quizQuestions: number, wordsPerSecond = WORDS_PER_SECOND): number {
  return CARDS_SECONDS + words / wordsPerSecond + quizSeconds(quizQuestions, wordsPerSecond);
}

/** The scenes and words that fill `seconds` once the quiz the teacher chose has taken its part. */
export function lengthPlan(
  seconds: number,
  wordsPerSecond = WORDS_PER_SECOND,
  quizQuestions = quizQuestionsFor(seconds, wordsPerSecond),
): { scenes: number; wordsPerScene: number; quizQuestions: number } {
  const lessonSeconds = Math.max(8, seconds - CARDS_SECONDS - quizSeconds(quizQuestions, wordsPerSecond));
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
