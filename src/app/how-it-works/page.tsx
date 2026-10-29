import type { Metadata } from "next";
import Link from "next/link";
import { VERSION as REMOTION_VERSION } from "remotion/version";
import { PipelineDemo } from "@/components/pipeline/PipelineDemo";
import { LANGUAGE_CODES, LANGUAGES } from "@/lib/lesson/languages";
import { ALIGNER_MODEL, IMAGE_MODEL, SAM_MODEL, SPARK_MODEL } from "@/lib/meta/models";

const LANGUAGE_NAMES = LANGUAGE_CODES.map((code) => LANGUAGES[code].label).join(", ");

export const metadata: Metadata = { title: "How it works · LessonCast" };

const STEPS = [
  {
    title: "Muse Spark reads the pages and writes the lesson",
    model: `${SPARK_MODEL}, Meta Model API`,
    body: "All the photos go into one request, in page order. Muse Spark checks that they are textbook pages, then answers with a lesson that must match a strict JSON schema: seven scenes with a narration in French and in Pidgin, an image prompt per scene, the objects each scene names, and a three-question quiz. In Automatic, it also picks the picture style from the level and the subject.",
  },
  {
    title: "Muse Image draws the scenes, all with the same characters",
    model: `${IMAGE_MODEL}, Meta Model API`,
    body: "Scene 1 is drawn from scratch with the style's fixed prompt and the lesson's recurring characters. Every other scene is an edit of scene 1, four at a time, so faces, uniforms and places stay the same from one scene to the next.",
  },
  {
    title: "MMS speaks the lesson and times every word",
    model: `facebook/mms-tts in ${LANGUAGE_CODES.length} languages, ${ALIGNER_MODEL}, open weights on Modal`,
    body: `Meta's Massively Multilingual Speech models run in our own container while the scenes are drawn. MMS-TTS reads each sentence in the language the teacher picked (${LANGUAGE_NAMES}), and MMS forced alignment finds when each word starts and ends, which gives the karaoke subtitles and the length of every scene.`,
  },
  {
    title: "SAM 3.1 cuts out the objects the voice names",
    model: `${SAM_MODEL}, Meta Model API`,
    body: "For every object a scene's narration names, such as the heart or the map, SAM 3.1 finds it in the drawing and returns its exact outline. The video then dims the rest of the scene and lifts that object, outlined in yellow, at the moment the voice says its name, so a child sees what the word means. An object SAM can't find is simply left out.",
  },
  {
    title: "Remotion edits the video",
    model: `Remotion ${REMOTION_VERSION}, on Modal`,
    body: "A title card, the scenes with a slow zoom and crossfades, the SAM cut-outs lit on their words, subtitles that light up the spoken word, and an end card that asks the child to replay the lesson with a parent. 854 × 480 at 300 kbit/s: about six megabytes for two and a half minutes.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:py-12">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">How it works</h1>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-dust">
        One photographed page goes through five Meta models. Trigger.dev runs each step as its own task, with retries, and
        draws the scenes while the voice records. Supabase keeps the lesson and its files.
      </p>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_27rem]">
        <ol className="space-y-10">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-spoken font-extrabold text-board">{i + 1}</span>
              <div>
                <h2 className="text-xl font-extrabold">{step.title}</h2>
                <p className="mt-2 inline-block rounded-md bg-panel px-2 py-0.5 text-sm font-bold text-chalk/90">{step.model}</p>
                <p className="mt-3 leading-relaxed text-dust">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="lg:sticky lg:top-8 lg:self-start">
          <PipelineDemo />
        </div>
      </div>

      <section className="mt-16 max-w-3xl">
        <h2 className="text-2xl font-extrabold">From a whole book</h2>
        <p className="mt-2 inline-block rounded-md bg-panel px-2 py-0.5 text-sm font-bold text-chalk/90">{SPARK_MODEL}, PDF input</p>
        <p className="mt-3 leading-relaxed text-dust">
          A teacher can also upload a textbook or an ebook as a PDF, typed or scanned, up to 50 MB and 400 pages. Muse
          Spark reads it in parts of thirty pages, the text and the page images, and lists its lessons with their pages
          and what each one teaches. Nothing more happens until the teacher picks a lesson: its pages are then cut out of
          the PDF, Muse Spark writes the lesson from them, and the five steps above make its video.
        </p>
      </section>

      <section className="mt-16 rounded-2xl border border-line bg-panel p-6 sm:p-8">
        <h2 className="text-xl font-extrabold">Measured on real lessons</h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-dust">
          A one-page lesson took about four minutes from upload to video, a little more when several were made at once, and about $0.15 in model calls: $0.05 for Muse Spark,
          $0.07 for seven Muse Image scenes, about three cents for SAM 3.1, about a cent each for the voice and the render on Modal. Every lesson page shows
          its own times and costs, step by step.
        </p>
        <Link href="/create" className="mt-6 inline-flex rounded-lg bg-spoken px-6 py-3 font-extrabold text-board">
          Create a lesson
        </Link>
      </section>
    </main>
  );
}
