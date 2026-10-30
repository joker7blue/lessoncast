import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { Suspense } from "react";
import { LessonStatus } from "@/components/LessonStatus";
import { Loading } from "@/components/shell/Loading";
import { LANGUAGES } from "@/lib/lesson/languages";
import { say } from "@/lib/lesson/schema";
import { getLesson } from "@/lib/lessons/repo";
import { pageMetadata } from "@/lib/seo";
import { publicUrl } from "@/lib/supabase/storage";

/** What a shared link to a lesson shows: its title, its language and its first scene. */
async function lessonCard(id: string) {
  "use cache";
  cacheLife("minutes");
  const row = await getLesson(id).catch(() => null);
  if (!row?.script) return null;
  const scene = row.scenePaths[0];
  return { title: say(row.script.title, row.language), language: LANGUAGES[row.language].label, scene: scene ? publicUrl(scene) : null };
}

export async function generateMetadata({ params }: PageProps<"/lessons/[id]">): Promise<Metadata> {
  const { id } = await params;
  const path = `/lessons/${id}`;
  const card = await lessonCard(id);
  if (!card) return pageMetadata({ title: "A lesson", description: "A narrated, illustrated video lesson made with LessonCast.", path });
  return pageMetadata({
    title: card.title,
    description: `A narrated, illustrated video lesson in ${card.language}, made by LessonCast from a textbook with Meta's Muse Spark, Muse Image, SAM 3.1 and MMS.`,
    path,
    ...(card.scene && { image: { url: card.scene, alt: card.title } }),
  });
}

export default function LessonPage({ params }: PageProps<"/lessons/[id]">) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:py-12">
      <div>
        {/* The id is runtime data: with Cache Components it is read inside a Suspense boundary. */}
        <Suspense fallback={<Loading label="Loading the lesson…" />}>
          {params.then(({ id }) => (
            <LessonStatus id={id} />
          ))}
        </Suspense>
      </div>
    </main>
  );
}
