"use client";

// The books this device uploaded that are still being read, or couldn't be: read books are listed
// for everyone on the Lessons page.

import { useEffect, useState } from "react";
import type { BookView } from "@/lib/books/view";
import { rememberedBooks } from "@/lib/lessons/remembered";
import { BookCard } from "./BookCard";

const STATUS_NOTE: Record<BookView["status"], string> = {
  uploading: "Being uploaded",
  reading: "Being read by Muse Spark",
  ready: "",
  failed: "Couldn't be read",
};

export function MyBooks() {
  const [books, setBooks] = useState<{ id: string; view: BookView }[]>([]);

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
      if (!stopped) setBooks(views.flatMap((entry) => (entry && entry.view.status !== "ready" ? [entry] : [])));
    };
    load();
    return () => {
      stopped = true;
    };
  }, []);

  if (books.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-extrabold">Books being read on this device</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {books.map(({ id, view }) => (
          <li key={id}>
            <BookCard id={id} title={view.title ?? view.fileName} note={STATUS_NOTE[view.status]} />
          </li>
        ))}
      </ul>
    </section>
  );
}
