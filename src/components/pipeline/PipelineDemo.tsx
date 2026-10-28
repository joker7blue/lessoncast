"use client";

// The pipeline graph playing a lesson on a loop, for the pages that explain LessonCast. With reduced
// motion it shows the finished graph.

import { useEffect, useState } from "react";
import type { NodeId, NodeState } from "@/lib/lessons/graph";
import { explainNodes } from "./nodes";
import { PipelineGraph } from "./PipelineGraph";

type States = Record<NodeId, NodeState>;

const W = "waiting" as const;
const R = "running" as const;
const D = "done" as const;

const PHASES: States[] = [
  { pages: D, spark: R, image: W, voice: W, sam: W, render: W, video: W },
  { pages: D, spark: D, image: R, voice: R, sam: W, render: W, video: W },
  { pages: D, spark: D, image: R, voice: D, sam: W, render: W, video: W },
  { pages: D, spark: D, image: D, voice: D, sam: R, render: W, video: W },
  { pages: D, spark: D, image: D, voice: D, sam: D, render: R, video: W },
  { pages: D, spark: D, image: D, voice: D, sam: D, render: D, video: D },
];

const PHASE_MS = 1800;

export function PipelineDemo() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = setTimeout(() => setPhase(PHASES.length - 1), 0);
      return () => clearTimeout(timer);
    }
    const timer = setInterval(() => setPhase((p) => (p + 1) % PHASES.length), PHASE_MS);
    return () => clearInterval(timer);
  }, []);
  return <PipelineGraph states={PHASES[phase]!} nodes={explainNodes()} />;
}
