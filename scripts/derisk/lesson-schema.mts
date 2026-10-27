// The lesson script Muse Spark writes from a textbook page photo (derisk test 1),
// read back by the image (test 2) and segmentation (test 3) scripts.

import { z } from "zod";

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
  narration: Bilingual.describe("What the voice says during this scene: 2 to 4 short sentences, about 30 words in French"),
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
    subject: z.string(),
    level: z.string().describe("School level printed on or implied by the page, e.g. CM1, 6e, Form 1"),
    topic: z.string(),
    keyText: z.string().describe("The page's title and main definitions, copied as printed"),
  }),
  title: Bilingual,
  artStyle: z.string().describe("One English art style description shared by every image of the lesson"),
  scenes: z.array(Scene).min(5).max(7),
  quiz: z.array(QuizQuestion).length(3),
});

export type Lesson = z.infer<typeof Lesson>;

/** JSON Schema for the API's structured output, without the `$schema` key. */
export function lessonJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(Lesson) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}
