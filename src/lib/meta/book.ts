// Muse Spark reads one slice of a book, given inline as a PDF, and lists the lessons in it (derisk test 7).

import { type BookSlice, BookSlice as BookSliceSchema, bookSliceJsonSchema } from "../books/schema";
import type { Slice } from "../books/pdf";
import { postJson } from "./client";
import { SPARK_MODEL } from "./models";
import { type SparkUsage, sparkCostUsd } from "./prices";

// A 30-page slice took 15 s to read with 10 pages; past this, the slice is retried.
const TIMEOUT_MS = 240_000;

export const BOOK_INSTRUCTIONS = `You read part of a school textbook or an educational ebook, given as a PDF, and list the lessons it contains, so a teacher in Cameroon can pick one and turn it into a short video for pupils.
- A lesson is what a teacher teaches in one or two class sessions, usually 1 to 12 pages. Split a long chapter into its lessons. Leave out the cover, the table of contents, the index, answer keys and pages of exercises only.
- firstPage and lastPage count the pages of this PDF file from 1, whatever number is printed on the page.
- title: the lesson's title as printed. summary: one sentence, in the language of the book, on what the lesson teaches.
- continuesPrevious: true only for a lesson that already started before the first page of this file.
- book: the title, subject and level as printed on these pages; empty strings when these pages don't show them.`;

type ChatCompletion = { choices: { message: { content: string | null }; finish_reason: string }[]; usage?: SparkUsage };

export async function readSlice(slice: Slice, pageCount: number): Promise<{ answer: BookSlice; seconds: number; costUsd: number }> {
  const start = performance.now();
  const res = await postJson(
    "/chat/completions",
    {
      model: SPARK_MODEL,
      reasoning_effort: "medium",
      messages: [
        { role: "system", content: BOOK_INSTRUCTIONS },
        {
          role: "user",
          content: [
            { type: "text", text: `This PDF holds pages ${slice.firstPage} to ${slice.lastPage} of a book of ${pageCount} pages. List its lessons.` },
            {
              type: "file",
              file: {
                filename: `pages-${slice.firstPage}-${slice.lastPage}.pdf`,
                file_data: `data:application/pdf;base64,${Buffer.from(slice.bytes).toString("base64")}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_schema", json_schema: { name: "BookSlice", strict: true, schema: bookSliceJsonSchema() } },
    },
    { timeoutMs: TIMEOUT_MS },
  );
  const completion = (await res.json()) as ChatCompletion;
  const content = completion.choices[0]?.message.content;
  if (!content) throw new Error(`Muse Spark returned no lessons (finish_reason=${completion.choices[0]?.finish_reason})`);
  return {
    answer: BookSliceSchema.parse(JSON.parse(content)),
    seconds: (performance.now() - start) / 1000,
    costUsd: sparkCostUsd(completion.usage),
  };
}
