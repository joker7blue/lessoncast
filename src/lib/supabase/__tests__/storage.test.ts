import { expect, test } from "vitest";
import { lessonPaths } from "../storage";

test("each lesson keeps its files in its own folder", () => {
  expect(lessonPaths.page("abc", 2)).toBe("abc/pages/2.jpg");
  expect(lessonPaths.scene("abc", 3)).toBe("abc/scenes/3.jpg");
  expect(lessonPaths.voice("abc")).toBe("abc/voice.wav");
  expect(lessonPaths.video("abc")).toBe("abc/video.mp4");
});
