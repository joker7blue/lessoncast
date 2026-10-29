import type { Metadata } from "next";
import Link from "next/link";
import { BookCard } from "@/components/BookCard";
import { describeLesson, LessonCard } from "@/components/LessonCard";
import { MyBooks } from "@/components/MyBooks";
import { MyLessons } from "@/components/MyLessons";
import { galleryBooks, galleryLessons } from "@/lib/lessons/gallery";

export const metadata: Metadata = { title: "Lessons · LessonCast" };

export default async function LessonsPage() {
  const [books, lessons] = await Promise.all([galleryBooks(), galleryLessons()]);
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:py-12">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Lessons</h1>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-dust">
        Every lesson made with LessonCast, newest first. Open one to watch it and see how each model made it.
      </p>

      <MyBooks />
      <MyLessons />

      {books.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-extrabold">Books</h2>
          <p className="mt-1 text-dust">Textbooks Muse Spark has split into lessons. Open one to make the video of any lesson.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <li key={book.id}>
                <BookCard
                  id={book.id}
                  title={book.title}
                  note={[`${book.lessons} lessons`, book.level, book.pageCount ? `${book.pageCount} pages` : null].filter(Boolean).join(", ")}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-xl font-extrabold">Videos</h2>
        {lessons.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-line p-8">
            <p className="text-lg font-bold">No lessons yet.</p>
            <p className="mt-2 text-dust">Photograph a textbook page or upload a book, and the first lesson will appear here.</p>
            <Link href="/create" className="mt-6 inline-flex rounded-lg bg-spoken px-6 py-3 font-extrabold text-board">
              Create a lesson
            </Link>
          </div>
        ) : (
          <ul className="mt-4 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                <LessonCard
                  lesson={{ ...lesson, note: `${describeLesson(lesson.language, lesson.style)}${lesson.bookTitle ? `, from ${lesson.bookTitle}` : ""}` }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
