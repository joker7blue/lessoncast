// The contract between the pipeline and the Remotion composition: everything the video shows, with
// every part placed in frames. Built by buildVideoProps (timeline.ts), rendered by LessonVideo.

import { z } from "zod";
import { Language } from "../lesson/schema";

export const FPS = 25;
export const WIDTH = 854;
export const HEIGHT = 480;

export const Motion = z.enum(["zoom-in", "pan-left", "zoom-out", "pan-right"]);
export type Motion = z.infer<typeof Motion>;

const Frame = z.int().nonnegative();
const Window = z.object({ startFrame: Frame, endFrame: Frame });
const ordered = (part: { startFrame: number; endFrame: number }) => part.endFrame > part.startFrame;
const ORDER = "endFrame must come after startFrame";

export const VideoProps = z.object({
  language: Language,
  durationInFrames: z.int().positive(),
  audioUrl: z.url(),
  title: Window.extend({ text: z.string(), subject: z.string(), level: z.string(), backgroundUrl: z.url() }).refine(ordered, ORDER),
  scenes: z.array(Window.extend({ imageUrl: z.url(), motion: Motion }).refine(ordered, ORDER)).min(1),
  captions: z.array(Window.extend({ words: z.array(Window.extend({ text: z.string() })).min(1) })),
  endCard: Window.extend({ text: z.string() }).refine(ordered, ORDER),
});
export type VideoProps = z.infer<typeof VideoProps>;
