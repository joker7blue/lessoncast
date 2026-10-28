"use client";

// A real LessonCast video. It plays by itself, muted, only on wide screens: on a phone it waits for
// a tap, so the home page doesn't spend the visitor's mobile data.

import { useEffect, useRef } from "react";

export function HeroVideo({ src, poster }: { src: string; poster: string }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.current?.play().catch(() => {});
    }
  }, []);
  return (
    <video
      ref={video}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      controls
      preload="none"
      className="aspect-video w-full rounded-2xl border border-line bg-panel shadow-[0_30px_80px_-30px_rgb(255_212_0_/_0.25)]"
    />
  );
}
