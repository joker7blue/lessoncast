// The video's length and quiz as a request sends them: both optional, the quiz checked against what the
// length leaves room for in the video's language.

import { LANGUAGES } from "../lesson/languages";
import { maxQuizQuestions, QuizQuestions, quizQuestionsFor, type VideoLength } from "../lesson/length";
import type { Language } from "../lesson/schema";

export type QuizChoice = { ok: true; quizQuestions: number } | { ok: false; error: string };

/** `raw` is what the request sent for the quiz (undefined when it sent none: the quiz that fits the length). */
export function quizChoice(raw: unknown, length: VideoLength, language: Language): QuizChoice {
  const pace = LANGUAGES[language].wordsPerSecond;
  if (raw === undefined || raw === null) return { ok: true, quizQuestions: quizQuestionsFor(length, pace) };
  const parsed = QuizQuestions.safeParse(typeof raw === "string" ? Number(raw) : raw);
  if (!parsed.success) return { ok: false, error: "Choose from none to five quiz questions." };
  const max = maxQuizQuestions(length, pace);
  if (parsed.data > max) {
    return { ok: false, error: max === 0 ? "This video is too short for a quiz." : `This video has room for ${max} quiz question${max > 1 ? "s" : ""} at most.` };
  }
  return { ok: true, quizQuestions: parsed.data };
}
