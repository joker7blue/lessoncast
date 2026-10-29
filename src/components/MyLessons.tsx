"use client";

// The lessons this device started that aren't finished yet, or couldn't be: finished lessons are
// listed for everyone on the Lessons page.

import { useEffect, useState } from "react";
import { rememberedLessons } from "@/lib/lessons/remembered";
import type { LessonView } from "@/lib/lessons/view";
import { LessonCard, type LessonCardData } from "./LessonCard";

const STATUS_NOTE: Record<string, string> = {
  queued: "Starting",
  reading: "Being made: reading the pages",
  drawing: "Being made: pictures and voice",
  highlighting: "Being made: lighting up the objects",
  rendering: "Being made: putting it together",
  failed: "Couldn't be made",
};

export function MyLessons() {
  const [lessons, setLessons] = useState<LessonCardData[]>([]);

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
          entry && entry.view.status !== "done"
            ? [
                {
                  id: entry.id,
                  title: entry.view.title,
                  language: entry.view.language,
                  style: entry.view.style,
                  posterUrl: entry.view.sceneImageUrls.find((url) => url !== null) ?? null,
                  note: STATUS_NOTE[entry.view.status] ?? entry.view.status,
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

  if (lessons.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-extrabold">Being made on this device</h2>
      <ul className="mt-4 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {lessons.map((lesson) => (
          <li key={lesson.id}>
            <LessonCard lesson={lesson} />
          </li>
        ))}
      </ul>
    </section>
  );
}
