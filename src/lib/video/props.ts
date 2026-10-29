// The contract between the pipeline and the Remotion composition: everything the video shows, with
// every part placed in frames. Built by buildVideoProps (timeline.ts), rendered by LessonVideo.

import { z } from "zod";
import { Language } from "../lesson/schema";
import { Shape } from "./highlights";

export const FPS = 25;
export const WIDTH = 854;
export const HEIGHT = 480;

export const Motion = z.enum(["zoom-in", "pan-left", "zoom-out", "pan-right"]);
export type Motion = z.infer<typeof Motion>;

const Frame = z.int().nonnegative();
const Window = z.object({ startFrame: Frame, endFrame: Frame });
const ordered = (part: { startFrame: number; endFrame: number }) => part.endFrame > part.startFrame;
const ORDER = "endFrame must come after startFrame";

/** The SAM cut-outs drawn over a scene image (width × height pixels), each lit for its window. Optional,
 * so props built before highlights still render. */
const Overlay = z.object({
  width: z.int().positive(),
  height: z.int().positive(),
  highlights: z.array(Window.extend({ shapes: z.array(Shape).min(1) }).refine(ordered, ORDER)).min(1),
});

/** The quiz after the last scene: an intro, then each question with its choices lit as the voice reads
 * them, a countdown, and the right answer revealed when the voice says it. Optional, like the overlay. */
const QuizQuestion = Window.extend({
  number: z.int().positive(),
  text: z.string(),
  choices: z.array(z.object({ text: z.string(), startFrame: Frame })).length(3),
  answerIndex: z.int().min(0).max(2),
  countdownStartFrame: Frame,
  revealFrame: Frame,
}).refine(ordered, ORDER);
const Quiz = Window.extend({ title: z.string(), subtitle: z.string(), questions: z.array(QuizQuestion).min(1) }).refine(ordered, ORDER);

export const VideoProps = z.object({
  language: Language,
  durationInFrames: z.int().positive(),
  audioUrl: z.url(),
  title: Window.extend({ text: z.string(), subject: z.string(), level: z.string(), backgroundUrl: z.url() }).refine(ordered, ORDER),
  scenes: z.array(Window.extend({ imageUrl: z.url(), motion: Motion, overlay: Overlay.nullish() }).refine(ordered, ORDER)).min(1),
  // A word that names a lit object stays yellow until litUntilFrame.
  captions: z.array(Window.extend({ words: z.array(Window.extend({ text: z.string(), litUntilFrame: Frame.optional() })).min(1) })),
  quiz: Quiz.nullish(),
  endCard: Window.extend({ text: z.string() }).refine(ordered, ORDER),
});
export type VideoProps = z.infer<typeof VideoProps>;
