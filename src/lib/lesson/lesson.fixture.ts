// Test helper: a valid lesson in the shape Muse Spark returns, with as many scenes as needed.

import type { Language, Lesson, Localized } from "./schema";

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

const VIDEO_TEXT_FR = {
  quizTitle: "Petit quiz",
  quizSubtitle: "Trois questions",
  quizIntro: "Petit quiz ! Trois questions pour voir si tu as bien compris.",
  questionLeads: ["Question un.", "Question deux.", "Question trois."],
  letterNames: ["a", "bé", "cé"],
  answerIntro: "La bonne réponse est",
  endCard: "Revois cette leçon ce soir avec tes parents",
};

/** The lesson as Muse Spark now writes it: every text in one language only, with the video's own words. */
export function makeScript(sceneCount = 6, language: Language = "fr"): Lesson {
  const lesson = makeLesson(sceneCount);
  const pick = (text: Localized): Localized => ({ [language]: text[language] ?? text.fr });
  return {
    ...lesson,
    title: pick(lesson.title),
    scenes: lesson.scenes.map((scene) => ({
      ...scene,
      title: pick(scene.title),
      narration: pick(scene.narration),
      highlights: scene.highlights.map((h) => ({ samPrompt: h.samPrompt, [language]: h[language] ?? h.fr })),
    })),
    quiz: lesson.quiz.map((q) => ({ ...q, question: pick(q.question), choices: q.choices.map(pick) })),
    videoText: VIDEO_TEXT_FR,
  };
}
