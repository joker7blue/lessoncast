// What the voice reads, as ordered groups: the title, then one group per scene, then the quiz (its
// intro, then each question and its answer). The voice service times every word with its group, which
// gives the title card, scene and quiz boundaries in the video.

import { COUNTDOWN_SECONDS, quizScript } from "./quiz";
import type { Language, Lesson } from "./schema";

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** The groups, and for each one the silence after it when it isn't the usual one: the countdown after a question. */
export type NarrationPlan = { groups: string[][]; pauses: (number | null)[] };

export function narrationPlan(lesson: Lesson, language: Language): NarrationPlan {
  const quiz = quizScript(lesson, language);
  const lessonGroups = [[lesson.title[language]], ...lesson.scenes.map((scene) => splitSentences(scene.narration[language]))];
  const quizGroups = [
    { sentences: splitSentences(quiz.intro), pause: null },
    ...quiz.questions.flatMap((q) => [
      { sentences: q.pieces.flatMap(splitSentences), pause: COUNTDOWN_SECONDS },
      { sentences: splitSentences(q.answer), pause: null },
    ]),
  ];
  return {
    groups: [...lessonGroups, ...quizGroups.map((g) => g.sentences)],
    pauses: [...lessonGroups.map(() => null), ...quizGroups.map((g) => g.pause)],
  };
}

export function narrationGroups(lesson: Lesson, language: Language): string[][] {
  return narrationPlan(lesson, language).groups;
}
