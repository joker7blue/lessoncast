import { describe, expect, test } from "vitest";
import { makeLesson } from "./lesson.fixture";
import { narrationGroups, splitSentences } from "./narration";

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
  test("title first, then one group per scene, in the chosen language", () => {
    const lesson = makeLesson(6);
    const groups = narrationGroups(lesson, "pcm");
    expect(groups[0]).toEqual([lesson.title.pcm]);
    expect(groups).toHaveLength(lesson.scenes.length + 1);
    expect(groups[1]).toEqual(splitSentences(lesson.scenes[0]!.narration.pcm));
  });

  test("French uses the French narration", () => {
    const lesson = makeLesson(5);
    expect(narrationGroups(lesson, "fr")[2]).toEqual(splitSentences(lesson.scenes[1]!.narration.fr));
  });
});
