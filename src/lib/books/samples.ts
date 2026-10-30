// Textbooks anyone can try LessonCast with, without one at hand: a judge, a visitor, a teacher curious first.
// Each PDF is served from public/samples/ and must be free to share: the repository and the site are public.
// To add one, put its PDF in public/samples/ (lowercase name, dashes), with its cover: a JPEG of its first
// page, 600 px wide, under the same name. Then describe it here.

export type SampleBook = {
  /** Where the PDF is served, under public/. */
  url: string;
  /** Its first page, as a JPEG under public/. */
  cover: string;
  title: string;
  subject: string;
  level: string;
  /** The language the book is written in. */
  language: string;
  pages: number;
  /** What the book holds, in one or two sentences. */
  description: string;
};

export const SAMPLE_BOOKS: SampleBook[] = [
  {
    url: "/samples/sciences-cm1.pdf",
    cover: "/samples/sciences-cm1.jpg",
    title: "Sciences et technologie, CM1",
    subject: "Science",
    level: "Primary, CM1",
    language: "French",
    pages: 39,
    description:
      "Eight short lessons: the heart and the blood, breathing, digestion, the states of water, the water cycle, how plants make their food, the volcanoes of Cameroon, and malaria.",
  },
];
