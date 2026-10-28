// The pipeline graph's state, from what a lesson row records: its status, the metrics each finished
// step wrote, and how many scenes are drawn. Pure, so the live page and the tests agree.

import type { LessonStatus, StepMetrics } from "./repo";

export type NodeId = "pages" | "spark" | "image" | "voice" | "render" | "video";
export type NodeState = "waiting" | "running" | "done" | "failed";

type GraphInput = { status: LessonStatus; metrics: Record<string, StepMetrics>; scenesDrawn: number };

export function nodeStates({ status, metrics, scenesDrawn }: GraphInput): Record<NodeId, NodeState> {
  const finished = (step: string) => step in metrics;
  const states: Record<NodeId, NodeState> = {
    pages: "done",
    spark: finished("write-script") ? "done" : status === "reading" ? "running" : "waiting",
    image: finished("draw-scenes") ? "done" : status === "drawing" ? "running" : "waiting",
    voice: finished("narrate") ? "done" : status === "drawing" ? "running" : "waiting",
    render: finished("render-video") || status === "done" ? "done" : status === "rendering" ? "running" : "waiting",
    video: status === "done" ? "done" : "waiting",
  };
  if (status !== "failed") return states;

  // The row only says "failed": the failed step is the first one that didn't finish. Muse Spark
  // finishes even when the page isn't a textbook, so nothing started after it means it failed there.
  const nothingAfterSpark = scenesDrawn === 0 && !finished("narrate") && !finished("draw-scenes");
  if (states.spark !== "done" || nothingAfterSpark) states.spark = "failed";
  else if (states.image !== "done" || states.voice !== "done") {
    if (states.image !== "done") states.image = "failed";
    if (states.voice !== "done") states.voice = "failed";
  } else if (states.render !== "done") states.render = "failed";
  return states;
}

/** Time spent in the models along the critical path: the script, the longer of scenes and voice, the render. */
export function modelSeconds(metrics: Record<string, StepMetrics>): number {
  const s = (step: string) => metrics[step]?.seconds ?? 0;
  return s("write-script") + Math.max(s("draw-scenes"), s("narrate")) + s("render-video");
}
