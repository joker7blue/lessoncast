// Finished lessons shown on the home page: real runs of the pipeline, read once an hour.

import { cacheLife } from "next/cache";
import type { Language } from "../lesson/schema";
import type { ArtStyle } from "../lesson/styles";
import { publicUrl } from "../supabase/storage";
import { getLesson } from "./repo";

// `source` says, in English, which page the lesson was made from.
const EXAMPLES = [
  { id: "b863df1d-f094-461a-825c-ea7de9d5be16", source: "one page of the French history and geography curriculum for Seconde" },
  { id: "f5195f40-b5f7-48a1-9b32-2bda97695471", source: "the same page, drawn and narrated another way" },
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

export async function exampleLessons(): Promise<ExampleLesson[]> {
  "use cache";
  cacheLife("hours");
  try {
    const rows = await Promise.all(EXAMPLES.map(({ id }) => getLesson(id)));
    return rows.flatMap((row, i) => {
      const scene = row?.scenePaths[0];
      if (!row || row.status !== "done" || !row.script || !row.videoPath || !scene) return [];
      return [
        {
          id: row.id,
          title: row.script.title[row.language],
          source: EXAMPLES[i]!.source,
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
