import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { Suspense } from "react";
import { BookLessons } from "@/components/BookLessons";
import { getBook } from "@/lib/books/repo";
import { pageMetadata } from "@/lib/seo";
import { Loading } from "@/components/shell/Loading";

/** What a shared link to a book shows: its title and the lessons Muse Spark found in it. */
async function bookCard(id: string) {
  "use cache";
  cacheLife("minutes");
  const book = await getBook(id).catch(() => null);
  if (!book || book.status !== "ready") return null;
  return { title: book.title, subject: book.subject, level: book.level, lessons: book.lessons.length };
}

export async function generateMetadata({ params }: PageProps<"/books/[id]">): Promise<Metadata> {
  const { id } = await params;
  const path = `/books/${id}`;
  const card = await bookCard(id);
  if (!card) return pageMetadata({ title: "A textbook", description: "A textbook Muse Spark is reading into lessons, on LessonCast.", path });
  const about = [card.subject, card.level].filter(Boolean).join(", ");
  return pageMetadata({
    title: card.title ?? "A textbook",
    description: `${card.lessons} lessons Muse Spark found in this textbook${about ? ` (${about})` : ""}. Pick one to make its narrated video in the language of home.`,
    path,
  });
}

export default function BookPage({ params }: PageProps<"/books/[id]">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 lg:py-12">
      {/* The id is runtime data: with Cache Components it is read inside a Suspense boundary. */}
      <Suspense fallback={<Loading label="Loading the book…" />}>
        {params.then(({ id }) => (
          <BookLessons id={id} />
        ))}
      </Suspense>
    </main>
  );
}
