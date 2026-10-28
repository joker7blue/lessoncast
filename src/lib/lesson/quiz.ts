// The quiz at the end of the video, as the voice reads it: an intro, then each question with its three
// choices, a three-second countdown, and the right answer. The screen shows the letters A, B and C; the
// voice says them as words, since MMS-TTS reads a lone letter as a bare sound.

import type { Language, Lesson } from "./schema";

export const COUNTDOWN_SECONDS = 3;
export const QUIZ_LETTERS = ["A", "B", "C"] as const;

type Copy = { title: string; subtitle: string; intro: string; numbers: string[]; letters: string[]; lead(n: string): string; answer(letter: string, choice: string): string };

const COPY: Record<Language, Copy> = {
  fr: {
    title: "Petit quiz",
    subtitle: "Trois questions",
    intro: "Petit quiz ! Trois questions pour voir si tu as bien compris.",
    numbers: ["un", "deux", "trois"],
    letters: ["a", "bé", "cé"],
    lead: (n) => `Question ${n}.`,
    answer: (letter, choice) => `La bonne réponse est ${letter}, ${choice}`,
  },
  pcm: {
    title: "Small quiz",
    subtitle: "Three question dem",
    intro: "Small quiz! Three question dem to check say you don understand.",
    numbers: ["one", "two", "three"],
    letters: ["ey", "bi", "si"],
    lead: (n) => `Question ${n}.`,
    answer: (letter, choice) => `Di correct answer na ${letter}, ${choice}`,
  },
};

/** Ends the text with a full stop unless it already ends a sentence. */
const sentence = (text: string) => (/[.!?…]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);

export type SpokenQuestion = {
  /** What the voice reads, in order: the lead, the question, then each choice. */
  pieces: string[];
  answer: string;
};

export function quizScript(lesson: Lesson, language: Language): { title: string; subtitle: string; intro: string; questions: SpokenQuestion[] } {
  const copy = COPY[language];
  return {
    title: copy.title,
    subtitle: copy.subtitle,
    intro: copy.intro,
    questions: lesson.quiz.map((q, i) => ({
      pieces: [
        copy.lead(copy.numbers[i] ?? String(i + 1)),
        sentence(q.question[language]),
        ...q.choices.map((choice, c) => sentence(`${copy.letters[c]}, ${choice[language]}`)),
      ],
      answer: sentence(copy.answer(copy.letters[q.answerIndex]!, q.choices[q.answerIndex]![language])),
    })),
  };
}

/** The quiz's narration groups, after the title (group 0) and the scenes (groups 1 to sceneCount). */
export function quizGroups(sceneCount: number) {
  return {
    intro: sceneCount + 1,
    question: (q: number) => sceneCount + 2 + 2 * q,
    answer: (q: number) => sceneCount + 3 + 2 * q,
  };
}
