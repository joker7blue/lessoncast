// The quiz at the end of the video, as the voice reads it: an intro, then each question with its three
// choices, a three-second countdown, and the right answer. The screen shows the letters A, B and C; the
// voice says them as words, since MMS-TTS reads a lone letter as a bare sound.

import { type Language, type Lesson, say } from "./schema";

export const COUNTDOWN_SECONDS = 3;
export const QUIZ_LETTERS = ["A", "B", "C"] as const;

type Copy = { title: string; subtitle: string; intro: string; leads: string[]; letters: string[]; answerIntro: string };

// The quiz's words for scripts from before Muse Spark wrote them in the lesson's language (videoText).
const FIXED: Partial<Record<Language, Copy>> = {
  fr: {
    title: "Petit quiz",
    subtitle: "Trois questions",
    intro: "Petit quiz ! Trois questions pour voir si tu as bien compris.",
    leads: ["Question un.", "Question deux.", "Question trois."],
    letters: ["a", "bé", "cé"],
    answerIntro: "La bonne réponse est",
  },
  pcm: {
    title: "Small quiz",
    subtitle: "Three question dem",
    intro: "Small quiz! Three question dem to check say you don understand.",
    leads: ["Question one.", "Question two.", "Question three."],
    letters: ["ey", "bi", "si"],
    answerIntro: "Di correct answer na",
  },
  en: {
    title: "Quick quiz",
    subtitle: "Three questions",
    intro: "Quick quiz! Three questions to check what you learned.",
    leads: ["Question one.", "Question two.", "Question three."],
    letters: ["ay", "bee", "see"],
    answerIntro: "The right answer is",
  },
};

function copyFor(lesson: Lesson, language: Language): Copy {
  const text = lesson.videoText;
  if (text) {
    return {
      title: text.quizTitle,
      subtitle: text.quizSubtitle,
      intro: text.quizIntro,
      leads: text.questionLeads,
      letters: text.letterNames,
      answerIntro: text.answerIntro,
    };
  }
  return FIXED[language] ?? FIXED.en!;
}

const ended = (text: string) => /[.!?…]$/.test(text.trim());

/** Ends the text with a full stop unless it already ends a sentence. */
const sentence = (text: string) => (ended(text) ? text.trim() : `${text.trim()}.`);

/** The question as shown and read: with its question mark, French spacing in French. */
export function asQuestion(text: string, language: Language): string {
  return ended(text) ? text.trim() : `${text.trim()}${language === "fr" ? " ?" : "?"}`;
}

export type SpokenQuestion = {
  /** What the voice reads, in order: the lead, the question, then each choice. */
  pieces: string[];
  answer: string;
};

/** The quiz as the voice reads it, with its first `count` questions (shorter videos ask fewer). */
export function quizScript(
  lesson: Lesson,
  language: Language,
  count = lesson.quiz.length,
): { title: string; subtitle: string; intro: string; questions: SpokenQuestion[] } {
  const copy = copyFor(lesson, language);
  return {
    title: copy.title,
    subtitle: copy.subtitle,
    intro: copy.intro,
    questions: lesson.quiz.slice(0, count).map((q, i) => ({
      pieces: [
        sentence(copy.leads[i] ?? `${i + 1}.`),
        asQuestion(say(q.question, language), language),
        ...q.choices.map((choice, c) => sentence(`${copy.letters[c]}, ${say(choice, language)}`)),
      ],
      answer: sentence(`${copy.answerIntro} ${copy.letters[q.answerIndex]}, ${say(q.choices[q.answerIndex]!, language)}`),
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
