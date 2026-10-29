// What Muse Spark answers for one slice of a book, and the lessons kept once the slices are joined.

import { z } from "zod";

const SliceLesson = z.object({
  title: z.string().describe("The lesson's title, as printed"),
  firstPage: z.int().describe("The page of this PDF file where the lesson starts, counted from 1"),
  lastPage: z.int().describe("The page of this PDF file where the lesson ends, counted from 1"),
  summary: z.string().describe("One sentence, in the language of the book, on what the lesson teaches"),
  continuesPrevious: z.boolean().describe("true only for a lesson that started before the first page of this file"),
});

/** The language a book is written in: French and English books get a video in their language by default. */
export const BookLanguage = z.enum(["fr", "en", "other"]);
export type BookLanguage = z.infer<typeof BookLanguage>;

export const BookSlice = z.object({
  isTextbook: z.boolean().describe("false when these pages are not from a school textbook or an educational ebook"),
  language: BookLanguage.describe("The language these pages are written in: fr for French, en for English, other for any other"),
  book: z.object({
    title: z.string().describe("The book's title, as printed, or an empty string if these pages don't show it"),
    subject: z.string(),
    level: z.string().describe("School level, e.g. CM1, 6e, Form 1, or an empty string"),
  }),
  lessons: z.array(SliceLesson),
});
export type BookSlice = z.infer<typeof BookSlice>;

/** A lesson of the book, with its pages in the whole book. */
export const BookLesson = z.object({
  title: z.string(),
  firstPage: z.int().positive(),
  lastPage: z.int().positive(),
  summary: z.string(),
});
export type BookLesson = z.infer<typeof BookLesson>;

/** JSON Schema for the API's structured output, without the `$schema` key. */
export function bookSliceJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(BookSlice) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}
