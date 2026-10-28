import { describe, expect, test } from "vitest";
import { activeCaption, activeWordIndex, fadeOpacity, motionTransform } from "./motion";

describe("motionTransform", () => {
  test("zoom-in goes from scale(1) to scale(1.08)", () => {
    expect(motionTransform("zoom-in", 0)).toBe("scale(1) translateX(0%)");
    expect(motionTransform("zoom-in", 1)).toBe("scale(1.08) translateX(0%)");
  });

  test("zoom-out goes from scale(1.08) to scale(1)", () => {
    expect(motionTransform("zoom-out", 0)).toBe("scale(1.08) translateX(0%)");
    expect(motionTransform("zoom-out", 1)).toBe("scale(1) translateX(0%)");
  });

  test("pan-left keeps scale(1.08) and moves from 2% to -2%", () => {
    expect(motionTransform("pan-left", 0)).toBe("scale(1.08) translateX(2%)");
    expect(motionTransform("pan-left", 0.5)).toBe("scale(1.08) translateX(0%)");
    expect(motionTransform("pan-left", 1)).toBe("scale(1.08) translateX(-2%)");
  });

  test("pan-right moves from -2% to 2%", () => {
    expect(motionTransform("pan-right", 1)).toBe("scale(1.08) translateX(2%)");
  });

  test("progress outside 0..1 is clamped", () => {
    expect(motionTransform("zoom-in", 1.7)).toBe("scale(1.08) translateX(0%)");
  });
});

describe("fadeOpacity", () => {
  test("ramps up over 12 frames, holds at 1, ramps down over the last 12 frames", () => {
    expect(fadeOpacity(0, 0, 100)).toBe(0);
    expect(fadeOpacity(6, 0, 100)).toBe(0.5);
    expect(fadeOpacity(12, 0, 100)).toBe(1);
    expect(fadeOpacity(50, 0, 100)).toBe(1);
    expect(fadeOpacity(94, 0, 100)).toBe(0.5);
    expect(fadeOpacity(100, 0, 100)).toBe(0);
  });

  test("an open end (Infinity) only fades in", () => {
    expect(fadeOpacity(500, 0, Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe("activeCaption and activeWordIndex", () => {
  const captions = [
    { startFrame: 10, endFrame: 40, words: [{ text: "Le", startFrame: 10, endFrame: 18 }, { text: "cœur", startFrame: 20, endFrame: 30 }] },
    { startFrame: 40, endFrame: 70, words: [{ text: "bat.", startFrame: 40, endFrame: 50 }] },
  ];

  test("returns the caption whose window holds the frame, or null", () => {
    expect(activeCaption(captions, 5)).toBeNull();
    expect(activeCaption(captions, 10)).toBe(captions[0]);
    expect(activeCaption(captions, 39)).toBe(captions[0]);
    expect(activeCaption(captions, 40)).toBe(captions[1]);
    expect(activeCaption(captions, 70)).toBeNull();
  });

  test("the spoken word stays lit through the short silence before the next one", () => {
    expect(activeWordIndex(captions[0]!, 12)).toBe(0);
    expect(activeWordIndex(captions[0]!, 19)).toBe(0);
    expect(activeWordIndex(captions[0]!, 25)).toBe(1);
    expect(activeWordIndex(captions[0]!, 35)).toBe(1);
  });

  test("no word is lit before the first one is spoken", () => {
    expect(activeWordIndex({ startFrame: 0, endFrame: 20, words: [{ text: "Le", startFrame: 5, endFrame: 9 }] }, 3)).toBe(-1);
  });

  test("a zero-length (unaligned) word is lit until the next word starts", () => {
    const caption = { startFrame: 5, endFrame: 20, words: [{ text: "12", startFrame: 5, endFrame: 5 }, { text: "fois", startFrame: 8, endFrame: 12 }] };
    expect(activeWordIndex(caption, 6)).toBe(0);
    expect(activeWordIndex(caption, 8)).toBe(1);
  });
});
