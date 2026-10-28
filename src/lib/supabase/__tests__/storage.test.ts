import { expect, test } from "vitest";
import { bookPaths, lessonPaths } from "../storage";

test("each lesson keeps its files in its own folder", () => {
  expect(lessonPaths.page("abc", 2)).toBe("abc/pages/2.jpg");
  expect(lessonPaths.scene("abc", 3)).toBe("abc/scenes/3.jpg");
  expect(lessonPaths.voice("abc")).toBe("abc/voice.wav");
  expect(lessonPaths.video("abc")).toBe("abc/video.mp4");
  expect(lessonPaths.highlights("abc")).toBe("abc/highlights.json");
});

test("a book keeps its PDF and slices under books/", () => {
  expect(bookPaths.pdf("abc")).toBe("books/abc/book.pdf");
  expect(bookPaths.slice("abc", 31, 60)).toBe("books/abc/slices/31-60.pdf");
});
