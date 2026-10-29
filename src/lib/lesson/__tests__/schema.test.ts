import { describe, expect, test } from "vitest";
import { makeLesson, makeScript } from "../lesson.fixture";
import { Lesson, lessonJsonSchema, lessonSchemaFor } from "../schema";

type JsonNode = { [key: string]: unknown };

function objectNodes(node: unknown, found: JsonNode[] = []): JsonNode[] {
  if (node && typeof node === "object") {
    const obj = node as JsonNode;
    if (obj.type === "object") found.push(obj);
    for (const value of Object.values(obj)) objectNodes(value, found);
  }
  return found;
}

describe("lessonJsonSchema", () => {
  test("fits the strict structured-output subset", () => {
    const schema = lessonJsonSchema("hau");
    expect(schema).not.toHaveProperty("$schema");
    const objects = objectNodes(schema);
    expect(objects.length).toBeGreaterThan(5);
    for (const obj of objects) {
      expect(obj.additionalProperties).toBe(false);
      expect([...(obj.required as string[])].sort()).toEqual(Object.keys(obj.properties as object).sort());
    }
  });

  test("asks Muse Spark whether the photo is a textbook page", () => {
    const page = (lessonJsonSchema("fr").properties as Record<string, JsonNode>).page;
    expect((page.properties as Record<string, JsonNode>).isTextbookPage.type).toBe("boolean");
  });
});

describe("Lesson", () => {
  test("accepts a lesson with page.isTextbookPage and 6 scenes", () => {
    expect(Lesson.safeParse(makeLesson(6)).success).toBe(true);
  });

  test("takes 1 to 8 scenes, for videos from 15 seconds to 3 minutes", () => {
    expect(Lesson.safeParse(makeLesson(1)).success).toBe(true);
    expect(Lesson.safeParse(makeLesson(0)).success).toBe(false);
    expect(Lesson.safeParse(makeLesson(9)).success).toBe(false);
  });

  test("reads a script in one language, and an older one in French and Pidgin", () => {
    expect(Lesson.safeParse(makeScript(4, "swh")).success).toBe(true);
    expect(Lesson.safeParse(makeLesson(6)).success).toBe(true);
  });

  test("a script for a language must hold that language", () => {
    expect(lessonSchemaFor("swh").safeParse(makeScript(4, "swh")).success).toBe(true);
    expect(lessonSchemaFor("fon").safeParse(makeScript(4, "swh")).success).toBe(false);
  });

  test("a lesson needs one of the four styles and its visual notes", () => {
    expect(Lesson.safeParse({ ...makeLesson(6), style: "watercolor" }).success).toBe(false);
    const withoutNotes: Partial<Lesson> = makeLesson(6);
    delete withoutNotes.visualNotes;
    expect(Lesson.safeParse(withoutNotes).success).toBe(false);
  });

  test("accepts 5 and 8 scenes", () => {
    expect(Lesson.safeParse(makeLesson(5)).success).toBe(true);
    expect(Lesson.safeParse(makeLesson(8)).success).toBe(true);
  });
});
