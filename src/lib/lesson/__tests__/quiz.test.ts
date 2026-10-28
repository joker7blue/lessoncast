import { describe, expect, test } from "vitest";
import { makeLesson } from "../lesson.fixture";
import { narrationGroups, narrationPlan, splitSentences } from "../narration";
import { COUNTDOWN_SECONDS, quizGroups, quizScript, QUIZ_LETTERS } from "../quiz";

describe("quizScript", () => {
  test("reads each question with its lead, then its three choices by letter", () => {
    const lesson = makeLesson(6);
    const { questions } = quizScript(lesson, "fr");
    expect(questions).toHaveLength(3);
    expect(questions[0]!.pieces).toEqual(["Question un.", "Question 1 ?", "a, Oui.", "bé, Non.", "cé, Peut-être."]);
    expect(questions[2]!.pieces[0]).toBe("Question trois.");
  });

  test("reads the right answer with its letter", () => {
    const lesson = makeLesson(6);
    lesson.quiz[1]!.answerIndex = 2;
    expect(quizScript(lesson, "fr").questions[1]!.answer).toBe("La bonne réponse est cé, Peut-être.");
    expect(quizScript(lesson, "pcm").questions[1]!.answer).toBe("Di correct answer na si, Maybe.");
  });

  test("speaks Pidgin in Pidgin", () => {
    const { title, intro, questions } = quizScript(makeLesson(6), "pcm");
    expect(title).toBe("Small quiz");
    expect(intro).toMatch(/^Small quiz!/);
    expect(questions[0]!.pieces.slice(0, 3)).toEqual(["Question one.", "Question 1?", "ey, Yes."]);
  });

  test("shows the letters A, B and C", () => {
    expect(QUIZ_LETTERS).toEqual(["A", "B", "C"]);
  });
});

describe("narrationPlan", () => {
  test("after the scenes: the quiz intro, then each question and its answer", () => {
    const lesson = makeLesson(6);
    const { groups } = narrationPlan(lesson, "fr");
    const g = quizGroups(lesson.scenes.length);
    expect(groups).toHaveLength(1 + 6 + 1 + 6);
    expect(groups[g.intro]).toEqual(splitSentences(quizScript(lesson, "fr").intro));
    expect(groups[g.question(0)]).toEqual(quizScript(lesson, "fr").questions[0]!.pieces);
    expect(groups[g.answer(2)]).toEqual([quizScript(lesson, "fr").questions[2]!.answer]);
  });

  test("leaves a three-second countdown after each question, and the usual pause elsewhere", () => {
    const lesson = makeLesson(6);
    const { pauses } = narrationPlan(lesson, "pcm");
    const g = quizGroups(6);
    expect(pauses.map((p, i) => [i, p]).filter(([, p]) => p !== null)).toEqual([0, 1, 2].map((q) => [g.question(q), COUNTDOWN_SECONDS]));
  });

  test("narrationGroups are the plan's groups", () => {
    const lesson = makeLesson(5);
    expect(narrationGroups(lesson, "fr")).toEqual(narrationPlan(lesson, "fr").groups);
  });
});
