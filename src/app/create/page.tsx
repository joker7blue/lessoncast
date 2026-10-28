import type { Metadata } from "next";
import { UploadForm } from "@/components/UploadForm";

export const metadata: Metadata = { title: "Create a lesson · LessonCast" };

export default function CreatePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 lg:py-12">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Create a lesson</h1>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-dust">
        Photograph the pages of one lesson, choose the language the children speak at home, and LessonCast makes a
        short narrated video in about four minutes.
      </p>
      <UploadForm />
    </main>
  );
}
