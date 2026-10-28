"use client";

// The teacher adds the pages one photo at a time, picks the language and the image style, and sends.
// Each photo is shrunk to a JPEG of at most 1600 px as soon as it is added.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { resizeToJpeg, UnsupportedImageError } from "@/lib/image/resize";
import { type Language, MAX_PAGES } from "@/lib/lesson/schema";
import { rememberLesson } from "@/lib/lessons/remembered";
import { ArtStyle, AUTO_STYLE, STYLES, type StyleChoice } from "@/lib/lesson/styles";

type Page = { key: string; blob: Blob; url: string };

const UNSUPPORTED = "This photo format isn't supported. Take the photo with the phone's camera.";
const OFFLINE = "Sending failed. Check the internet connection and try again.";

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "fr", label: "French" },
  { value: "pcm", label: "Pidgin" },
];

const STYLE_CHOICES: { value: StyleChoice; label: string; description: string }[] = [
  { value: "auto", ...AUTO_STYLE },
  ...ArtStyle.options.map((value) => ({ value, label: STYLES[value].label, description: STYLES[value].description })),
];

export function UploadForm() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [language, setLanguage] = useState<Language>("fr");
  const [style, setStyle] = useState<StyleChoice>("auto");
  const [adding, setAdding] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Thumbnails are object URLs: free them when the page goes away.
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  async function addPage(file: File | undefined) {
    if (!file) return;
    setError(null);
    setAdding(true);
    try {
      const blob = await resizeToJpeg(file);
      const url = URL.createObjectURL(blob);
      urls.current.push(url);
      setPages((current) => [...current, { key: crypto.randomUUID(), blob, url }]);
    } catch (e) {
      setError(e instanceof UnsupportedImageError ? UNSUPPORTED : "This photo couldn't be read. Try again.");
    } finally {
      setAdding(false);
      if (input.current) input.current.value = "";
    }
  }

  function removePage(key: string) {
    setPages((current) => current.filter((page) => page.key !== key));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pages.length === 0 || sending) return;
    setSending(true);
    setError(null);
    const form = new FormData();
    pages.forEach((page, i) => form.append("photos", page.blob, `page-${i + 1}.jpg`));
    form.append("language", language);
    form.append("style", style);
    try {
      const res = await fetch("/api/lessons", { method: "POST", body: form });
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
    <form onSubmit={submit} className="mt-10 grid items-start gap-10 lg:grid-cols-2 lg:gap-12">
      <section aria-labelledby="pages-heading">
        <h2 id="pages-heading" className="text-xl font-extrabold">
          Textbook pages
        </h2>
        <p className="mt-1 text-dust">Up to four pages of one lesson, in order.</p>
        <ol className="mt-4 grid grid-cols-2 gap-3">
          {pages.map((page, i) => (
            <li key={page.key} className="relative overflow-hidden rounded-lg border border-line bg-panel">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL, nothing to optimize */}
              <img src={page.url} alt={`Page ${i + 1}`} className="aspect-[3/4] w-full object-cover" />
              <span className="absolute top-2 left-2 rounded-md bg-board/85 px-2 py-0.5 text-sm font-extrabold">
                {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removePage(page.key)}
                aria-label={`Remove page ${i + 1}`}
                className="absolute top-2 right-2 grid size-8 place-items-center rounded-md bg-board/85 text-lg leading-none font-bold"
              >
                ×
              </button>
            </li>
          ))}
          {pages.length < MAX_PAGES && (
            <li>
              <label
                className={`flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line px-3 text-center font-bold transition-colors hover:border-spoken ${adding ? "opacity-60" : ""}`}
              >
                <span aria-hidden className="text-3xl leading-none text-spoken">
                  +
                </span>
                {adding ? "Preparing…" : pages.length === 0 ? "Photograph a page" : "Add a page"}
                <input
                  ref={input}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  disabled={adding || sending}
                  onChange={(e) => addPage(e.target.files?.[0])}
                />
              </label>
            </li>
          )}
        </ol>
      </section>

      <div className="space-y-10">
        <fieldset>
          <legend className="text-xl font-extrabold">Video language</legend>
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-panel p-1">
            {LANGUAGES.map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-md py-2.5 text-center font-bold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-spoken ${language === option.value ? "bg-chalk text-board" : "text-dust"}`}
              >
                <input
                  type="radio"
                  name="language"
                  value={option.value}
                  checked={language === option.value}
                  onChange={() => setLanguage(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xl font-extrabold">Picture style</legend>
          <div className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line">
            {STYLE_CHOICES.map((option) => {
              const selected = style === option.value;
              return (
                <label
                  key={option.value}
                  className={`block cursor-pointer border-l-4 px-4 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-spoken ${selected ? "border-l-spoken bg-panel" : "border-l-transparent"}`}
                >
                  <input
                    type="radio"
                    name="style"
                    value={option.value}
                    checked={selected}
                    onChange={() => setStyle(option.value)}
                    className="sr-only"
                  />
                  <span className="block font-bold">{option.label}</span>
                  <span className="block text-dust">{option.description}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div>
          {error && (
            <p role="alert" className="mb-4 rounded-lg border border-danger/40 px-4 py-3 text-danger">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pages.length === 0 || adding || sending}
            className="w-full rounded-lg bg-spoken py-4 text-lg font-extrabold text-board transition-opacity disabled:opacity-40"
          >
            {sending ? "Sending the pages…" : "Create the lesson"}
          </button>
          <p className="mt-3 text-center text-dust">The video is ready in about four minutes.</p>
        </div>
      </div>
    </form>
  );
}
