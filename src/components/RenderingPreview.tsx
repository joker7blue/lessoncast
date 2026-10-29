"use client";

// Where the video will be, while SAM cuts out the objects and Remotion puts the video together: the
// scenes play one after another under a dotted veil, so the page shows at a glance that the video is
// being made. Remotion reports no progress until the end, so the veil sweeps rather than fills.

import { useEffect, useState } from "react";

const SLIDE_MS = 2500;

export function RenderingPreview({ urls, label }: { urls: string[]; label: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (urls.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setShown((i) => (i + 1) % urls.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, [urls.length]);
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-panel" aria-live="polite">
      {urls.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- the scenes, already loaded in the gallery below
        <img
          key={url}
          src={url}
          alt=""
          aria-hidden
          className={`absolute inset-0 size-full scale-105 object-cover brightness-[.45] blur-[2px] transition-opacity duration-1000 ${i === shown ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div aria-hidden className="scene-dots absolute inset-0 opacity-70" />
      <div aria-hidden className="scene-sweep absolute inset-0" />
      <div className="absolute inset-0 grid place-items-center p-4 text-center">
        <p className="flex items-center gap-2.5 rounded-full bg-board/80 px-4 py-2 font-extrabold">
          <span className="size-2 shrink-0 rounded-full bg-spoken motion-safe:animate-pulse" />
          {label}
        </p>
      </div>
    </div>
  );
}
