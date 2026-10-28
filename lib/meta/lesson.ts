// Muse Spark reads the textbook page photo and writes the lesson (strict structured output).

import { Lesson, lessonJsonSchema } from "../lesson/schema";
import { postJson } from "./client";
import { type SparkUsage, sparkCostUsd } from "./prices";

const MODEL = "muse-spark-1.3";

export const LESSON_INSTRUCTIONS = `You turn one photographed page of a Cameroonian school textbook into the script of a short narrated, illustrated video lesson for children. Parents will replay it at home in the evening, so it must be clear when heard without the page.

Rules:
- First decide page.isTextbookPage: true only for a readable page of a school textbook or exercise book. For anything else (a selfie, a blurred or partial photo, a screen, an object), set it to false and keep every other field as short as the schema allows.
- Read the page carefully. Teach only what the page teaches, and do not invent facts. Copy its title and main definitions into page.keyText as printed.
- Write 7 scenes (between 5 and 8 only if the page clearly needs it). Each narration is 3 to 4 short sentences, 40–50 words in French. The whole lesson should last about 2 minutes when read aloud.
- narration.fr: simple French for children aged 8 to 12.
- narration.pcm: the same content in Cameroonian Pidgin English (Kamtok), the way a parent in Douala or Bamenda would explain it at home, spelled in plain Latin letters as it sounds. Do not translate word for word.
- A text-to-speech voice reads the titles, the narrations and the quiz: never write digits or symbols in them (write numbers and units in words), and avoid abbreviations, parentheses and lists.
- imagePrompt (English): one illustration for the scene, which must show clearly every highlight object of the scene; describe subject, setting and composition. Show Cameroonian children and places when people or places appear. Never ask for text, letters, labels or numbers in the image. Leave the art style out: it goes in artStyle.
- artStyle (English): a single art style for every image of the lesson (medium, palette, line quality, lighting), friendly for children.
- highlights: 1 to 3 objects per scene that the narration names. samPrompt is a short English noun phrase for one concrete, visible object ("heart", "river", "red blood cell"), never a group, a place or an idea. fr and pcm copy the exact word or phrase used in each narration.
- quiz: 3 multiple-choice questions on the lesson, 3 choices each. answerIndex is the index of the correct choice; vary its position.`;

type ChatCompletion = {
  choices: { message: { content: string | null; refusal?: string | null }; finish_reason: string }[];
  usage?: SparkUsage;
};

export async function writeLesson(photoUrl: string): Promise<{ lesson: Lesson; seconds: number; costUsd: number }> {
  const start = performance.now();
  const res = await postJson("/chat/completions", {
    model: MODEL,
    reasoning_effort: "medium",
    messages: [
      { role: "system", content: LESSON_INSTRUCTIONS },
      {
        role: "user",
        content: [
          { type: "text", text: "Here is the textbook page. Write the lesson." },
          { type: "image_url", image_url: { url: photoUrl } },
        ],
      },
    ],
    response_format: { type: "json_schema", json_schema: { name: "Lesson", strict: true, schema: lessonJsonSchema() } },
  });
  const completion = (await res.json()) as ChatCompletion;
  const choice = completion.choices[0];
  if (!choice?.message.content) {
    throw new Error(`Muse Spark returned no lesson (finish_reason=${choice?.finish_reason}, refusal=${choice?.message.refusal})`);
  }
  const lesson = Lesson.parse(JSON.parse(choice.message.content));
  return { lesson, seconds: (performance.now() - start) / 1000, costUsd: sparkCostUsd(completion.usage) };
}
