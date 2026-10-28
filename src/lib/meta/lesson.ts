// Muse Spark reads one to four textbook page photos and writes the lesson (strict structured output).

import { Lesson, lessonJsonSchema, MAX_PAGES } from "../lesson/schema";
import { ArtStyle, STYLES, type StyleChoice } from "../lesson/styles";
import { postJson } from "./client";
import { SPARK_MODEL } from "./models";
import { type SparkUsage, sparkCostUsd } from "./prices";

const MODEL = SPARK_MODEL;

export const LESSON_INSTRUCTIONS = `You turn one to four photographed pages of a Cameroonian school textbook, given in page order, into the script of one short narrated, illustrated video lesson for pupils. Parents and pupils will replay it at home in the evening, so it must be clear when heard without the book.

Rules:
- First decide page.isTextbookPage: true only when every photo is a readable page of a school textbook or exercise book. If any photo is something else (a selfie, a blurred or partial photo, a screen, an object), set it to false and keep every other field as short as the schema allows.
- Read every page carefully, in order, as one lesson. Teach only what the pages teach, and do not invent facts. Copy their title and main definitions into page.keyText as printed.
- Write 7 scenes (between 5 and 8 only if the pages clearly need it), however many pages there are: condense rather than lengthen. Each narration is 3 to 4 short sentences, 40–50 words in French. The whole lesson should last about 2 minutes when read aloud.
- narration.fr: French at the level of the pages. For nursery and primary school, simple words for children. For secondary school, the subject's exact vocabulary, still in short sentences made to be heard.
- narration.pcm: the same content in Cameroonian Pidgin English (Kamtok), the way a parent in Douala or Bamenda would explain it at home, spelled in plain Latin letters as it sounds. Do not translate word for word.
- A text-to-speech voice reads the titles, the narrations and the quiz: never write digits or symbols in them (write numbers and units in words), and avoid abbreviations, parentheses and lists.
- imagePrompt (English): one illustration for the scene, which must show clearly every highlight object of the scene; describe subject, setting and composition. Show Cameroonian people and places when people or places appear, with pupils of the age the pages are written for. Never ask for text, letters, labels or numbers in the image. Leave the art style out: it is set by style.
- visualNotes (English): the recurring characters (age, look, clothes), places and objects, described once so every image draws them the same way. No art style.
- highlights: 1 to 3 objects per scene that the narration names. samPrompt is a short English noun phrase for one concrete, visible object ("heart", "river", "red blood cell"), never a group, a place or an idea. fr and pcm copy the exact word or phrase used in each narration.
- quiz: 3 multiple-choice questions on the lesson, 3 choices each. answerIndex is the index of the correct choice; vary its position.`;

type ChatCompletion = {
  choices: { message: { content: string | null; refusal?: string | null }; finish_reason: string }[];
  usage?: SparkUsage;
};

function styleRequest(style: StyleChoice): string {
  if (style !== "auto") return `Use the image style "${style}".`;
  const rules = ArtStyle.options.map((key) => `${key}: ${STYLES[key].when}`).join("; ");
  return `Choose the image style from the level and the subject of the pages. ${rules}.`;
}

/** Writes the lesson from 1 to 4 page photos, in page order; a forced style always wins. */
export async function writeLesson(
  photoUrls: string[],
  style: StyleChoice,
): Promise<{ lesson: Lesson; seconds: number; costUsd: number }> {
  if (photoUrls.length < 1 || photoUrls.length > MAX_PAGES) {
    throw new RangeError(`A lesson takes 1 to ${MAX_PAGES} pages, got ${photoUrls.length}`);
  }
  const pages = photoUrls.length === 1 ? "Here is the page of the lesson." : `Here are the ${photoUrls.length} pages of the lesson, in order.`;
  const start = performance.now();
  const res = await postJson("/chat/completions", {
    model: MODEL,
    reasoning_effort: "medium",
    messages: [
      { role: "system", content: LESSON_INSTRUCTIONS },
      {
        role: "user",
        content: [
          { type: "text", text: `${pages} ${styleRequest(style)} Write the lesson.` },
          ...photoUrls.map((url) => ({ type: "image_url", image_url: { url } })),
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
  const parsed = Lesson.parse(JSON.parse(choice.message.content));
  const lesson = style === "auto" ? parsed : { ...parsed, style };
  return { lesson, seconds: (performance.now() - start) / 1000, costUsd: sparkCostUsd(completion.usage) };
}
