"use client";

// A book: while Muse Spark reads it, the progress; then its lessons. Each lesson's video is made only
// when the teacher asks for it, in the language and style they pick, and the videos already made are
// listed under their lesson.

import { BookOpen, LoaderCircle, Pencil, Play, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MAX_LESSON_PAGES } from "@/lib/books/pdf";
import type { BookView } from "@/lib/books/view";
import { LANGUAGES } from "@/lib/lesson/languages";
import { defaultLength, maxQuizQuestions, quizQuestionsFor, type VideoLength } from "@/lib/lesson/length";
import type { Language } from "@/lib/lesson/schema";
import type { StyleChoice } from "@/lib/lesson/styles";
import { bookEditKey, rememberLesson } from "@/lib/lessons/remembered";
import { describeLesson } from "./LessonCard";
import { describeVideo } from "@/lib/lesson/describe";
import { LessonOptions } from "./LessonOptions";

const POLL_MS = 3000;
const OFFLINE = "Sending failed. Check the internet connection and try again.";

type Lesson = BookView["lessons"][number];
type Video = Lesson["videos"][number];

const settled = (status: string) => status === "done" || status === "failed";

function useBook(id: string): { book: BookView | null; missing: boolean; setBook(book: BookView): void } {
  const [book, setBook] = useState<BookView | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const res = await fetch(`/api/books/${id}`, { cache: "no-store" });
        if (res.status === 404) return setMissing(true);
        if (res.ok) {
          const next = (await res.json()) as BookView;
          if (stopped) return;
          setBook(next);
          // Done once the book is read and none of its videos is still being made.
          const videosRunning = next.lessons.some((l) => l.videos.some((v) => !settled(v.status)));
          if (next.status === "failed" || (next.status === "ready" && !videosRunning)) return;
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
  return { book, missing, setBook };
}

function videoNote(video: Video): string {
  if (video.status === "done") return "ready to watch";
  if (video.status === "failed") return "couldn't be made";
  return "being made";
}

/** A spinner while the video is being made, a play button once it's ready, a warning if it failed. */
function VideoIcon({ status }: { status: Video["status"] }) {
  if (status === "done") return <Play aria-hidden className="size-4 fill-current" />;
  if (status === "failed") return <TriangleAlert aria-hidden className="size-4 text-danger" />;
  return <LoaderCircle aria-hidden className="size-4 motion-safe:animate-spin" />;
}

function MakeVideo({ bookId, bookLanguage, lesson, onCancel }: { bookId: string; bookLanguage: BookView["language"]; lesson: Lesson; onCancel(): void }) {
  const router = useRouter();
  // An English book makes English videos by default; any other, French ones.
  const [language, setLanguage] = useState<Language>(bookLanguage === "en" ? "en" : "fr");
  const [style, setStyle] = useState<StyleChoice>("auto");
  const recommendedLength = defaultLength(Math.min(lesson.lastPage - lesson.firstPage + 1, MAX_LESSON_PAGES));
  const [length, setLength] = useState<VideoLength>(recommendedLength);
  const [chosenQuiz, setChosenQuiz] = useState<number | null>(null);
  const pace = LANGUAGES[language].wordsPerSecond;
  const quizQuestions = Math.min(chosenQuiz ?? quizQuestionsFor(length, pace), maxQuizQuestions(length, pace));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson: lesson.n, language, style, length, quiz: quizQuestions }),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !body.id) throw new Error(body.error ?? OFFLINE);
      rememberLesson(body.id);
      router.push(`/lessons/${body.id}`);
    } catch (e) {
      setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : OFFLINE);
      setSending(false);
    }
  }

  return (
    <div className="mt-5 space-y-10 rounded-xl border border-line bg-board p-5 sm:p-6">
      <LessonOptions
        language={language}
        onLanguage={setLanguage}
        length={length}
        onLength={setLength}
        recommendedLength={recommendedLength}
        quizQuestions={quizQuestions}
        onQuizQuestions={setChosenQuiz}
        style={style}
        onStyle={setStyle}
        firstStep={1}
      />
      <div>
        {error && (
          <p role="alert" className="mb-4 rounded-lg border border-danger/40 px-4 py-3 text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={create}
            disabled={sending}
            className="flex-1 rounded-lg bg-spoken py-3.5 text-lg font-extrabold text-board transition-opacity disabled:opacity-40"
          >
            {sending ? "Starting the video…" : "Make this video"}
          </button>
          <button type="button" onClick={onCancel} disabled={sending} className="rounded-lg border border-line px-6 py-3.5 font-bold hover:bg-panel">
            Cancel
          </button>
        </div>
        <p className="mt-3 text-dust">{describeVideo({ language, length, style, quizQuestions })} Ready in about four minutes.</p>
      </div>
    </div>
  );
}

function LessonItem({
  bookId,
  bookLanguage,
  lesson,
  open,
  onOpen,
  onClose,
}: {
  bookId: string;
  bookLanguage: BookView["language"];
  lesson: Lesson;
  open: boolean;
  onOpen(): void;
  onClose(): void;
}) {
  const pages = lesson.firstPage === lesson.lastPage ? `Page ${lesson.firstPage}` : `Pages ${lesson.firstPage}–${lesson.lastPage}`;
  return (
    <li className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full border border-line font-extrabold text-spoken">
          {lesson.n}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg leading-snug font-extrabold">{lesson.title}</h3>
          <p className="mt-0.5 text-sm font-bold text-dust">{pages}</p>
          <p className="mt-2 leading-relaxed text-chalk/85">{lesson.summary}</p>
          {lesson.videos.length > 0 && (
            <ul className="mt-3 space-y-1">
              {lesson.videos.map((video) => (
                <li key={video.id}>
                  <Link
                    href={`/lessons/${video.id}`}
                    className={`inline-flex items-center gap-2 font-bold underline underline-offset-4 ${video.status === "failed" ? "text-dust" : "text-spoken"}`}
                  >
                    <VideoIcon status={video.status} />
                    {describeLesson(video.language, video.style)}: {videoNote(video)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        {!open && (
          <button type="button" onClick={onOpen} className="shrink-0 rounded-lg bg-spoken px-5 py-2.5 font-extrabold text-board">
            {lesson.videos.length > 0 ? "Make another video" : "Make the video"}
          </button>
        )}
      </div>
      {open && <MakeVideo bookId={bookId} bookLanguage={bookLanguage} lesson={lesson} onCancel={onClose} />}
    </li>
  );
}

function describeBook(book: BookView): string {
  const parts = [book.subject, book.level].filter(Boolean).join(", ");
  const pages = book.pageCount ? `${book.pageCount} pages` : null;
  return [parts, pages].filter(Boolean).join(". ") + ".";
}

/** The book's header and its lesson titles, as the device that uploaded it can rename them. */
function EditBook({ id, book, editKey, onSaved, onCancel }: { id: string; book: BookView; editKey: string; onSaved(book: BookView): void; onCancel(): void }) {
  const [title, setTitle] = useState(book.title ?? "");
  const [subject, setSubject] = useState(book.subject ?? "");
  const [level, setLevel] = useState(book.level ?? "");
  const [titles, setTitles] = useState(book.lessons.map((lesson) => lesson.title));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-edit-key": editKey },
        body: JSON.stringify({
          title,
          subject: subject.trim() || null,
          level: level.trim() || null,
          lessonTitles: titles.map((t, i) => ({ n: i + 1, title: t })).filter((t, i) => t.title !== book.lessons[i]!.title),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as BookView & { error?: string };
      if (!res.ok) throw new Error(body.error ?? OFFLINE);
      onSaved(body);
    } catch (e) {
      setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : OFFLINE);
      setSaving(false);
    }
  }

  const field = "mt-1 w-full rounded-lg border border-line bg-board px-3 py-2 font-bold focus:border-spoken focus:outline-none";
  return (
    <form onSubmit={save} className="mt-6 space-y-6 rounded-2xl border border-line bg-panel p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <label className="block text-sm font-bold text-dust">
          Title
          <input required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} className={`${field} text-lg text-chalk`} />
        </label>
        <label className="block text-sm font-bold text-dust">
          Subject
          <input maxLength={80} value={subject} onChange={(e) => setSubject(e.target.value)} className={`${field} text-chalk`} />
        </label>
        <label className="block text-sm font-bold text-dust">
          Level
          <input maxLength={40} value={level} onChange={(e) => setLevel(e.target.value)} className={`${field} text-chalk`} />
        </label>
      </div>
      <fieldset>
        <legend className="text-sm font-bold text-dust">Lesson titles</legend>
        <ol className="mt-2 space-y-2">
          {titles.map((t, i) => (
            <li key={i} className="flex items-center gap-3">
              <span aria-hidden className="w-6 shrink-0 text-right font-extrabold text-spoken">
                {i + 1}
              </span>
              <input
                required
                maxLength={160}
                aria-label={`Title of lesson ${i + 1}`}
                value={t}
                onChange={(e) => setTitles((all) => all.map((old, j) => (j === i ? e.target.value : old)))}
                className={`${field} mt-0 text-chalk`}
              />
            </li>
          ))}
        </ol>
      </fieldset>
      {error && (
        <p role="alert" className="rounded-lg border border-danger/40 px-4 py-3 text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={saving} className="rounded-lg bg-spoken px-6 py-3 font-extrabold text-board disabled:opacity-40">
          {saving ? "Saving…" : "Save the titles"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-line px-6 py-3 font-bold hover:bg-board">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function BookLessons({ id }: { id: string }) {
  const { book, missing, setBook } = useBook(id);
  const [open, setOpen] = useState<number | null>(null);
  // Only the device that uploaded the book holds its key, and so can rename it.
  const [editKey] = useState(() => bookEditKey(id));
  const [editing, setEditing] = useState(false);

  if (missing) {
    return (
      <div>
        <p className="text-lg">This book doesn&apos;t exist.</p>
        <Link href="/create" className="mt-4 inline-block font-bold text-spoken underline underline-offset-4">
          Upload a book
        </Link>
      </div>
    );
  }
  if (!book) return <p className="text-dust">Loading the book…</p>;

  return (
    <div>
      <header>
        <p className="flex items-center gap-2 text-sm font-bold text-dust">
          <BookOpen aria-hidden className="size-4" />
          {book.fileName}
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{book.title ?? "Your book"}</h1>
          {book.status === "ready" && editKey && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 font-bold text-dust hover:bg-panel hover:text-chalk"
            >
              <Pencil aria-hidden className="size-4" />
              Edit the titles
            </button>
          )}
        </div>
        {book.status === "ready" && <p className="mt-2 text-lg text-dust">{describeBook(book)}</p>}
      </header>

      {editing && editKey && (
        <EditBook
          id={id}
          book={book}
          editKey={editKey}
          onSaved={(saved) => {
            setBook(saved);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      {(book.status === "uploading" || book.status === "reading") && (
        <section aria-live="polite" className="mt-8 rounded-2xl border border-line bg-panel p-6">
          <p className="flex items-center gap-2 text-lg font-extrabold">
            <span aria-hidden className="size-2 rounded-full bg-spoken motion-safe:animate-pulse" />
            Muse Spark is reading the book
          </p>
          {book.progress ? (
            <>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-board">
                <div
                  className="h-full rounded-full bg-spoken transition-[width] duration-700"
                  style={{ width: `${Math.round((book.progress.read / book.progress.slices) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-dust">
                {book.progress.read} of {book.progress.slices} parts read{book.pageCount ? `, ${book.pageCount} pages in all` : ""}.
              </p>
            </>
          ) : (
            <p className="mt-2 text-dust">Opening the PDF…</p>
          )}
          <p className="mt-4 text-dust">It splits the book into lessons. Then you choose which ones to make into videos.</p>
        </section>
      )}

      {book.status === "failed" && (
        <div role="alert" className="mt-8 rounded-xl border border-danger/40 px-4 py-3">
          <p className="text-danger">{book.error ?? "This book couldn't be read."}</p>
          <Link href="/create" className="mt-3 inline-block font-bold text-chalk underline underline-offset-4">
            Upload another PDF
          </Link>
        </div>
      )}

      {book.status === "ready" && !editing && (
        <section className="mt-10">
          <h2 className="text-xl font-extrabold">
            {book.lessons.length} {book.lessons.length === 1 ? "lesson" : "lessons"} in this book
          </h2>
          <p className="mt-1 text-dust">Pick a lesson to make its video. Nothing is made until you ask.</p>
          <ol className="mt-6 space-y-4">
            {book.lessons.map((lesson) => (
              <LessonItem
                key={lesson.n}
                bookId={id}
                bookLanguage={book.language}
                lesson={lesson}
                open={open === lesson.n}
                onOpen={() => setOpen(lesson.n)}
                onClose={() => setOpen(null)}
              />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
