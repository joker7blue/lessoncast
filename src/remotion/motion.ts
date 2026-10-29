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

const LIT_IN_FRAMES = 6;
const LIT_OUT_FRAMES = 8;

/** How lit a highlight is at `frame`: 0 → 1 over its first 6 frames, back to 0 over its last 8,
 * eased so the cut-out settles rather than snaps. */
export function highlightLevel(frame: number, startFrame: number, endFrame: number): number {
  const t = clamp01(Math.min((frame - startFrame) / LIT_IN_FRAMES, (endFrame - frame) / LIT_OUT_FRAMES));
  return t * t * (3 - 2 * t);
}

/** Where `object-fit: cover` puts an image in a box: its scale, and the offset of its top-left corner. */
export function coverFit(box: { width: number; height: number }, image: { width: number; height: number }) {
  const scale = Math.max(box.width / image.width, box.height / image.height);
  return { scale, x: (box.width - image.width * scale) / 2, y: (box.height - image.height * scale) / 2 };
}

type QuizQuestion = NonNullable<VideoProps["quiz"]>["questions"][number];

/** The choice the voice is reading at `frame`, or -1 before the first and from the countdown on. */
export function readingChoice(question: QuizQuestion, frame: number): number {
  if (frame >= question.countdownStartFrame) return -1;
  return question.choices.findLastIndex((choice) => frame >= choice.startFrame);
}

/** During the silence before the answer: the number to show (3, 2, 1) and how much of it has passed. */
export function countdown(question: QuizQuestion, frame: number): { number: number; progress: number } | null {
  const { countdownStartFrame: start, revealFrame: end } = question;
  if (frame < start || frame >= end) return null;
  const progress = (frame - start) / (end - start);
  return { number: Math.min(3, Math.max(1, 3 - Math.floor(progress * 3))), progress: Math.round(progress * 1000) / 1000 };
}
