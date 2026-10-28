// Turns the lesson, the voice's word timings and the scene images into VideoProps. The parts tile the
// audio exactly: the title card until scene 1, each scene from 0.25 s before its first word to the
// next scene, the last scene until 0.5 s after the voice ends, then a 2 s end card. A SAM cut-out is
// lit when the voice says the phrase that names it, within its scene.

import type { Language, Lesson } from "../lesson/schema";
import type { SceneHighlights } from "./highlights";
import { findPhrase } from "./phrase";
import { FPS, type Motion, type VideoProps } from "./props";
import type { TimedWord } from "./words";

export const END_CARD_TEXT: Record<Language, string> = {
  fr: "Revois cette leçon ce soir avec tes parents",
  pcm: "Watch dis lesson again tonight with your papa and mama",
};

const MOTIONS: Motion[] = ["zoom-in", "pan-left", "zoom-out", "pan-right"];
const SCENE_LEAD_SECONDS = 0.25;
const TAIL_SECONDS = 0.5;
const END_CARD_FRAMES = 2 * FPS;
const MAX_CAPTION_WORDS = 10;
const LIT_LEAD_SECONDS = 0.15;
const LIT_TAIL_SECONDS = 1.2;
const LIT_MIN_SECONDS = 2;
const LIT_MIN_FRAMES = Math.round(0.5 * FPS);

const toFrame = (seconds: number) => Math.max(0, Math.round(seconds * FPS));

type Scene = VideoProps["scenes"][number];

/** The scene's lit highlights, and how long each word that names one stays lit. */
function overlayFor(
  found: SceneHighlights | undefined,
  words: TimedWord[],
  language: Language,
  scene: { startFrame: number; endFrame: number },
  litUntil: Map<TimedWord, number>,
): Scene["overlay"] {
  if (!found) return null;
  const highlights = found.objects.flatMap((object) => {
    const match = findPhrase(words, object[language]);
    if (!match) return [];
    const start = words[match.first]!.start - LIT_LEAD_SECONDS;
    const end = Math.max(words[match.last]!.end + LIT_TAIL_SECONDS, start + LIT_MIN_SECONDS);
    const startFrame = Math.max(toFrame(start), scene.startFrame);
    const endFrame = Math.min(toFrame(end), scene.endFrame);
    if (endFrame - startFrame < LIT_MIN_FRAMES) return [];
    for (const word of words.slice(match.first, match.last + 1)) litUntil.set(word, Math.max(litUntil.get(word) ?? 0, endFrame));
    return [{ startFrame, endFrame, shapes: object.shapes }];
  });
  return highlights.length > 0 ? { width: found.imageWidth, height: found.imageHeight, highlights } : null;
}

/** Splits one scene's words into captions: at sentence ends and every 10 words. */
function captionsFor(words: TimedWord[], sceneEndFrame: number, litUntil: Map<TimedWord, number>): VideoProps["captions"] {
  const chunks: TimedWord[][] = [];
  let current: TimedWord[] = [];
  for (const word of words) {
    current.push(word);
    if (/[.!?]$/.test(word.word) || current.length === MAX_CAPTION_WORDS) {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length > 0) chunks.push(current);

  return chunks.map((chunk, i) => ({
    startFrame: toFrame(chunk[0]!.start),
    endFrame: i + 1 < chunks.length ? toFrame(chunks[i + 1]![0]!.start) : sceneEndFrame,
    words: chunk.map((w) => {
      const lit = litUntil.get(w);
      return { text: w.word, startFrame: toFrame(w.start), endFrame: toFrame(Math.max(w.end, w.start)), ...(lit === undefined ? {} : { litUntilFrame: lit }) };
    }),
  }));
}

export function buildVideoProps(input: {
  lesson: Lesson;
  language: Language;
  words: TimedWord[];
  audioUrl: string;
  audioSeconds: number;
  sceneImageUrls: string[];
  /** What find-highlights stored, one entry per scene; null or missing renders without highlights. */
  highlights?: SceneHighlights[] | null;
}): VideoProps {
  const { lesson, language, words, audioUrl, audioSeconds, sceneImageUrls, highlights } = input;
  if (sceneImageUrls.length !== lesson.scenes.length) {
    throw new Error(`Expected ${lesson.scenes.length} scene images, got ${sceneImageUrls.length}`);
  }
  const wordsOf = (group: number) => words.filter((w) => w.group === group);

  // Scene i is narration group i + 1. Starts only move forward, at least one frame apart.
  const starts: number[] = [];
  lesson.scenes.forEach((_, i) => {
    const first = wordsOf(i + 1)[0];
    if (!first) throw new Error(`Scene ${i + 1} has no timed words`);
    starts.push(Math.max(toFrame(first.start - SCENE_LEAD_SECONDS), (starts[i - 1] ?? 0) + 1));
  });
  const voiceEnd = Math.max(toFrame(audioSeconds + TAIL_SECONDS), starts.at(-1)! + 1);

  const litUntil = new Map<TimedWord, number>();
  const scenes = lesson.scenes.map((_, i) => {
    const window = { startFrame: starts[i]!, endFrame: starts[i + 1] ?? voiceEnd };
    const overlay = overlayFor(highlights?.[i], wordsOf(i + 1), language, window, litUntil);
    return { imageUrl: sceneImageUrls[i]!, motion: MOTIONS[i % MOTIONS.length]!, ...window, overlay };
  });
  const endCard = { text: END_CARD_TEXT[language], startFrame: voiceEnd, endFrame: voiceEnd + END_CARD_FRAMES };

  return {
    language,
    durationInFrames: endCard.endFrame,
    audioUrl,
    title: {
      text: lesson.title[language],
      subject: lesson.page.subject,
      level: lesson.page.level,
      backgroundUrl: sceneImageUrls[0]!,
      startFrame: 0,
      endFrame: starts[0]!,
    },
    scenes,
    captions: scenes.flatMap((scene, i) => captionsFor(wordsOf(i + 1), scene.endFrame, litUntil)),
    endCard,
  };
}
