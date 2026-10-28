// What GET /api/lessons/:id returns: everything the lesson page and its pipeline graph show.

import type { Language } from "../lesson/schema";
import type { StyleChoice } from "../lesson/styles";
import type { LessonStatus, StepMetrics } from "./repo";

export type LessonView = {
  status: LessonStatus;
  language: Language;
  createdAt: string;
  pageCount: number;
  error: string | null;
  title: string | null;
  /** The style used once the script exists, the teacher's choice before. */
  style: StyleChoice;
  sceneCount: number | null;
  /** Scene n at index n - 1, null until it is drawn. */
  sceneImageUrls: (string | null)[];
  voice: { seconds: number; words: number } | null;
  videoUrl: string | null;
  metrics: Record<string, StepMetrics>;
  /** For a lesson made from a book: the book, the lesson's number in it and its pages. */
  book: { id: string; title: string | null; n: number; firstPage: number; lastPage: number } | null;
};
