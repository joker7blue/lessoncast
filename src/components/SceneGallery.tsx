"use client";

// The scenes of a lesson as Muse Image draws them: each one not drawn yet shows a dotted veil over a
// blurred preview, each new one comes into focus, and any drawn scene opens full size, with the
// arrow keys to move between scenes.

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { SceneImage } from "./SceneImage";

function PendingScene({ preview, n }: { preview: string | null; n: number }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-lg border border-line bg-panel">
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element -- a blurred backdrop of an image already loaded
        <img src={preview} alt="" aria-hidden className="absolute inset-0 size-full scale-125 object-cover opacity-50 blur-xl" />
      )}
      <div aria-hidden className="scene-dots absolute inset-0" />
      <div aria-hidden className="scene-sweep absolute inset-0" />
      <p className="absolute inset-0 grid place-items-center text-sm font-bold text-chalk/90">
        <span className="flex items-center gap-2 rounded-full bg-board/70 px-3 py-1">
          <span className="size-1.5 rounded-full bg-spoken motion-safe:animate-pulse" />
          Drawing scene {n}
        </span>
      </p>
    </div>
  );
}

function Viewer({ urls, index, onMove, onClose }: { urls: string[]; index: number; onMove(index: number): void; onClose(): void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const move = (step: number) => onMove((index + step + urls.length) % urls.length);
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") move(1);
        if (e.key === "ArrowLeft") move(-1);
      }}
      aria-label={`Scene ${index + 1} of ${urls.length}`}
      className="m-auto w-[min(92vw,1280px)] bg-transparent p-0 backdrop:bg-black/85"
    >
      <div className="relative overflow-hidden rounded-xl bg-panel">
        {/* The thumbnail, already loaded, blurred under the large image until it arrives. */}
        <Image src={urls[index]!} alt="" aria-hidden width={854} height={480} sizes="(max-width: 640px) 50vw, 240px" className="absolute inset-0 size-full scale-105 object-cover blur-md" />
        <Image
          key={urls[index]}
          src={urls[index]!}
          alt={`Scene ${index + 1}`}
          width={1920}
          height={1080}
          sizes="92vw"
          className="relative aspect-video w-full object-contain"
          priority
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-chalk">
        <p className="font-bold">
          Scene {index + 1} of {urls.length}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => move(-1)} aria-label="Previous scene" className="grid size-10 place-items-center rounded-lg bg-panel hover:bg-line">
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <button type="button" onClick={() => move(1)} aria-label="Next scene" className="grid size-10 place-items-center rounded-lg bg-panel hover:bg-line">
            <ChevronRight aria-hidden className="size-5" />
          </button>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="grid size-10 place-items-center rounded-lg bg-panel hover:bg-line">
            <X aria-hidden className="size-5" />
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** `urls[i]` is scene i + 1, null until drawn; `slots` is how many scenes the lesson has. */
export function SceneGallery({ urls, slots, drawing }: { urls: (string | null)[]; slots: number; drawing: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  // Scenes appear as they arrive and a page opened later shows them at once: only new ones come into focus.
  const [seen] = useState(() => new Set(urls.flatMap((url, i) => (url ? [i] : []))));
  const drawn = urls.flatMap((url) => (url ? [url] : []));
  const preview = urls[0] ?? null;
  if (slots === 0) return null;
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Scenes">
        {Array.from({ length: slots }, (_, i) => {
          const url = urls[i];
          return (
            <li key={i}>
              {url ? (
                <button
                  type="button"
                  onClick={() => setOpen(drawn.indexOf(url))}
                  aria-label={`Open scene ${i + 1}`}
                  className={`block w-full overflow-hidden rounded-lg transition-transform hover:scale-[1.02] ${seen.has(i) ? "" : "scene-focus"}`}
                >
                  <SceneImage src={url} alt={`Scene ${i + 1}`} sizes="(max-width: 640px) 50vw, 240px" />
                </button>
              ) : drawing ? (
                <PendingScene preview={preview} n={i + 1} />
              ) : (
                <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-line text-sm font-bold text-dust">Scene {i + 1}</div>
              )}
            </li>
          );
        })}
      </ul>
      {open !== null && <Viewer urls={drawn} index={open} onMove={setOpen} onClose={() => setOpen(null)} />}
    </>
  );
}
