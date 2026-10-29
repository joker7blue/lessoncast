// A lesson as a card: its first scene, its title, its language and style. Links to the lesson page.

import { Play } from "lucide-react";
import Link from "next/link";
import { LANGUAGES } from "@/lib/lesson/languages";
import type { Language } from "@/lib/lesson/schema";
import { STYLES, type StyleChoice } from "@/lib/lesson/styles";
import { SceneImage } from "./SceneImage";

export type LessonCardData = { id: string; title: string | null; language: Language; style: StyleChoice; posterUrl: string | null; note?: string };

export function describeLesson(language: Language, style: StyleChoice): string {
  const spoken = `In ${LANGUAGES[language].label}`;
  return style === "auto" ? spoken : `${spoken}, ${STYLES[style].label.toLowerCase()} style`;
}

export function LessonCard({ lesson }: { lesson: LessonCardData }) {
  return (
    <Link href={`/lessons/${lesson.id}`} className="group block">
      <div className="relative overflow-hidden rounded-xl border border-line bg-panel">
        {lesson.posterUrl ? (
          <SceneImage src={lesson.posterUrl} alt="" sizes="(max-width: 640px) 100vw, 400px" />
        ) : (
          <div className="aspect-video" />
        )}
        <span className="absolute inset-0 grid place-items-center bg-board/0 transition-colors group-hover:bg-board/25">
          <span className="grid size-12 place-items-center rounded-full bg-spoken text-board shadow-lg transition-transform group-hover:scale-105">
            <Play aria-hidden className="ml-0.5 size-5" fill="currentColor" />
          </span>
        </span>
      </div>
      <p className="mt-3 font-extrabold leading-snug">{lesson.title ?? "Lesson being made"}</p>
      <p className="mt-1 text-sm text-dust">{lesson.note ?? describeLesson(lesson.language, lesson.style)}</p>
    </Link>
  );
}
