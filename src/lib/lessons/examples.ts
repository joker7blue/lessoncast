// Finished lessons shown on the home page: real runs of the pipeline, read once an hour. The hero comes from a
// photographed page; the others all come from one science textbook, a lesson in each language.

import { cacheLife } from "next/cache";
import { type Language, say } from "../lesson/schema";
import type { ArtStyle } from "../lesson/styles";
import { publicUrl } from "../supabase/storage";
import { getLesson } from "./repo";

// `source` says, in English, what the lesson was made from.
const HERO = { id: "b863df1d-f094-461a-825c-ea7de9d5be16", source: "one page of the French history and geography curriculum for Seconde" };

// The CM1 science textbook (39 pages) that Muse Spark split into 8 lessons, one lesson in each language.
const TEXTBOOK = [
  { id: "d171179b-feee-4912-acae-5c5e1a1316a6", source: "the heart and the blood" },
  { id: "fee60568-1bff-4525-9a07-afeb3c9fd5a6", source: "how plants make their food" },
  { id: "3c390c72-b63f-4a6a-a0e2-fbc37cf9f0b7", source: "malaria and the mosquito" },
  { id: "dde28ceb-f83c-4392-a2ab-2993309c3cb0", source: "the heart and the blood" },
  { id: "f6144624-d888-449d-b41a-40f6bcd7aded", source: "the three states of water" },
  { id: "298c62b5-4240-4337-9859-546ab02e8201", source: "how we breathe" },
  { id: "a9a9d7c3-f61a-4341-b1bf-61d601ddf4d9", source: "digestion" },
  { id: "20b2951c-48d3-4f86-b9e9-de0fbe952d40", source: "the water cycle" },
];

export type ExampleLesson = {
  id: string;
  title: string;
  source: string;
  language: Language;
  style: ArtStyle;
  posterUrl: string;
  videoUrl: string;
};

async function finished(examples: { id: string; source: string }[]): Promise<ExampleLesson[]> {
  try {
    // A lesson that can't be read is left out, not the whole list.
    const rows = await Promise.all(examples.map(({ id }) => getLesson(id).catch(() => null)));
    return rows.flatMap((row, i) => {
      const scene = row?.scenePaths[0];
      if (!row || row.status !== "done" || !row.script || !row.videoPath || !scene) return [];
      return [
        {
          id: row.id,
          title: say(row.script.title, row.language),
          source: examples[i]!.source,
          language: row.language,
          style: row.script.style,
          posterUrl: publicUrl(scene),
          videoUrl: publicUrl(row.videoPath),
        },
      ];
    });
  } catch (error) {
    console.error("Example lessons unavailable", error);
    return [];
  }
}

/** The lesson the home page opens on, if it is still there. */
export async function heroLesson(): Promise<ExampleLesson | null> {
  "use cache";
  cacheLife("hours");
  return (await finished([HERO]))[0] ?? null;
}

/** The textbook's lessons, in the order of the languages; any that is missing is left out. */
export async function textbookLessons(): Promise<ExampleLesson[]> {
  "use cache";
  cacheLife("hours");
  return finished(TEXTBOOK);
}
