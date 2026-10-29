// The lesson Muse Spark writes from the pages of one lesson. Its JSON Schema is sent as strict structured
// output, so every field there is required and every object closed. A new script is written in its
// video's language only (lessonSchemaFor); scripts from before hold French and Pidgin, and Lesson reads both.

import { z } from "zod";
import { LANGUAGE_CODES, LANGUAGES } from "./languages";
import { ArtStyle } from "./styles";

/** A lesson is made from 1 to MAX_PAGES page photos. */
export const MAX_PAGES = 4;

export const Language = z.enum(LANGUAGE_CODES);
export type Language = z.infer<typeof Language>;

/** A text in the languages the script was written in. */
const Localized = z.partialRecord(Language, z.string());
export type Localized = z.infer<typeof Localized>;

/** The text in `language`; a script holds the language of its own video, so the fallback is a safety net. */
export function say(text: Localized, language: Language): string {
  return text[language] ?? Object.values(text).find(Boolean) ?? "";
}

/** The words the video says and shows around the quiz and at the end, in the lesson's language. */
const VideoText = z.object({
  quizTitle: z.string().describe('The quiz card\'s title, two or three words, like "Petit quiz" in French'),
  quizSubtitle: z.string().describe('Under the title, like "Trois questions" in French'),
  quizIntro: z.string().describe('The sentence the voice says before the quiz, like "Petit quiz ! Trois questions pour voir si tu as bien compris." in French'),
  questionLeads: z.array(z.string()).length(3).describe('What the voice says before each question, like "Question un.", "Question deux.", "Question trois." in French'),
  letterNames: z
    .array(z.string())
    .length(3)
    .describe('How the letters A, B and C are said aloud in this language, written as words the voice can read, like "a", "bé", "cé" in French'),
  answerIntro: z.string().describe('The words the voice says before the right answer, like "La bonne réponse est" in French'),
  endCard: z.string().describe('The last words on screen, asking the child to watch again with their parents, like "Revois cette leçon ce soir avec tes parents" in French'),
});
export type VideoText = z.infer<typeof VideoText>;

function lessonSchema<T extends z.ZodType<Localized>, P extends z.ZodRawShape, V extends z.ZodType<VideoText | undefined>>(text: T, phrase: P, videoText: V) {
  const Highlight = z.object({
    samPrompt: z
      .string()
      .describe('Short English noun phrase naming one object drawn in the scene image, for a segmentation model, e.g. "heart"'),
    ...phrase,
  });
  const Scene = z.object({
    title: text,
    narration: text.describe("What the voice says during this scene, as long as the request asks"),
    imagePrompt: z.string().describe("English description of the scene illustration, without the art style"),
    highlights: z.array(Highlight).min(1).max(3),
  });
  const QuizQuestion = z.object({
    question: text,
    choices: z.array(text).length(3),
    answerIndex: z.int().min(0).max(2),
  });
  return z.object({
    page: z.object({
      isTextbookPage: z.boolean().describe("false when any page is not a readable page of a textbook"),
      subject: z.string(),
      level: z.string().describe("School level printed on or implied by the page, e.g. CM1, 6e, Form 1"),
      topic: z.string(),
      keyText: z.string().describe("The page's title and main definitions, copied as printed"),
    }),
    title: text,
    style: ArtStyle.describe("The image style of the lesson, as the user message asks"),
    visualNotes: z
      .string()
      .describe(
        "English description of the recurring characters (age, look, clothes), places and objects shared by every image, without any art style",
      ),
    scenes: z.array(Scene).min(1).max(8),
    quiz: z.array(QuizQuestion).length(3),
    videoText,
  });
}

/** A highlight's phrase, in each language the script was written in. */
const phrases = Object.fromEntries(LANGUAGE_CODES.map((l) => [l, z.string().optional()])) as { [L in Language]: z.ZodOptional<z.ZodString> };

/** Any stored script: the texts in the languages it was written in, and videoText from multi-language scripts on. */
export const Lesson = lessonSchema(Localized, phrases, VideoText.optional());
export type Lesson = z.infer<typeof Lesson>;

/** The script Muse Spark writes for a video in `language`: every text in that language, and nothing else. */
export function lessonSchemaFor(language: Language) {
  const name = LANGUAGES[language].label;
  return lessonSchema(
    z.object({ [language]: z.string().describe(name) }) as unknown as z.ZodType<Localized>,
    { [language]: z.string().describe(`The exact word or phrase of the ${name} narration that names this object`) },
    VideoText,
  );
}

/** JSON Schema for the API's structured output, without the `$schema` key. */
export function lessonJsonSchema(language: Language): Record<string, unknown> {
  const schema = z.toJSONSchema(lessonSchemaFor(language)) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}
