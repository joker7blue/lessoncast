import { describe, expect, test } from "vitest";
import { makeLesson } from "./lesson.fixture";
import { Lesson, lessonJsonSchema } from "./schema";

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
    const schema = lessonJsonSchema();
    expect(schema).not.toHaveProperty("$schema");
    const objects = objectNodes(schema);
    expect(objects.length).toBeGreaterThan(5);
    for (const obj of objects) {
      expect(obj.additionalProperties).toBe(false);
      expect([...(obj.required as string[])].sort()).toEqual(Object.keys(obj.properties as object).sort());
    }
  });

  test("asks Muse Spark whether the photo is a textbook page", () => {
    const page = (lessonJsonSchema().properties as Record<string, JsonNode>).page;
    expect((page.properties as Record<string, JsonNode>).isTextbookPage.type).toBe("boolean");
  });
});

describe("Lesson", () => {
  test("accepts a lesson with page.isTextbookPage and 6 scenes", () => {
    expect(Lesson.safeParse(makeLesson(6)).success).toBe(true);
  });

  test("rejects 4 scenes and 9 scenes", () => {
    expect(Lesson.safeParse(makeLesson(4)).success).toBe(false);
    expect(Lesson.safeParse(makeLesson(9)).success).toBe(false);
  });

  test("accepts 5 and 8 scenes", () => {
    expect(Lesson.safeParse(makeLesson(5)).success).toBe(true);
    expect(Lesson.safeParse(makeLesson(8)).success).toBe(true);
  });
});
