import { describe, expect, test } from "vitest";
import { modelSeconds, nodeStates } from "../graph";

const m = (seconds: number) => ({ seconds, costUsd: 0.01 });

describe("nodeStates", () => {
  test("a queued lesson waits everywhere but its pages", () => {
    expect(nodeStates({ status: "queued", metrics: {}, scenesDrawn: 0 })).toEqual({
      pages: "done",
      spark: "waiting",
      image: "waiting",
      voice: "waiting",
      sam: "waiting",
      render: "waiting",
      video: "waiting",
    });
  });

  test("Muse Spark runs while the pages are read", () => {
    expect(nodeStates({ status: "reading", metrics: {}, scenesDrawn: 0 }).spark).toBe("running");
  });

  test("the scenes and the voice run side by side, each done on its own", () => {
    const states = nodeStates({ status: "drawing", metrics: { "write-script": m(40), narrate: m(51) }, scenesDrawn: 3 });
    expect([states.spark, states.image, states.voice, states.render]).toEqual(["done", "running", "done", "waiting"]);
  });

  test("a finished lesson is done everywhere", () => {
    const metrics = { "write-script": m(40), "draw-scenes": m(133), narrate: m(51), "find-highlights": m(25), "render-video": m(80) };
    expect(Object.values(nodeStates({ status: "done", metrics, scenesDrawn: 7 })).every((s) => s === "done")).toBe(true);
  });

  test("SAM runs while the lesson is highlighting", () => {
    const metrics = { "write-script": m(40), "draw-scenes": m(133), narrate: m(51) };
    expect(nodeStates({ status: "highlighting", metrics, scenesDrawn: 7 }).sam).toBe("running");
  });

  test("SAM is done once find-highlights recorded its metrics", () => {
    const metrics = { "write-script": m(40), "draw-scenes": m(133), narrate: m(51), "find-highlights": m(25) };
    expect(nodeStates({ status: "highlighting", metrics, scenesDrawn: 7 }).sam).toBe("done");
  });

  test("SAM is done once the lesson renders, even when it left no metrics", () => {
    const metrics = { "write-script": m(40), "draw-scenes": m(133), narrate: m(51) };
    const states = nodeStates({ status: "rendering", metrics, scenesDrawn: 7 });
    expect([states.sam, states.render]).toEqual(["done", "running"]);
  });

  test("a page that isn't a textbook fails at Muse Spark, not at the next steps", () => {
    const states = nodeStates({ status: "failed", metrics: { "write-script": m(30) }, scenesDrawn: 0 });
    expect([states.spark, states.image, states.voice]).toEqual(["failed", "waiting", "waiting"]);
  });

  test("a failed drawing fails Muse Image only", () => {
    const states = nodeStates({ status: "failed", metrics: { "write-script": m(40), narrate: m(51) }, scenesDrawn: 4 });
    expect([states.spark, states.image, states.voice, states.render]).toEqual(["done", "failed", "done", "waiting"]);
  });

  test("a failed render fails Remotion only", () => {
    const metrics = { "write-script": m(40), "draw-scenes": m(133), narrate: m(51), "find-highlights": m(25) };
    const states = nodeStates({ status: "failed", metrics, scenesDrawn: 7 });
    expect([states.sam, states.render]).toEqual(["done", "failed"]);
  });

  test("a lesson failed at render after SAM left no metrics keeps SAM done", () => {
    const metrics = { "write-script": m(40), "draw-scenes": m(133), narrate: m(51) };
    const states = nodeStates({ status: "failed", metrics, scenesDrawn: 7 });
    expect([states.image, states.voice, states.sam, states.render]).toEqual(["done", "done", "done", "failed"]);
  });
});

test("model time follows the critical path: script, the longer of scenes and voice, SAM, render", () => {
  const metrics = { "write-script": m(40.7), "draw-scenes": m(132.8), narrate: m(51.1), "find-highlights": m(24.5), "render-video": m(80.3) };
  expect(modelSeconds(metrics)).toBeCloseTo(278.3, 5);
  expect(modelSeconds({})).toBe(0);
});
