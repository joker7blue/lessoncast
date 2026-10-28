"use client";

// The books this device uploaded, read back from the API, each linking to its list of lessons.

import { BookOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { BookView } from "@/lib/books/view";
import { rememberedBooks } from "@/lib/lessons/remembered";

const STATUS_NOTE: Record<BookView["status"], string> = {
  uploading: "Being uploaded",
  reading: "Being read by Muse Spark",
  ready: "",
  failed: "Couldn't be read",
};

export function MyBooks() {
  const [books, setBooks] = useState<{ id: string; view: BookView }[] | null>(null);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      const views = await Promise.all(
        rememberedBooks().map(async (id) => {
          try {
            const res = await fetch(`/api/books/${id}`, { cache: "no-store" });
            return res.ok ? { id, view: (await res.json()) as BookView } : null;
          } catch {
            return null;
          }
        }),
      );
      if (!stopped) setBooks(views.flatMap((entry) => (entry ? [entry] : [])));
    };
    load();
    return () => {
      stopped = true;
    };
  }, []);

  // Books are an extra: nothing to say while loading or when there are none.
  if (!books || books.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="text-xl font-extrabold">Books</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {books.map(({ id, view }) => {
          const videos = view.lessons.reduce((sum, l) => sum + l.videos.length, 0);
          const note =
            view.status === "ready"
              ? `${view.lessons.length} lessons${videos ? `, ${videos} ${videos === 1 ? "video" : "videos"} made` : ""}`
              : STATUS_NOTE[view.status];
          return (
            <li key={id}>
              <Link href={`/books/${id}`} className="flex items-start gap-3 rounded-xl border border-line bg-panel p-4 hover:border-dust">
                <BookOpen aria-hidden className="mt-0.5 size-5 shrink-0 text-spoken" />
                <span className="min-w-0">
                  <span className="block truncate font-extrabold">{view.title ?? view.fileName}</span>
                  <span className="block text-sm text-dust">{note}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
