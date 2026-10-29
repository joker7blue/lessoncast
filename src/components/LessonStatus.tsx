"use client";

// The lesson being made: polls GET /api/lessons/:id every 2 s and shows the pipeline graph live, the
// scenes filling their slots as Muse Image draws them, then the video.

import { Download } from "lucide-react";
import { getImageProps } from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatSeconds, formatUsd } from "@/lib/format";
import { STYLES } from "@/lib/lesson/styles";
import { modelSeconds, nodeStates, scenesDrawn } from "@/lib/lessons/graph";
import type { LessonView } from "@/lib/lessons/view";
import { lessonNodes } from "./pipeline/nodes";
import { PipelineGraph } from "./pipeline/PipelineGraph";
import { SceneImage } from "./SceneImage";

const POLL_MS = 2000;

function subtitle(lesson: LessonView): string {
  const language = lesson.language === "fr" ? "In French" : "In Pidgin";
  if (lesson.style === "auto") return `${language}, style picked from the pages.`;
  return `${language}, ${STYLES[lesson.style].label.toLowerCase()} style.`;
}

function useLesson(id: string): { lesson: LessonView | null; missing: boolean } {
  const [lesson, setLesson] = useState<LessonView | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const res = await fetch(`/api/lessons/${id}`, { cache: "no-store" });
        if (res.status === 404) return setMissing(true);
        if (res.ok) {
          const next = (await res.json()) as LessonView;
          if (stopped) return;
          setLesson(next);
          if (next.status === "done" || next.status === "failed") return;
        }
      } catch {
        // A dropped connection: try again on the next tick.
      }
      if (!stopped) timer = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [id]);
  return { lesson, missing };
}

/** Seconds since the lesson was created, ticking while it is being made. */
function useElapsed(createdAt: string | undefined, running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);
  return createdAt ? Math.max(0, (now - Date.parse(createdAt)) / 1000) : 0;
}

function SceneSlots({ lesson }: { lesson: LessonView }) {
  const slots = Math.max(lesson.sceneCount ?? 0, lesson.sceneImageUrls.length);
  if (slots === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Scenes">
      {Array.from({ length: slots }, (_, i) => {
        const url = lesson.sceneImageUrls[i];
        return (
          <li key={i}>
            {url ? (
              <SceneImage src={url} alt={`Scene ${i + 1}`} sizes="(max-width: 640px) 50vw, 240px" />
            ) : (
              <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-line text-sm font-bold text-dust">
                Scene {i + 1}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function LessonStatus({ id }: { id: string }) {
  const { lesson, missing } = useLesson(id);
  const running = lesson !== null && lesson.status !== "done" && lesson.status !== "failed";
  const elapsed = useElapsed(lesson?.createdAt, running);

  if (missing) {
    return (
      <div>
        <p className="text-lg">This lesson doesn&apos;t exist.</p>
        <Link href="/create" className="mt-4 inline-block font-bold text-spoken underline underline-offset-4">
          Create a lesson
        </Link>
      </div>
    );
  }
  if (!lesson) return <p className="text-dust">Loading the lesson…</p>;

  const done = lesson.status === "done";
  const failed = lesson.status === "failed";
  const states = nodeStates({ status: lesson.status, metrics: lesson.metrics, scenesDrawn: scenesDrawn(lesson) });
  const cost = Object.values(lesson.metrics).reduce((sum, m) => sum + m.costUsd, 0);
  const footer = running
    ? elapsed > 8 * 60
      ? `Started ${formatSeconds(elapsed)} ago. This one is taking longer than usual.`
      : `Started ${formatSeconds(elapsed)} ago. A lesson takes about four minutes.`
    : `Model time ${formatSeconds(modelSeconds(lesson.metrics))}. Estimated cost ${formatUsd(cost)}.`;
  const firstScene = lesson.sceneImageUrls.find((url) => url !== null);
  const poster = firstScene
    ? getImageProps({ src: firstScene, alt: "", width: 320, height: 180 }).props.src // 640 px at 2x
    : undefined;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_27rem] lg:gap-10">
      <header className="lg:col-span-2">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{lesson.title ?? "Your lesson"}</h1>
        <p className="mt-2 text-lg text-dust">{subtitle(lesson)}</p>
        {lesson.book && (
          <Link href={`/books/${lesson.book.id}`} className="mt-2 inline-block font-bold text-spoken underline underline-offset-4">
            Lesson {lesson.book.n} of {lesson.book.title ?? "the book"}, pages {lesson.book.firstPage}–{lesson.book.lastPage}
          </Link>
        )}
      </header>

      <section className={`space-y-6 ${done ? "order-1" : "order-2"} lg:order-none`}>
        {lesson.videoUrl && (
          <div>
            <video
              controls
              playsInline
              preload="metadata"
              poster={poster}
              src={lesson.videoUrl}
              className="aspect-video w-full rounded-xl bg-panel"
            />
            <a
              href={`${lesson.videoUrl}?download=lessoncast.mp4`}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-spoken py-4 text-lg font-extrabold text-board sm:w-auto sm:px-8"
            >
              <Download aria-hidden className="size-5" strokeWidth={2.5} />
              Download the video
            </a>
          </div>
        )}
        {failed && (
          <div role="alert" className="rounded-xl border border-danger/40 px-4 py-3">
            <p className="text-danger">{lesson.error ?? "The lesson couldn't be made."}</p>
            {lesson.book ? (
              <Link href={`/books/${lesson.book.id}`} className="mt-3 inline-block font-bold text-chalk underline underline-offset-4">
                Back to the book to try again
              </Link>
            ) : (
              <Link href="/create" className="mt-3 inline-block font-bold text-chalk underline underline-offset-4">
                Try again with other photos
              </Link>
            )}
          </div>
        )}
        {lesson.status === "queued" && <p className="text-dust">The lesson starts in a few seconds.</p>}
        <SceneSlots lesson={lesson} />
      </section>

      <aside className={`${done ? "order-2" : "order-1"} lg:order-none`}>
        <h2 className="mb-4 text-xl font-extrabold">{done ? "How this video was made" : "Being made now"}</h2>
        <PipelineGraph states={states} nodes={lessonNodes(lesson)} footer={footer} />
      </aside>
    </div>
  );
}
