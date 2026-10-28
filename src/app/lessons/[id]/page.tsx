import Link from "next/link";
import { Suspense } from "react";
import { LessonStatus } from "@/components/LessonStatus";

export default function LessonPage({ params }: PageProps<"/lessons/[id]">) {
  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-16">
      <Link href="/" className="font-bold text-dust hover:text-chalk">
        New lesson
      </Link>
      <div className="mt-6">
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
