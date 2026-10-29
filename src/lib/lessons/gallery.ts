// What anyone can browse on the Lessons page, from any browser: every finished lesson and every book
// that Muse Spark has read, newest first. Read at most every few minutes.

import { cacheLife } from "next/cache";
import { type Language, type Localized, say } from "../lesson/schema";
import type { StyleChoice } from "../lesson/styles";
import { supabase } from "../supabase/server";
import { publicUrl } from "../supabase/storage";

const MAX_LESSONS = 60;
const MAX_BOOKS = 24;

export type GalleryLesson = {
  id: string;
  title: string | null;
  language: Language;
  style: StyleChoice;
  posterUrl: string | null;
  bookTitle: string | null;
};

export type GalleryBook = { id: string; title: string; subject: string | null; level: string | null; pageCount: number | null; lessons: number };

type LessonColumns = {
  id: string;
  language: Language;
  style: StyleChoice;
  script: { title: Localized; style: StyleChoice } | null;
  scene_paths: (string | null)[];
  book: { title: string | null } | null;
};

export async function galleryLessons(): Promise<GalleryLesson[]> {
  "use cache";
  cacheLife("minutes");
  try {
    const { data, error } = await supabase()
      .from("lessons")
      .select("id, language, style, script, scene_paths, book:books(title)")
      .eq("status", "done")
      .not("video_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(MAX_LESSONS)
      .overrideTypes<LessonColumns[], { merge: false }>();
    if (error) throw error;
    return data.map((row) => {
      const scene = row.scene_paths[0];
      return {
        id: row.id,
        title: row.script ? say(row.script.title, row.language) : null,
        language: row.language,
        style: row.script?.style ?? row.style,
        posterUrl: scene ? publicUrl(scene) : null,
        bookTitle: row.book?.title ?? null,
      };
    });
  } catch (error) {
    console.error("Gallery lessons unavailable", error);
    return [];
  }
}

export async function galleryBooks(): Promise<GalleryBook[]> {
  "use cache";
  cacheLife("minutes");
  try {
    const { data, error } = await supabase()
      .from("books")
      .select("id, title, file_name, subject, level, page_count, lessons")
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(MAX_BOOKS);
    if (error) throw error;
    return data.map((row) => ({
      id: row.id as string,
      title: (row.title as string | null) ?? (row.file_name as string).replace(/\.pdf$/i, ""),
      subject: row.subject as string | null,
      level: row.level as string | null,
      pageCount: row.page_count as number | null,
      lessons: (row.lessons as unknown[]).length,
    }));
  } catch (error) {
    console.error("Gallery books unavailable", error);
    return [];
  }
}
