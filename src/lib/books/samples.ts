// Textbooks anyone can try LessonCast with, without one at hand: a judge, a visitor, a teacher curious first.
// Each PDF is served from samples/ in the public lessons bucket (they are too large for the repository), and
// must be free to share: the site is public. To add one, compress its PDF, upload it with
// scripts/upload-samples.ts (lowercase name, dashes), put its cover in public/samples/ (a JPEG of its first
// page, 600 px wide, under the same name), then describe it here.

export type SampleBook = {
  /** The PDF's name, without .pdf: the file in the bucket's samples/ and its cover in public/samples/. */
  name: string;
  /** Where the PDF is served, in the public lessons bucket. */
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

/** The sample's PDF in the lessons bucket. */
export const samplePath = (name: string) => `samples/${name}.pdf`;

function sample(name: string, about: Omit<SampleBook, "name" | "url" | "cover">): SampleBook {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/lessons/${samplePath(name)}`;
  return { name, url, cover: `/samples/${name}.jpg`, ...about };
}

export const SAMPLE_BOOKS: SampleBook[] = [
  sample("sciences-cm1", {
    title: "Sciences et technologie, CM1",
    subject: "Science",
    level: "Primary, CM1",
    language: "French",
    pages: 39,
    description:
      "Eight short lessons: the heart and the blood, breathing, digestion, the states of water, the water cycle, how plants make their food, the volcanoes of Cameroon, and malaria.",
  }),
  sample("physics-s1", {
    title: "Physics, Senior 1",
    subject: "Physics",
    level: "Secondary, Senior 1",
    language: "English",
    pages: 427,
    description:
      "Rwanda Basic Education Board's student book, 2020: laboratory safety and measurement, motion, forces and Newton's laws, energy, simple machines, heat, magnetism, electricity and light.",
  }),
  sample("chemistry-s5", {
    title: "Chemistry, Senior 5",
    subject: "Chemistry",
    level: "Secondary, Senior 5",
    language: "English",
    pages: 578,
    description:
      "Rwanda Education Board's student book, 2019: organic chemistry from alkanes to amino acids, then phase diagrams, solutions and titration, electrolysis, enthalpy and entropy.",
  }),
  sample("history-s4", {
    title: "History, Senior 4",
    subject: "History",
    level: "Secondary, Senior 4",
    language: "English",
    pages: 540,
    description:
      "Rwanda Basic Education Board's student book, 2024: the ancient civilisations, Europe from 1789 to 1835, the colonisation of Africa and the African response, human rights, and conflict solving.",
  }),
  sample("history-y13", {
    title: "History, Year 13",
    subject: "History",
    level: "Secondary, Year 13",
    language: "English",
    pages: 163,
    description:
      "Samoa Ministry of Education's student book, 2004: migration during the world wars and the Cold War, colonialism and nationalism, decolonisation, and international relations.",
  }),
];
