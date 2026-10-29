import type { Metadata } from "next";
import { MyBooks } from "@/components/MyBooks";
import { MyLessons } from "@/components/MyLessons";

export const metadata: Metadata = { title: "My lessons · LessonCast" };

export default function MyLessonsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:py-12">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">My lessons</h1>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-dust">The lessons and books made on this device, newest first.</p>
      <MyBooks />
      <MyLessons />
    </main>
  );
}
