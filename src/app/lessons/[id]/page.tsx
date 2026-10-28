import { Suspense } from "react";
import { LessonStatus } from "@/components/LessonStatus";

export default function LessonPage({ params }: PageProps<"/lessons/[id]">) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:py-12">
      <div>
        {/* The id is runtime data: with Cache Components it is read inside a Suspense boundary. */}
        <Suspense fallback={<p className="text-dust">Loading the lesson…</p>}>
          {params.then(({ id }) => (
            <LessonStatus id={id} />
          ))}
        </Suspense>
      </div>
    </main>
  );
}
