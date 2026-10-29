import { describe, expect, test } from "vitest";
import { makeLesson, makeScript } from "../lesson.fixture";
import { narrationGroups, narrationPlan, splitSentences } from "../narration";
import { asQuestion, COUNTDOWN_SECONDS, quizGroups, quizScript, QUIZ_LETTERS } from "../quiz";

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

  test("asks a question even when Muse Spark left out its question mark", () => {
    expect(asQuestion("Qu'est-ce que le cœur", "fr")).toBe("Qu'est-ce que le cœur ?");
    expect(asQuestion("Wetin be heart", "pcm")).toBe("Wetin be heart?");
    expect(asQuestion("Où va le sang ?", "fr")).toBe("Où va le sang ?");
    const lesson = makeLesson(6);
    lesson.quiz[0]!.question.fr = "Que fait le cœur";
    expect(quizScript(lesson, "fr").questions[0]!.pieces[1]).toBe("Que fait le cœur ?");
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

describe("quizScript in any language", () => {
  test("uses the words Muse Spark wrote in the lesson's language", () => {
    const lesson = makeScript(4, "hau");
    lesson.videoText = {
      quizTitle: "Ƙaramin gwaji",
      quizSubtitle: "Tambayoyi uku",
      quizIntro: "Ƙaramin gwaji!",
      questionLeads: ["Tambaya ta ɗaya.", "Tambaya ta biyu.", "Tambaya ta uku."],
      letterNames: ["a", "bi", "si"],
      answerIntro: "Amsar daidai ita ce",
      endCard: "Sake kallon wannan darasi da iyayenka.",
    };
    lesson.quiz[0]!.answerIndex = 1;
    const { title, questions } = quizScript(lesson, "hau");
    expect(title).toBe("Ƙaramin gwaji");
    expect(questions[0]!.pieces[0]).toBe("Tambaya ta ɗaya.");
    expect(questions[0]!.pieces[3]).toMatch(/^bi, /);
    expect(questions[0]!.answer).toMatch(/^Amsar daidai ita ce bi, /);
  });

  test("asks only the first questions of a shorter video", () => {
    expect(quizScript(makeLesson(6), "fr", 1).questions).toHaveLength(1);
    expect(quizScript(makeLesson(6), "fr", 0).questions).toHaveLength(0);
  });
});
