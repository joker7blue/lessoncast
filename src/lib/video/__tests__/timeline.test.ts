import { describe, expect, test } from "vitest";
import { makeLesson } from "../../lesson/lesson.fixture";
import { narrationGroups } from "../../lesson/narration";
import type { SceneHighlights } from "../highlights";
import { FPS, VideoProps } from "../props";
import { END_CARD_TEXT, buildVideoProps } from "../timeline";
import { timedWordsFor } from "../words.fixture";

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

describe("buildVideoProps highlights", () => {
  const shape = { d: "M0 0L10 0L10 10Z", left: 100, top: 50, scaleX: 2, scaleY: 2, confidence: 0.9 };
  // Every scene of makeLesson names the heart; scene 1 also gets the phrases passed here.
  function highlights(sceneCount: number, extra: { fr: string; pcm: string }[] = []): SceneHighlights[] {
    return Array.from({ length: sceneCount }, (_, i) => ({
      imageWidth: 2048,
      imageHeight: 1152,
      objects: [
        { samPrompt: "heart", fr: "cœur", pcm: "Heart", shapes: [shape] },
        ...(i === 0 ? extra.map((e) => ({ samPrompt: "x", ...e, shapes: [shape] })) : []),
      ],
    }));
  }
  const sceneWords = (args: ReturnType<typeof input>, scene: number) => args.words.filter((w) => w.group === scene + 1);

  test("a highlight is lit from 0.15 s before its phrase, for at least 2 s", () => {
    const args = input(6, "fr");
    const p = buildVideoProps({ ...args, highlights: highlights(6) });
    const heart = sceneWords(args, 0)[1]!; // "Le cœur bat…"
    expect(p.scenes[0]!.overlay).toEqual({
      width: 2048,
      height: 1152,
      highlights: [{ startFrame: frame(heart.start - 0.15), endFrame: frame(heart.start - 0.15 + 2), shapes: [shape] }],
    });
  });

  test("a long phrase stays lit until 1.2 s after its last word", () => {
    const args = input(6, "fr");
    const p = buildVideoProps({ ...args, highlights: highlights(6, [{ fr: "Le cœur bat dans la poitrine", pcm: "-" }]) });
    const words = sceneWords(args, 0);
    const lit = p.scenes[0]!.overlay!.highlights[1]!;
    expect(lit.startFrame).toBe(frame(words[0]!.start - 0.15));
    expect(lit.endFrame).toBe(frame(words[5]!.end + 1.2));
  });

  test("a highlight is clipped at its scene's end", () => {
    const args = input(6);
    const p = buildVideoProps({ ...args, highlights: highlights(6, [{ fr: "-", pcm: "scene" }]) });
    expect(p.scenes[0]!.overlay!.highlights[1]!.endFrame).toBe(p.scenes[0]!.endFrame);
  });

  test("a highlight in the scene's last half second is dropped", () => {
    const args = input(6);
    const next = sceneWords(args, 1)[0]!;
    const word = sceneWords(args, 0).find((w) => w.word === "scene")!;
    word.start = next.start - 0.25 - 0.3;
    word.end = word.start + 0.3;
    const p = buildVideoProps({ ...args, highlights: highlights(6, [{ fr: "-", pcm: "scene" }]) });
    expect(p.scenes[0]!.overlay!.highlights).toHaveLength(1);
  });

  test("a highlight whose phrase isn't found is dropped, and a scene with none has no overlay", () => {
    const args = input(6);
    const none = highlights(6).map((s) => ({ ...s, objects: s.objects.map((o) => ({ ...o, pcm: "lungs" })) }));
    const p = buildVideoProps({ ...args, highlights: none });
    expect(p.scenes.map((s) => s.overlay)).toEqual(Array(6).fill(null));
  });

  test("the Pidgin video uses the pcm phrases", () => {
    const args = input(6, "pcm");
    const p = buildVideoProps({ ...args, highlights: highlights(6, [{ fr: "poitrine", pcm: "chest" }]) });
    const chest = sceneWords(args, 0).find((w) => w.word === "chest.")!;
    expect(p.scenes[0]!.overlay!.highlights[1]!.startFrame).toBe(frame(chest.start - 0.15));
  });

  test("the caption words of a lit phrase carry litUntilFrame", () => {
    const args = input(6, "fr");
    const p = buildVideoProps({ ...args, highlights: highlights(6, [{ fr: "la poitrine", pcm: "-" }]) });
    const [heart, chest] = p.scenes[0]!.overlay!.highlights;
    const lit = p.captions.flatMap((c) => c.words).filter((w) => w.litUntilFrame !== undefined);
    expect(lit.slice(0, 3).map((w) => [w.text, w.litUntilFrame])).toEqual([
      ["cœur", heart!.endFrame],
      ["la", chest!.endFrame],
      ["poitrine.", chest!.endFrame],
    ]);
  });

  test("the result with highlights validates against VideoProps", () => {
    expect(VideoProps.safeParse(buildVideoProps({ ...input(), highlights: highlights(6) })).success).toBe(true);
  });

  test("without highlights every overlay is null and no word is lit", () => {
    const p = buildVideoProps(input());
    expect(p.scenes.every((s) => s.overlay === null)).toBe(true);
    expect(p.captions.flatMap((c) => c.words).some((w) => w.litUntilFrame !== undefined)).toBe(false);
  });

  test("props without overlays, from before highlights, still validate", () => {
    const p = buildVideoProps(input());
    const old = {
      ...p,
      scenes: p.scenes.map((scene) => {
        const before: Partial<typeof scene> = { ...scene };
        delete before.overlay;
        return before;
      }),
    };
    expect(VideoProps.safeParse(old).success).toBe(true);
  });
});
