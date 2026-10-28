"use client";

// The lesson being made: polls GET /api/lessons/:id every 2 s, lights the current step the way the
// video lights the word being spoken, shows the scenes as they are drawn, then the video.

import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Language } from "@/lib/lesson/schema";
import { STYLES, type StyleChoice } from "@/lib/lesson/styles";
import type { LessonStatus as Status } from "@/lib/lessons/repo";

type LessonView = {
  status: Status;
  language: Language;
  error: string | null;
  title: string | null;
  style: StyleChoice;
  sceneCount: number | null;
  sceneImageUrls: string[];
  videoUrl: string | null;
};

const POLL_MS = 2000;
const STEPS = ["reading", "drawing", "rendering", "done"] as const;
type StepStatus = (typeof STEPS)[number];

function stepIndex(status: Status): number {
  if (status === "queued") return -1;
  if (status === "voicing" || status === "highlighting") return 1;
  return STEPS.indexOf(status as StepStatus);
}

function describe(step: StepStatus, lesson: LessonView): { title: string; detail: string } {
  switch (step) {
    case "reading":
      return { title: "Reading the pages", detail: "Muse Spark reads the pages and writes the lesson." };
    case "drawing": {
      const drawn = lesson.sceneCount ? ` (${lesson.sceneImageUrls.length} of ${lesson.sceneCount})` : "";
      return { title: "Pictures and voice", detail: `Muse Image draws the scenes${drawn} while MMS records the voice.` };
    }
    case "rendering":
      return { title: "Putting it together", detail: "Remotion assembles the scenes, the voice and the subtitles." };
    case "done":
      return { title: "Ready", detail: "The video is ready to watch and send." };
  }
}

function subtitle(lesson: LessonView): string {
  const language = lesson.language === "fr" ? "In French" : "In Pidgin";
  if (lesson.style === "auto") return `${language}, style picked from the pages.`;
  return `${language}, ${STYLES[lesson.style].label.toLowerCase()} style.`;
}

export function LessonStatus({ id }: { id: string }) {
  const [lesson, setLesson] = useState<LessonView | null>(null);
  const [missing, setMissing] = useState(false);
  // The step that was running when the lesson failed: the API only says "failed".
  const [lastStep, setLastStep] = useState(-1);

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
          if (next.status !== "failed") setLastStep(stepIndex(next.status));
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

  if (missing) {
    return (
      <div>
        <p className="text-lg">This lesson doesn&apos;t exist.</p>
        <Link href="/" className="mt-4 inline-block font-bold text-spoken underline underline-offset-4">
          Create a lesson
        </Link>
      </div>
    );
  }
  if (!lesson) return <p className="text-dust">Loading the lesson…</p>;

  const failed = lesson.status === "failed";
  const current = failed ? lastStep : stepIndex(lesson.status);
  const poster = lesson.sceneImageUrls[0]
    ? getImageProps({ src: lesson.sceneImageUrls[0], alt: "", width: 320, height: 180 }).props.src // 640 px at 2x
    : undefined;

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight">{lesson.title ?? "Your lesson"}</h1>
      <p className="mt-2 text-dust">{subtitle(lesson)}</p>

      {lesson.videoUrl && (
        <section className="mt-8">
          <video
            controls
            playsInline
            preload="metadata"
            poster={poster}
            src={lesson.videoUrl}
            className="aspect-video w-full rounded-lg bg-panel"
          />
          <a
            href={`${lesson.videoUrl}?download=lessoncast.mp4`}
            className="mt-4 block w-full rounded-lg bg-spoken py-4 text-center text-lg font-extrabold text-board"
          >
            Download the video
          </a>
        </section>
      )}

      {failed && (
        <div role="alert" className="mt-8 rounded-lg border border-danger/40 px-4 py-3">
          <p className="text-danger">{lesson.error ?? "The lesson couldn't be made."}</p>
          <Link href="/" className="mt-3 inline-block font-bold text-chalk underline underline-offset-4">
            Try again with other photos
          </Link>
        </div>
      )}

      <ol className="mt-8 space-y-5">
        {STEPS.map((step, i) => {
          const { title, detail } = describe(step, lesson);
          const state = i < current || lesson.status === "done" ? "done" : i === current ? (failed ? "failed" : "active") : "pending";
          return (
            <li key={step} className={`flex gap-4 ${state === "pending" ? "opacity-45" : ""}`} aria-current={state === "active" ? "step" : undefined}>
              <span
                aria-hidden
                className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-extrabold ${
                  state === "active"
                    ? "bg-spoken text-board motion-safe:animate-pulse"
                    : state === "done"
                      ? "bg-chalk/15 text-chalk"
                      : state === "failed"
                        ? "bg-danger text-board"
                        : "border border-line text-dust"
                }`}
              >
                {state === "done" ? "✓" : state === "failed" ? "!" : i + 1}
              </span>
              <div>
                <p className={`font-extrabold ${state === "active" ? "text-spoken" : ""}`}>{title}</p>
                <p className="text-dust">{detail}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {lesson.sceneImageUrls.length > 0 && (
        <ul className="mt-8 grid grid-cols-2 gap-3" aria-label="Scenes drawn">
          {lesson.sceneImageUrls.map((url, i) => (
            <li key={url}>
              <Image
                src={url}
                alt={`Scene ${i + 1}`}
                width={854}
                height={480}
                sizes="(max-width: 480px) 50vw, 220px"
                className="aspect-video w-full rounded-md object-cover"
              />
            </li>
          ))}
        </ul>
      )}

      {lesson.status === "queued" && <p className="mt-6 text-dust">The lesson starts in a few seconds.</p>}
    </div>
  );
}
