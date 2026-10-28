// Pure helpers for the composition: camera motion, fades, and which caption and word are live.

import type { Motion, VideoProps } from "../lib/video/props";

type Caption = VideoProps["captions"][number];

const ZOOM = 1.08;
const PAN_PERCENT = 2;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const round = (x: number) => Math.round(x * 10000) / 10000 + 0; // + 0 turns -0 into 0

/** CSS transform of a scene image at `progress` (0 → 1) through its scene. */
export function motionTransform(motion: Motion, progress: number): string {
  const p = clamp01(progress);
  const scale = motion === "zoom-in" ? 1 + (ZOOM - 1) * p : motion === "zoom-out" ? ZOOM - (ZOOM - 1) * p : ZOOM;
  const x = motion === "pan-left" ? PAN_PERCENT - 2 * PAN_PERCENT * p : motion === "pan-right" ? -PAN_PERCENT + 2 * PAN_PERCENT * p : 0;
  return `scale(${round(scale)}) translateX(${round(x)}%)`;
}

/** 0 → 1 over the first `fadeFrames`, 1 → 0 over the last ones. Pass Infinity as endFrame to only fade in. */
export function fadeOpacity(frame: number, startFrame: number, endFrame: number, fadeFrames = 12): number {
  return clamp01(Math.min((frame - startFrame) / fadeFrames, (endFrame - frame) / fadeFrames));
}

export function activeCaption(captions: Caption[], frame: number): Caption | null {
  return captions.find((c) => frame >= c.startFrame && frame < c.endFrame) ?? null;
}

/** Index of the last word whose speech has started at `frame`, or -1 before the first one. It stays
 * lit through the short silences between words (100 ms is common), so the highlight never flickers. */
export function activeWordIndex(caption: Caption, frame: number): number {
  return caption.words.findLastIndex((w) => frame >= w.startFrame);
}
