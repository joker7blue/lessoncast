// The lesson pipeline drawn as the graph it really is: the pages feed Muse Spark, whose script feeds
// Muse Image and the MMS voice in parallel, then SAM 3.1 cuts out the objects in the scenes, and all of
// it feeds the Remotion render. Each node shows the model and its exact version, what it is doing, and
// once done, its time and cost.

import { AudioLines, Camera, Check, Clapperboard, Image as ImageIcon, ScanSearch, Smartphone, Sparkles, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { formatSeconds, formatUsd } from "@/lib/format";
import type { NodeId, NodeState } from "@/lib/lessons/graph";
import type { StepMetrics } from "@/lib/lessons/repo";

export type NodeContent = {
  title: string;
  /** The exact model id or version the step runs. */
  model?: string;
  role: string;
  /** What the step produced, or is producing, for this lesson. */
  output?: string;
  metrics?: StepMetrics;
};

const ICONS: Record<NodeId, typeof Camera> = {
  pages: Camera,
  spark: Sparkles,
  image: ImageIcon,
  voice: AudioLines,
  sam: ScanSearch,
  render: Clapperboard,
  video: Smartphone,
};

const FRAME: Record<NodeState, string> = {
  waiting: "border-line opacity-55",
  running: "border-spoken shadow-[0_0_0_4px_rgb(255_212_0_/_0.12)]",
  done: "border-chalk/20",
  failed: "border-danger",
};

function StateLine({ state, metrics }: { state: NodeState; metrics?: StepMetrics }) {
  if (state === "running") {
    return (
      <p className="flex items-center gap-1.5 text-sm font-bold text-spoken">
        <span aria-hidden className="size-2 rounded-full bg-spoken motion-safe:animate-pulse" />
        Working
      </p>
    );
  }
  if (state === "done") {
    return (
      <p className="flex items-center gap-1 text-sm font-bold text-chalk/85">
        <Check aria-hidden className="size-4 shrink-0 text-spoken" strokeWidth={3} />
        {metrics ? `${formatSeconds(metrics.seconds)}, ${formatUsd(metrics.costUsd)}` : "Done"}
      </p>
    );
  }
  if (state === "failed") {
    return (
      <p className="flex items-center gap-1 text-sm font-bold text-danger">
        <TriangleAlert aria-hidden className="size-4 shrink-0" />
        Stopped
      </p>
    );
  }
  return <p className="text-sm text-dust">Waiting</p>;
}

function Node({ id, state, content }: { id: NodeId; state: NodeState; content: NodeContent }) {
  const Icon = ICONS[id];
  return (
    <div className={`rounded-xl border bg-panel p-3.5 transition-[border-color,box-shadow,opacity] duration-500 ${FRAME[state]}`}>
      <div className="flex items-center gap-2">
        <Icon aria-hidden className={`size-5 shrink-0 ${state === "running" ? "text-spoken" : "text-chalk/80"}`} />
        <p className="font-extrabold leading-tight">{content.title}</p>
      </div>
      {content.model && (
        <p className="mt-2 inline-block rounded-md bg-board px-2 py-0.5 text-sm font-bold break-all text-chalk/90">{content.model}</p>
      )}
      <p className="mt-2 text-sm leading-snug text-dust">{content.role}</p>
      {content.output && <p className="mt-1.5 text-sm leading-snug font-bold text-chalk">{content.output}</p>}
      <div className="mt-2.5 border-t border-line pt-2">
        <StateLine state={state} metrics={content.metrics} />
      </div>
    </div>
  );
}

type EdgeState = "idle" | "active" | "done";

function edgeInto(state: NodeState): EdgeState {
  return state === "running" ? "active" : state === "done" || state === "failed" ? "done" : "idle";
}

const EDGE_CLASS: Record<EdgeState, string> = { idle: "edge", active: "edge edge-active", done: "edge edge-done" };

/** One gap between two rows of the graph: straight, a fork into two columns, or a join back into one. */
function Edges({ shape, left, right = left }: { shape: "straight" | "fork" | "join"; left: EdgeState; right?: EdgeState }) {
  const paths =
    shape === "straight"
      ? [["M50 0 V28", left]]
      : shape === "fork"
        ? [
            ["M50 0 V10 H25 V28", left],
            ["M50 0 V10 H75 V28", right],
          ]
        : [
            ["M25 0 V18 H50 V28", left],
            ["M75 0 V18 H50 V28", right],
          ];
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden className="block h-7 w-full">
      {paths.map(([d, state]) => (
        <path key={d} d={d} className={EDGE_CLASS[state as EdgeState]} />
      ))}
    </svg>
  );
}

export function PipelineGraph({
  states,
  nodes,
  footer,
}: {
  states: Record<NodeId, NodeState>;
  nodes: Record<NodeId, NodeContent>;
  footer?: ReactNode;
}) {
  return (
    <figure aria-label="How this lesson is made">
      <Node id="pages" state={states.pages} content={nodes.pages} />
      <Edges shape="straight" left={edgeInto(states.spark)} />
      <Node id="spark" state={states.spark} content={nodes.spark} />
      <Edges shape="fork" left={edgeInto(states.image)} right={edgeInto(states.voice)} />
      <div className="grid grid-cols-2 gap-3">
        <Node id="image" state={states.image} content={nodes.image} />
        <Node id="voice" state={states.voice} content={nodes.voice} />
      </div>
      <Edges shape="join" left={edgeInto(states.sam)} />
      <Node id="sam" state={states.sam} content={nodes.sam} />
      <Edges shape="straight" left={edgeInto(states.render)} />
      <Node id="render" state={states.render} content={nodes.render} />
      <Edges shape="straight" left={edgeInto(states.video)} />
      <Node id="video" state={states.video} content={nodes.video} />
      {footer && <figcaption className="mt-4 text-sm text-dust">{footer}</figcaption>}
    </figure>
  );
}
