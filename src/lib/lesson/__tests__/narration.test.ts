import { describe, expect, test } from "vitest";
import { makeLesson } from "../lesson.fixture";
import { narrationGroups, narrationPlan, splitSentences } from "../narration";

describe("splitSentences", () => {
  test("keeps the punctuation and drops empty pieces", () => {
    expect(splitSentences("Le cœur bat. Il pompe le sang !  ")).toEqual(["Le cœur bat.", "Il pompe le sang !"]);
  });

  test("splits after ? and ! even with French spacing", () => {
    expect(splitSentences("Tu vois ? Oui ! Bien.")).toEqual(["Tu vois ?", "Oui !", "Bien."]);
  });

  test("a text without final punctuation is one sentence", () => {
    expect(splitSentences("Heart na pump")).toEqual(["Heart na pump"]);
  });
});

describe("narrationGroups", () => {
  test("title first, then one group per scene, in the chosen language, then the quiz", () => {
    const lesson = makeLesson(6);
    const groups = narrationGroups(lesson, "pcm");
    expect(groups[0]).toEqual([lesson.title.pcm]);
    // The quiz: its intro, then three questions each followed by its answer.
    expect(groups).toHaveLength(lesson.scenes.length + 1 + 7);
    expect(groups[1]).toEqual(splitSentences(lesson.scenes[0]!.narration.pcm!));
  });

  test("French uses the French narration", () => {
    const lesson = makeLesson(5);
    expect(narrationGroups(lesson, "fr")[2]).toEqual(splitSentences(lesson.scenes[1]!.narration.fr!));
  });
});

describe("narrationPlan for a shorter video", () => {
  test("a video too short for a quiz reads only the title and the scenes", () => {
    const lesson = makeLesson(2);
    expect(narrationPlan(lesson, "fr", 0).groups).toHaveLength(1 + 2);
  });

  test("a one-question quiz reads its intro, one question and its answer", () => {
    const lesson = makeLesson(2);
    const { groups, pauses } = narrationPlan(lesson, "fr", 1);
    expect(groups).toHaveLength(1 + 2 + 3);
    expect(pauses.filter((p) => p !== null)).toHaveLength(1);
  });
});
