"use client";

// The lessons this device made, read back from the API. Kept in the browser: no account needed.

import Link from "next/link";
import { useEffect, useState } from "react";
import { rememberedLessons } from "@/lib/lessons/remembered";
import type { LessonView } from "@/lib/lessons/view";
import { LessonCard, type LessonCardData, describeLesson } from "./LessonCard";

const STATUS_NOTE: Record<string, string> = {
  queued: "Starting",
  reading: "Being made: reading the pages",
  drawing: "Being made: pictures and voice",
  rendering: "Being made: putting it together",
  failed: "Couldn't be made",
};

export function MyLessons() {
  const [lessons, setLessons] = useState<LessonCardData[] | null>(null);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      const ids = rememberedLessons();
      const views = await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await fetch(`/api/lessons/${id}`, { cache: "no-store" });
            return res.ok ? { id, view: (await res.json()) as LessonView } : null;
          } catch {
            return null;
          }
        }),
      );
      if (stopped) return;
      setLessons(
        views.flatMap((entry) =>
          entry
            ? [
                {
                  id: entry.id,
                  title: entry.view.title,
                  language: entry.view.language,
                  style: entry.view.style,
                  posterUrl: entry.view.sceneImageUrls.find((url) => url !== null) ?? null,
                  note:
                    entry.view.status === "done"
                      ? describeLesson(entry.view.language, entry.view.style)
                      : (STATUS_NOTE[entry.view.status] ?? entry.view.status),
                },
              ]
            : [],
        ),
      );
    };
    load();
    return () => {
      stopped = true;
    };
  }, []);

  if (lessons === null) return <p className="mt-10 text-dust">Loading your lessons…</p>;
  if (lessons.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-dashed border-line p-8">
        <p className="text-lg font-bold">No lessons on this device yet.</p>
        <p className="mt-2 text-dust">Photograph a textbook page and your first lesson will appear here.</p>
        <Link href="/create" className="mt-6 inline-flex rounded-lg bg-spoken px-6 py-3 font-extrabold text-board">
          Create a lesson
        </Link>
      </div>
    );
  }
  return (
    <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {lessons.map((lesson) => (
        <li key={lesson.id}>
          <LessonCard lesson={lesson} />
        </li>
      ))}
    </ul>
  );
}
