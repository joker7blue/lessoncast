import { expect, test } from "vitest";
import { NotATextbookPageError, teacherMessage } from "./errors";

test("not a textbook page", () => {
  expect(teacherMessage("write-script", new NotATextbookPageError())).toBe(
    "Une photo ne ressemble pas à une page de manuel. Reprenez une photo nette de chaque page, en entier.",
  );
});

test("any other failure names the step in plain French", () => {
  expect(teacherMessage("draw-scenes", new Error("x"))).toBe("Les illustrations n'ont pas pu être créées. Réessayez dans quelques minutes.");
  expect(teacherMessage("narrate", new Error("x"))).toBe("La voix n'a pas pu être enregistrée. Réessayez dans quelques minutes.");
  expect(teacherMessage("render-video", new Error("x"))).toBe("Le montage de la vidéo a échoué. Réessayez dans quelques minutes.");
  expect(teacherMessage("write-script", new Error("x"))).toBe("La lecture des pages a échoué. Réessayez dans quelques minutes.");
});
