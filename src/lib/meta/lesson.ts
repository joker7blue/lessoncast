// Muse Spark reads the pages of one lesson and writes its script (strict structured output): one to four
// photographed pages, or the pages of a book lesson as a PDF.

import { z } from "zod";
import { MAX_LESSON_PAGES } from "../books/pdf";
import { LANGUAGES } from "../lesson/languages";
import { lengthPlan } from "../lesson/length";
import { type Language, Lesson, lessonJsonSchema, lessonSchemaFor, MAX_PAGES } from "../lesson/schema";
import { ArtStyle, STYLES, type StyleChoice } from "../lesson/styles";
import { postJson } from "./client";
import { SPARK_MODEL } from "./models";
import { type SparkUsage, sparkCostUsd } from "./prices";

const MODEL = SPARK_MODEL;
// Writing a lesson takes 40–55 s; past this, the step is retried.
const TIMEOUT_MS = 150_000;

export const LESSON_INSTRUCTIONS = `You turn the pages of one lesson of an African school textbook, photographed or from the book's PDF, given in page order, into the script of one short narrated, illustrated video lesson for pupils, in the language the request names: often the language the children speak at home rather than the language of the book. Parents and pupils will replay it at home in the evening, so it must be clear when heard without the book.

Rules:
- First decide page.isTextbookPage: true only when every page is a readable page of a school textbook, an educational ebook or an exercise book. If any page is something else (a selfie, a blurred or partial photo, a screen, an object), set it to false and keep every other field as short as the schema allows.
- Read every page carefully, in order, as one lesson. Teach only what the pages teach, and do not invent facts. Copy their title and main definitions into page.keyText as printed.
- Write exactly the number of scenes the request asks for, each narration about the number of words it asks for, however many pages there are: condense rather than lengthen. Each narration is short spoken sentences.
- Every text the voice says or the screen shows (titles, narrations, highlight phrases, the quiz and videoText) is in the request's language only, following the request's rule for that language. Do not translate the pages word for word: explain them. Keep the subject's key terms; when the language has no word for one, use the textbook's term and explain it.
- A text-to-speech voice reads the titles, the narrations, the quiz and videoText: never write digits or symbols in them (write numbers and units in words), and avoid abbreviations, parentheses and lists. Keep the normal spelling of the language, with its accents, tone marks, special letters and apostrophes (l'histoire, c'est, ɓ, ẹ, ɔ): they are not symbols.
- imagePrompt (English): one illustration for the scene, which must show clearly every highlight object of the scene; describe subject, setting and composition. Show Cameroonian people and places when people or places appear, with pupils of the age the pages are written for. Never ask for text, letters, labels or numbers in the image. Leave the art style out: it is set by style.
- visualNotes (English): the recurring characters (age, look, clothes), places and objects, described once so every image draws them the same way. No art style.
- highlights: 1 to 3 objects per scene that the narration names. samPrompt is a short English noun phrase for one concrete, visible object ("heart", "river", "red blood cell"), never a group, a place or an idea. The phrase copies the exact word or words of the narration that name it.
- quiz: 3 multiple-choice questions on the lesson, 3 choices each, read aloud and shown at the end of the video. Each question is a full question in the normal spelling of its language, ending with a question mark (Qu'est-ce que le cœur ?, Où va le sang ?). Choices are short. answerIndex is the index of the correct choice; vary its position.
- videoText: the few words the video says and shows around the quiz and at the end, written naturally in the request's language.`;

type ChatCompletion = {
  choices: { message: { content: string | null; refusal?: string | null }; finish_reason: string }[];
  usage?: SparkUsage;
};

function styleRequest(style: StyleChoice): string {
  if (style !== "auto") return `Use the image style "${style}".`;
  const rules = ArtStyle.options.map((key) => `${key}: ${STYLES[key].when}`).join("; ");
  return `Choose the image style from the level and the subject of the pages. ${rules}.`;
}

// Read first, alone: for a selfie the rest of the answer may be too thin to be a valid lesson.
const PageCheck = z.object({ page: z.object({ isTextbookPage: z.boolean() }) });

export type WrittenLesson = { seconds: number; costUsd: number } & ({ isTextbookPage: true; lesson: Lesson } | { isTextbookPage: false });

/** A lesson's pages: the teacher's photos (public URLs), or a book lesson's pages cut into one PDF. */
export type LessonPages = { photoUrls: string[] } | { pdf: Uint8Array; pageCount: number };

function pagesContent(source: LessonPages): { intro: string; parts: unknown[] } {
  if ("pdf" in source) {
    if (source.pageCount < 1 || source.pageCount > MAX_LESSON_PAGES) {
      throw new RangeError(`A book lesson takes 1 to ${MAX_LESSON_PAGES} pages, got ${source.pageCount}`);
    }
    const file_data = `data:application/pdf;base64,${Buffer.from(source.pdf).toString("base64")}`;
    return {
      intro: source.pageCount === 1 ? "Here is the page of the lesson, as a PDF." : `Here are the ${source.pageCount} pages of the lesson, as a PDF, in order.`,
      parts: [{ type: "file", file: { filename: "lesson.pdf", file_data } }],
    };
  }
  const { photoUrls } = source;
  if (photoUrls.length < 1 || photoUrls.length > MAX_PAGES) {
    throw new RangeError(`A lesson takes 1 to ${MAX_PAGES} pages, got ${photoUrls.length}`);
  }
  return {
    intro: photoUrls.length === 1 ? "Here is the page of the lesson." : `Here are the ${photoUrls.length} pages of the lesson, in order.`,
    parts: photoUrls.map((url) => ({ type: "image_url", image_url: { url } })),
  };
}

/** The language and the length the request asks for. */
function videoRequest(language: Language, seconds: number): string {
  const { scenes, wordsPerScene } = lengthPlan(seconds);
  const { label, writing } = LANGUAGES[language];
  const length = seconds < 60 ? `${seconds} seconds` : `${seconds / 60} minute${seconds > 60 ? "s" : ""}`;
  return `Write the lesson in ${label}: ${writing} The video lasts about ${length}: write ${scenes} scene${scenes > 1 ? "s" : ""}, each narration about ${wordsPerScene} words.`;
}

// A script from before the teacher chose the length lasted about three minutes.
const DEFAULT_SECONDS = 180;

/** Writes the lesson from its pages, in page order, in `language`, for a video of about `seconds`; a forced style always wins. */
export async function writeLesson(source: LessonPages, style: StyleChoice, language: Language, seconds: number = DEFAULT_SECONDS): Promise<WrittenLesson> {
  const { intro, parts } = pagesContent(source);
  const start = performance.now();
  const res = await postJson("/chat/completions", {
    model: MODEL,
    reasoning_effort: "medium",
    messages: [
      { role: "system", content: LESSON_INSTRUCTIONS },
      {
        role: "user",
        content: [
          { type: "text", text: `${intro} ${videoRequest(language, seconds)} ${styleRequest(style)} Write the lesson.` },
          ...parts,
        ],
      },
    ],
    response_format: { type: "json_schema", json_schema: { name: "Lesson", strict: true, schema: lessonJsonSchema(language) } },
  }, { timeoutMs: TIMEOUT_MS });
  const completion = (await res.json()) as ChatCompletion;
  const choice = completion.choices[0];
  if (!choice?.message.content) {
    throw new Error(`Muse Spark returned no lesson (finish_reason=${choice?.finish_reason}, refusal=${choice?.message.refusal})`);
  }
  const cost = { seconds: (performance.now() - start) / 1000, costUsd: sparkCostUsd(completion.usage) };
  const answer: unknown = JSON.parse(choice.message.content);
  const check = PageCheck.safeParse(answer);
  if (check.success && !check.data.page.isTextbookPage) return { ...cost, isTextbookPage: false };
  // Every text in the video's language: checked with that language's schema, then read as any script.
  const parsed = Lesson.parse(lessonSchemaFor(language).parse(answer));
  return { ...cost, isTextbookPage: true, lesson: style === "auto" ? parsed : { ...parsed, style } };
}
