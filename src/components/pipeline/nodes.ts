// What each node of the pipeline graph says: the general role of each model, and for a live
// lesson, what that model produced and what it cost.

import { VERSION as REMOTION_VERSION } from "remotion/version";
import { formatSeconds } from "@/lib/format";
import { STYLES } from "@/lib/lesson/styles";
import { type NodeId, scenesDrawn } from "@/lib/lessons/graph";
import type { LessonView } from "@/lib/lessons/view";
import { LANGUAGES } from "@/lib/lesson/languages";
import { IMAGE_MODEL, SAM_MODEL, SPARK_MODEL } from "@/lib/meta/models";
import type { NodeContent } from "./PipelineGraph";

export function explainNodes(): Record<NodeId, NodeContent> {
  return {
    pages: { title: "Page photos", role: "One to four photos of a textbook lesson, taken with a phone." },
    spark: {
      title: "Muse Spark",
      model: SPARK_MODEL,
      role: "Reads the pages and writes the lesson in the language picked: the scenes, their narration, a quiz.",
    },
    image: { title: "Muse Image", model: IMAGE_MODEL, role: "Draws every scene in one style, with the same characters." },
    voice: { title: "MMS voice", model: "mms-tts + MMS_FA", role: "Speaks the lesson and times every word, on Modal." },
    sam: { title: "SAM 3.1", model: SAM_MODEL, role: "Cuts out each object the voice names, to light it up on cue." },
    render: { title: "Remotion on Modal", model: `remotion ${REMOTION_VERSION}`, role: "Edits scenes, voice and karaoke subtitles into a 480p video, on Modal." },
    video: { title: "WhatsApp video", role: "An MP4 under 10 MB that a parent can replay at night." },
  };
}

/** How many of the objects the script named SAM found, once it has run or the lesson has moved past it. */
function samOutput(lesson: LessonView): string | undefined {
  const sam = lesson.metrics["find-highlights"];
  if (sam?.found !== undefined && sam.requested !== undefined) return `${sam.found} of ${sam.requested} objects found`;
  return ["rendering", "done"].includes(lesson.status) ? "No objects lit" : undefined;
}

export function lessonNodes(lesson: LessonView): Record<NodeId, NodeContent> {
  const nodes = explainNodes();
  const m = lesson.metrics;
  const picked = lesson.style === "auto" ? null : STYLES[lesson.style].label;
  return {
    pages: lesson.book
      ? {
          title: "Textbook PDF",
          role: "One lesson of a book that Muse Spark split into lessons.",
          output: `Pages ${lesson.book.firstPage}–${lesson.book.lastPage}${lesson.book.title ? ` of ${lesson.book.title}` : ""}`,
        }
      : { ...nodes.pages, output: `${lesson.pageCount} ${lesson.pageCount === 1 ? "page" : "pages"} sent` },
    spark: {
      ...nodes.spark,
      output: lesson.title ? `“${lesson.title}”${picked ? `, drawn as ${picked.toLowerCase()}` : ""}` : undefined,
      metrics: m["write-script"],
    },
    image: {
      ...nodes.image,
      output: lesson.sceneCount ? `${scenesDrawn(lesson)} of ${lesson.sceneCount} scenes` : undefined,
      metrics: m["draw-scenes"],
    },
    voice: {
      ...nodes.voice,
      model: LANGUAGES[lesson.language].voice.replace("facebook/", ""),
      output: lesson.voice ? `${formatSeconds(lesson.voice.seconds)}, ${lesson.voice.words} words timed` : undefined,
      metrics: m.narrate,
    },
    sam: { ...nodes.sam, output: samOutput(lesson), metrics: m["find-highlights"] },
    render: { ...nodes.render, output: lesson.videoUrl ? "854 × 480 MP4" : undefined, metrics: m["render-video"] },
    video: { ...nodes.video, output: lesson.status === "done" ? "Ready to watch and send" : undefined },
  };
}
