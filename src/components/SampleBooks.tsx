"use client";

// Sample textbooks to try LessonCast with, in a dialog of covers: each one goes straight into the PDF form, as
// if it had been picked from the device, can be read first in a second dialog on top, or can be downloaded.

import { Download, Eye, FileText, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { SAMPLE_BOOKS, type SampleBook } from "@/lib/books/samples";

const PRIMARY = "inline-flex items-center justify-center gap-2 rounded-lg bg-spoken px-4 py-2 font-extrabold text-board disabled:opacity-60";
const SECONDARY = "inline-flex items-center justify-center gap-2 rounded-lg border border-line px-4 py-2 font-bold hover:bg-board";

function CloseButton({ label, onClose }: { label: string; onClose(): void }) {
  return (
    <button type="button" onClick={onClose} aria-label={label} className="grid size-9 shrink-0 place-items-center rounded-lg text-dust hover:bg-board hover:text-chalk">
      <X aria-hidden className="size-5" />
    </button>
  );
}

export function SampleBooks({ onUse }: { onUse(file: File): void }) {
  const list = useRef<HTMLDialogElement>(null);
  const viewer = useRef<HTMLDialogElement>(null);
  const [previewed, setPreviewed] = useState<SampleBook | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function use(sample: SampleBook) {
    setLoading(sample.url);
    setError(null);
    try {
      const res = await fetch(sample.url);
      if (!res.ok) throw new Error(`${res.status}`);
      onUse(new File([await res.blob()], `${sample.title}.pdf`, { type: "application/pdf" }));
      viewer.current?.close();
      list.current?.close();
    } catch {
      setError("The sample couldn't be loaded. Check the internet connection and try again.");
    } finally {
      setLoading(null);
    }
  }

  function preview(sample: SampleBook) {
    setPreviewed(sample);
    viewer.current?.showModal();
  }

  function actions(sample: SampleBook, withPreview: boolean) {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => use(sample)} disabled={loading !== null} className={PRIMARY}>
          {loading === sample.url ? "Loading the book…" : "Use this book"}
        </button>
        {withPreview && (
          <button type="button" onClick={() => preview(sample)} className={SECONDARY}>
            <Eye aria-hidden className="size-4" />
            Preview
          </button>
        )}
        <a href={sample.url} download className={SECONDARY}>
          <Download aria-hidden className="size-4" />
          Download
        </a>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => list.current?.showModal()}
        className="mt-4 inline-flex items-center gap-2 font-bold text-spoken underline underline-offset-4"
      >
        <FileText aria-hidden className="size-4" />
        No PDF at hand? Try a sample textbook
      </button>

      <dialog
        ref={list}
        aria-labelledby="sample-books-title"
        className="m-auto w-[calc(100%-2rem)] max-w-5xl rounded-2xl border border-line bg-panel p-0 text-chalk shadow-2xl backdrop:bg-black/60"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
          <div>
            <h2 id="sample-books-title" className="text-2xl font-extrabold">
              Sample textbooks
            </h2>
            <p className="mt-1 text-dust">Free to use. Read one first, use it right away, or download it and upload it yourself.</p>
          </div>
          <CloseButton label="Close the sample textbooks" onClose={() => list.current?.close()} />
        </div>

        <ul className="grid max-h-[75vh] gap-6 overflow-y-auto p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
          {SAMPLE_BOOKS.map((sample) => (
            <li key={sample.url} className="relative overflow-hidden rounded-xl border border-line bg-white shadow-lg">
              <Image
                src={sample.cover}
                alt=""
                width={600}
                height={850}
                sizes="(max-width: 640px) 100vw, 320px"
                className="aspect-[3/4] w-full object-cover object-top"
              />
              <button
                type="button"
                onClick={() => preview(sample)}
                aria-label={`Preview ${sample.title}`}
                title="Preview"
                className="absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
              >
                <Eye aria-hidden className="size-5" />
              </button>
              {/* The book's name and what it holds, over the bottom of its cover. */}
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/75 to-transparent px-4 pt-20 pb-4 text-white">
                <p className="text-lg leading-snug font-extrabold">{sample.title}</p>
                <p className="mt-0.5 text-xs font-bold text-white/70">
                  {sample.subject}, {sample.level}, in {sample.language}, {sample.pages} pages
                </p>
                <p className="mt-2 line-clamp-2 text-sm leading-snug text-white/85">{sample.description}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => use(sample)} disabled={loading !== null} className={`${PRIMARY} flex-1`}>
                    {loading === sample.url ? "Loading the book…" : "Use this book"}
                  </button>
                  <a
                    href={sample.url}
                    download
                    aria-label={`Download ${sample.title}`}
                    title="Download"
                    className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/15 transition-colors hover:bg-white/25"
                  >
                    <Download aria-hidden className="size-5" />
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {error && (
          <p role="alert" className="border-t border-line px-5 py-4 text-danger sm:px-6">
            {error}
          </p>
        )}
      </dialog>

      {/* The sample's pages, on top of the list. */}
      <dialog
        ref={viewer}
        aria-label={previewed ? `${previewed.title}, its pages` : "A sample textbook's pages"}
        onClose={() => setPreviewed(null)}
        className="m-auto h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-5xl rounded-2xl border border-line bg-panel p-0 text-chalk shadow-2xl backdrop:bg-black/70"
      >
        {previewed && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
              <p className="truncate text-lg font-extrabold">{previewed.title}</p>
              <CloseButton label="Close the preview" onClose={() => viewer.current?.close()} />
            </div>
            <iframe src={`${previewed.url}#view=FitH`} title={`${previewed.title}, its pages`} className="min-h-0 w-full flex-1 bg-white" />
            <div className="border-t border-line px-5 py-3">{actions(previewed, false)}</div>
          </div>
        )}
      </dialog>
    </>
  );
}
