import type { Metadata } from "next";
import { Suspense } from "react";
import { BookLessons } from "@/components/BookLessons";
import { Loading } from "@/components/shell/Loading";

export const metadata: Metadata = { title: "Book · LessonCast" };

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
