import { describe, expect, test } from "vitest";
import { makeLesson } from "../lesson/lesson.fixture";
import { narrationGroups } from "../lesson/narration";
import { FPS, VideoProps } from "./props";
import { END_CARD_TEXT, buildVideoProps } from "./timeline";
import { timedWordsFor } from "./words.fixture";

function input(sceneCount = 6, language: "fr" | "pcm" = "pcm") {
  const lesson = makeLesson(sceneCount);
  const { words, audioSeconds } = timedWordsFor(narrationGroups(lesson, language));
  const sceneImageUrls = lesson.scenes.map((_, i) => `https://x/lessons/abc/scenes/${i + 1}.jpg`);
  return { lesson, language, words, audioUrl: "https://x/lessons/abc/voice.wav", audioSeconds, sceneImageUrls };
}

const frame = (seconds: number) => Math.round(seconds * FPS);

describe("buildVideoProps", () => {
  test("title, scenes and end card tile the timeline without gaps", () => {
    const p = buildVideoProps(input());
    expect(p.title.startFrame).toBe(0);
    expect(p.scenes[0]!.startFrame).toBe(p.title.endFrame);
    p.scenes.slice(1).forEach((s, i) => expect(s.startFrame).toBe(p.scenes[i]!.endFrame));
    expect(p.endCard.startFrame).toBe(p.scenes.at(-1)!.endFrame);
    expect(p.endCard.endFrame - p.endCard.startFrame).toBe(50);
    expect(p.durationInFrames).toBe(p.endCard.endFrame);
  });

  test("the result validates against VideoProps", () => {
    expect(VideoProps.safeParse(buildVideoProps(input())).success).toBe(true);
  });

  test("each scene starts 0.25 s before its group's first word", () => {
    const args = input();
    const p = buildVideoProps(args);
    p.scenes.forEach((scene, i) => {
      const first = args.words.find((w) => w.group === i + 1)!;
      expect(scene.startFrame).toBe(frame(first.start - 0.25));
    });
  });

  test("the title card lasts until scene 1 starts, so at least 3 s with voice-shaped timings", () => {
    const p = buildVideoProps(input());
    expect(p.title.endFrame).toBeGreaterThanOrEqual(75);
  });

  test("the last scene covers the audio end plus 0.5 s", () => {
    const args = input();
    expect(buildVideoProps(args).scenes.at(-1)!.endFrame).toBe(frame(args.audioSeconds + 0.5));
  });

  test("title, subject, level and end card are in the chosen language; the title background is scene 1", () => {
    const args = input(6, "fr");
    const p = buildVideoProps(args);
    expect(p.title).toMatchObject({ text: args.lesson.title.fr, subject: "Sciences", level: "CM1", backgroundUrl: args.sceneImageUrls[0] });
    expect(p.endCard.text).toBe(END_CARD_TEXT.fr);
    expect(p.scenes.map((s) => s.imageUrl)).toEqual(args.sceneImageUrls);
  });

  test("captions: at most 10 words, never across a sentence end, each word inside its caption", () => {
    const p = buildVideoProps(input());
    expect(p.captions.length).toBeGreaterThan(0);
    for (const caption of p.captions) {
      expect(caption.words.length).toBeLessThanOrEqual(10);
      caption.words.slice(0, -1).forEach((w) => expect(w.text).not.toMatch(/[.!?]$/));
      for (const w of caption.words) {
        expect(w.startFrame).toBeGreaterThanOrEqual(caption.startFrame);
        expect(w.startFrame).toBeLessThan(caption.endFrame);
      }
    }
  });

  test("no caption during the title card", () => {
    const p = buildVideoProps(input());
    expect(Math.min(...p.captions.map((c) => c.startFrame))).toBeGreaterThanOrEqual(p.title.endFrame);
  });

  test("an unaligned word (score 0) still appears in a caption", () => {
    const args = input();
    const unaligned = args.words.find((w) => w.score === 0 && w.group > 0)!;
    expect(unaligned).toBeDefined();
    const texts = buildVideoProps(args).captions.flatMap((c) => c.words.map((w) => w.text));
    expect(texts).toContain(unaligned.word);
  });

  test("motions cycle zoom-in, pan-left, zoom-out, pan-right", () => {
    expect(buildVideoProps(input(5)).scenes.map((s) => s.motion)).toEqual(["zoom-in", "pan-left", "zoom-out", "pan-right", "zoom-in"]);
  });

  test("a one-scene lesson still gives a valid VideoProps", () => {
    const args = input(5);
    const one = { ...args, lesson: { ...args.lesson, scenes: args.lesson.scenes.slice(0, 1) }, sceneImageUrls: args.sceneImageUrls.slice(0, 1) };
    const timed = timedWordsFor(narrationGroups(one.lesson, "pcm"));
    const p = buildVideoProps({ ...one, ...timed });
    expect(VideoProps.safeParse(p).success).toBe(true);
    expect(p.scenes).toHaveLength(1);
  });

  test("throws when the number of scene images does not match the scenes", () => {
    const args = input();
    expect(() => buildVideoProps({ ...args, sceneImageUrls: args.sceneImageUrls.slice(1) })).toThrow(/scene images/);
  });
});
