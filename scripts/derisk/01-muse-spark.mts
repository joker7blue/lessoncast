// Derisk test 1: a photo of a Cameroonian textbook page -> a lesson script (JSON) from
// Muse Spark, validated with Zod.
//
//   pnpm derisk:1 scripts/derisk/input/page.jpg [reasoning effort: low|medium|high]
//
// Writes scripts/derisk/out/01/lesson.json, response.json and metrics.json.

import path from "node:path";
import { ApiError, PRICE, fileToDataUrl, postJson, stopwatch, usd, writeOut } from "./lib.mts";
import { Lesson, lessonJsonSchema } from "./lesson-schema.mts";

const MODEL = "muse-spark-1.3";

const INSTRUCTIONS = `You turn one photographed page of a Cameroonian school textbook into the script of a short narrated, illustrated video lesson for children. Parents will replay it at home in the evening, so it must be clear when heard without the page.

Rules:
- Read the page carefully. Teach only what the page teaches, and do not invent facts. Copy its title and main definitions into page.keyText as printed.
- Write 6 scenes (5 to 7). Each narration is 2 to 4 short sentences, about 30 words in French. The whole lesson should last 2 to 3 minutes when read aloud.
- narration.fr: simple French for children aged 8 to 12.
- narration.pcm: the same content in Cameroonian Pidgin English (Kamtok), the way a parent in Douala or Bamenda would explain it at home, spelled in plain Latin letters as it sounds. Do not translate word for word.
- A text-to-speech voice reads the narration: write numbers, units and symbols in words, and avoid abbreviations, parentheses and lists.
- imagePrompt (English): one illustration for the scene: subject, setting and composition. Show Cameroonian children and places when people or places appear. Never ask for text, letters, labels or numbers in the image. Leave the art style out: it goes in artStyle.
- artStyle (English): a single art style for every image of the lesson (medium, palette, line quality, lighting), friendly for children.
- highlights: 1 to 3 objects per scene that are clearly drawn in the image and named in the narration. samPrompt is a short English noun phrase for a segmentation model ("heart", "river", "red blood cell"). fr and pcm copy the exact word or phrase used in each narration.
- quiz: 3 multiple-choice questions on the lesson, 3 choices each. answerIndex is the index of the correct choice.`;

type ChatCompletion = {
  choices: { message: { content: string | null; refusal?: string | null }; finish_reason: string }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    prompt_tokens_details?: { cached_tokens?: number };
    completion_tokens_details?: { reasoning_tokens?: number };
  };
};

const [photo, effort = "medium"] = process.argv.slice(2);
if (!photo) {
  console.error("Usage: pnpm derisk:1 <photo.jpg|png|webp> [low|medium|high]");
  process.exit(1);
}

const image = await fileToDataUrl(photo);
const elapsed = stopwatch();
let completion: ChatCompletion;
try {
  const res = await postJson("/chat/completions", {
    model: MODEL,
    reasoning_effort: effort,
    messages: [
      { role: "system", content: INSTRUCTIONS },
      {
        role: "user",
        content: [
          { type: "text", text: "Here is the textbook page. Write the lesson." },
          { type: "image_url", image_url: { url: image } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "Lesson", strict: true, schema: lessonJsonSchema() },
    },
  });
  completion = (await res.json()) as ChatCompletion;
} catch (error) {
  if (error instanceof ApiError) console.error(`Muse Spark call failed after ${elapsed()}s: ${error.message}`);
  throw error;
}
const seconds = elapsed();
await writeOut("01", "response.json", JSON.stringify(completion, null, 2));

const choice = completion.choices[0];
if (!choice?.message.content) {
  throw new Error(`No content (finish_reason=${choice?.finish_reason}, refusal=${choice?.message.refusal})`);
}
const parsed = Lesson.safeParse(JSON.parse(choice.message.content));
if (!parsed.success) {
  console.error("Zod validation failed:", parsed.error.issues);
  process.exit(2);
}
const lesson = parsed.data;
await writeOut("01", "lesson.json", JSON.stringify(lesson, null, 2));

// Checks the schema can't express: highlights must be words the voice actually says.
const warnings: string[] = [];
lesson.scenes.forEach((scene, i) => {
  for (const h of scene.highlights) {
    for (const lang of ["fr", "pcm"] as const) {
      if (!scene.narration[lang].toLowerCase().includes(h[lang].toLowerCase())) {
        warnings.push(`scene ${i + 1}: "${h[lang]}" is not in the ${lang} narration`);
      }
    }
  }
  if (/\d/.test(scene.narration.fr + scene.narration.pcm)) warnings.push(`scene ${i + 1}: digits in the narration`);
});

const words = (lang: "fr" | "pcm") => lesson.scenes.reduce((n, s) => n + s.narration[lang].split(/\s+/).length, 0);
// About 150 spoken words per minute for a calm narration.
const minutes = (lang: "fr" | "pcm") => Math.round((words(lang) / 150) * 10) / 10;

const usage = completion.usage;
const cached = usage?.prompt_tokens_details?.cached_tokens ?? 0;
const cost = usage
  ? ((usage.prompt_tokens - cached) * PRICE.sparkInputPerMTok +
      cached * PRICE.sparkCachedInputPerMTok +
      usage.completion_tokens * PRICE.sparkOutputPerMTok) /
    1e6
  : Number.NaN;

const metrics = {
  model: MODEL,
  reasoningEffort: effort,
  photo: path.basename(photo),
  seconds,
  usage,
  costUsd: cost,
  scenes: lesson.scenes.length,
  highlights: lesson.scenes.reduce((n, s) => n + s.highlights.length, 0),
  words: { fr: words("fr"), pcm: words("pcm") },
  estimatedMinutes: { fr: minutes("fr"), pcm: minutes("pcm") },
  warnings,
};
await writeOut("01", "metrics.json", JSON.stringify(metrics, null, 2));

console.log(`Lesson "${lesson.title.fr}" (${lesson.page.subject}, ${lesson.page.level}) in ${seconds}s, ${usd(cost)}`);
console.log(`${metrics.scenes} scenes, ${metrics.highlights} highlights, ~${metrics.estimatedMinutes.fr} min in French, ~${metrics.estimatedMinutes.pcm} min in Pidgin`);
console.log(`Tokens: ${usage?.prompt_tokens} in (${cached} cached), ${usage?.completion_tokens} out (${usage?.completion_tokens_details?.reasoning_tokens ?? "?"} reasoning)`);
for (const w of warnings) console.log(`warning: ${w}`);
