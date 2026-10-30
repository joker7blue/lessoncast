// Muse Spark reads a book lesson's pages and writes a short text summary of it in a language of home: a
// written companion to the video that a parent can read again, and send to the class's WhatsApp group.

import { z } from "zod";
import { LANGUAGES } from "../lesson/languages";
import type { Language } from "../lesson/schema";
import { postJson } from "./client";
import { type LessonPages, pagesContent } from "./lesson";
import { SPARK_MODEL } from "./models";
import { type SparkUsage, sparkCostUsd } from "./prices";

// A summary is a short answer: past this, the call is given up.
const TIMEOUT_MS = 90_000;

export const LessonSummary = z.object({
  summary: z.string().min(40).describe("About 150 words, in short plain sentences, saying what the lesson teaches, in its order"),
  keyTerms: z
    .array(z.object({ term: z.string(), meaning: z.string().describe("One sentence") }))
    .min(2)
    .max(5)
    .describe("The words a pupil must know from the lesson"),
});
export type LessonSummary = z.infer<typeof LessonSummary>;

export const SUMMARY_INSTRUCTIONS = `You summarize one lesson of an African school textbook, given as its pages, for parents and pupils who will read it at home, in the language the request names: often the language they speak at home rather than the language of the book.

Rules:
- summary: about 150 words, in short plain sentences, saying what the lesson teaches, in its order. Teach only what the pages teach, and do not invent facts. Write it so a parent can explain the lesson again to the child.
- keyTerms: the 3 to 5 words a pupil must know from the lesson, each with a one-sentence meaning. Keep the textbook's term when the language has no word for it, and explain it.
- Every text is in the request's language only, following the request's rule for that language, with its own letters, accents and tone marks.`;

type ChatCompletion = { choices: { message: { content: string | null }; finish_reason: string }[]; usage?: SparkUsage };

function summaryJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(LessonSummary) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

/** Writes the summary of the lesson's pages in `language`. */
export async function summarizeLesson(source: LessonPages, language: Language): Promise<{ summary: LessonSummary; seconds: number; costUsd: number }> {
  const { intro, parts } = pagesContent(source);
  const { label, writing } = LANGUAGES[language];
  const start = performance.now();
  const res = await postJson(
    "/chat/completions",
    {
      model: SPARK_MODEL,
      // A summary needs less thought than a script: the teacher is waiting for it.
      reasoning_effort: "low",
      messages: [
        { role: "system", content: SUMMARY_INSTRUCTIONS },
        { role: "user", content: [{ type: "text", text: `${intro} Write the summary in ${label}: ${writing}` }, ...parts] },
      ],
      response_format: { type: "json_schema", json_schema: { name: "LessonSummary", strict: true, schema: summaryJsonSchema() } },
    },
    { timeoutMs: TIMEOUT_MS },
  );
  const completion = (await res.json()) as ChatCompletion;
  const content = completion.choices[0]?.message.content;
  if (!content) throw new Error(`Muse Spark returned no summary (finish_reason=${completion.choices[0]?.finish_reason})`);
  return {
    summary: LessonSummary.parse(JSON.parse(content)),
    seconds: (performance.now() - start) / 1000,
    costUsd: sparkCostUsd(completion.usage),
  };
}
