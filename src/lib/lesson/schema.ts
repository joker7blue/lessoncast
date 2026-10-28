// The lesson Muse Spark writes from one to four textbook page photos. Its JSON Schema is sent as strict
// structured output, so every field here is required and every object closed.

import { z } from "zod";
import { ArtStyle } from "./styles";

export const Language = z.enum(["fr", "pcm"]);
export type Language = z.infer<typeof Language>;

const Bilingual = z.object({
  fr: z.string().describe("French"),
  pcm: z.string().describe("Cameroonian Pidgin English (Kamtok)"),
});

const Highlight = z.object({
  samPrompt: z
    .string()
    .describe('Short English noun phrase naming one object drawn in the scene image, for a segmentation model, e.g. "heart"'),
  fr: z.string().describe("The exact word or phrase of the French narration that names this object"),
  pcm: z.string().describe("The exact word or phrase of the Pidgin narration that names this object"),
});

const Scene = z.object({
  title: Bilingual,
  narration: Bilingual.describe("What the voice says during this scene: 3 to 4 short sentences, 40 to 50 words in French"),
  imagePrompt: z.string().describe("English description of the scene illustration, without the art style"),
  highlights: z.array(Highlight).min(1).max(3),
});

const QuizQuestion = z.object({
  question: Bilingual,
  choices: z.array(Bilingual).length(3),
  answerIndex: z.int().min(0).max(2),
});

export const Lesson = z.object({
  page: z.object({
    isTextbookPage: z.boolean().describe("false when any photo is not a readable textbook page"),
    subject: z.string(),
    level: z.string().describe("School level printed on or implied by the page, e.g. CM1, 6e, Form 1"),
    topic: z.string(),
    keyText: z.string().describe("The page's title and main definitions, copied as printed"),
  }),
  title: Bilingual,
  style: ArtStyle.describe("The image style of the lesson, as the user message asks"),
  visualNotes: z
    .string()
    .describe(
      "English description of the recurring characters (age, look, clothes), places and objects shared by every image, without any art style",
    ),
  scenes: z.array(Scene).min(5).max(8),
  quiz: z.array(QuizQuestion).length(3),
});
export type Lesson = z.infer<typeof Lesson>;

/** JSON Schema for the API's structured output, without the `$schema` key. */
export function lessonJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(Lesson) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}
