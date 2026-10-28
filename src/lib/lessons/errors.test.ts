import { expect, test } from "vitest";
import { NotATextbookPageError, teacherMessage } from "./errors";

test("not a textbook page", () => {
  expect(teacherMessage("write-script", new NotATextbookPageError())).toBe(
    "A photo doesn't look like a textbook page. Take a sharp photo of each whole page.",
  );
});

test("any other failure names the step in plain words", () => {
  expect(teacherMessage("draw-scenes", new Error("x"))).toBe("The pictures couldn't be drawn. Try again in a few minutes.");
  expect(teacherMessage("narrate", new Error("x"))).toBe("The voice couldn't be recorded. Try again in a few minutes.");
  expect(teacherMessage("render-video", new Error("x"))).toBe("Putting the video together failed. Try again in a few minutes.");
  expect(teacherMessage("write-script", new Error("x"))).toBe("Reading the pages failed. Try again in a few minutes.");
});
