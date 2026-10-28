// Test helper: a valid lesson in the shape Muse Spark returns, with as many scenes as needed.

import type { Lesson } from "./schema";

const both = (fr: string, pcm: string) => ({ fr, pcm });

export function makeLesson(sceneCount = 6): Lesson {
  return {
    page: {
      isTextbookPage: true,
      subject: "Sciences",
      level: "CM1",
      topic: "Le cœur",
      keyText: "Le cœur est un muscle qui pompe le sang.",
    },
    title: both("Le cœur, une pompe", "Heart na pump"),
    style: "illustrated",
    visualNotes: "Amina, a nine-year-old Cameroonian girl with braided hair and a green school uniform, in a sunny classroom in Douala",
    scenes: Array.from({ length: sceneCount }, (_, i) => ({
      title: both(`Scène ${i + 1}`, `Scene ${i + 1}`),
      narration: both(
        `Le cœur bat dans la poitrine. Il envoie le sang partout, scène ${i + 1} !`,
        `Heart di knock for inside we chest. E di push blood go everywhere, scene ${i + 1}!`,
      ),
      imagePrompt: "A Cameroonian child pointing at a big red heart drawn on a chalkboard",
      highlights: [{ samPrompt: "heart", fr: "cœur", pcm: "Heart" }],
    })),
    quiz: Array.from({ length: 3 }, (_, i) => ({
      question: both(`Question ${i + 1} ?`, `Question ${i + 1}?`),
      choices: [both("Oui", "Yes"), both("Non", "No"), both("Peut-être", "Maybe")],
      answerIndex: 0,
    })),
  };
}
