import { Clock, HardDrive, Languages, Wallet } from "lucide-react";
import { getImageProps } from "next/image";
import Image from "next/image";
import Link from "next/link";
import { HeroVideo } from "@/components/home/HeroVideo";
import { describeLesson, LessonCard } from "@/components/LessonCard";
import { PipelineDemo } from "@/components/pipeline/PipelineDemo";
import { ArtStyle, STYLES } from "@/lib/lesson/styles";
import { exampleLessons } from "@/lib/lessons/examples";

const PRIMARY = "inline-flex items-center justify-center rounded-lg bg-spoken px-6 py-3.5 text-lg font-extrabold text-board";
const SECONDARY = "inline-flex items-center justify-center rounded-lg border border-line px-6 py-3.5 text-lg font-bold hover:bg-panel";

// The Meta models every lesson goes through, in pipeline order.
const MODELS = ["Muse Spark", "Muse Image", "MMS-TTS", "MMS alignment", "SAM 3.1"];

const FACTS = [
  { icon: Clock, text: "About four minutes from photo to video." },
  { icon: Wallet, text: "About fifteen cents of model calls per lesson." },
  { icon: HardDrive, text: "Six megabytes for a lesson of two and a half minutes." },
  { icon: Languages, text: "Eight languages today, from Hausa to Swahili; MMS speaks over a thousand." },
];

export default async function Home() {
  const examples = await exampleLessons();
  const hero = examples[0];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-8">
      <section className="grid items-center gap-10 py-12 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:py-20">
        <div>
          <h1 className="text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-5xl">
            A textbook or an ebook becomes video lessons in the language of home.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-dust">
            A teacher photographs a page, or uploads a whole textbook as a PDF that Muse Spark splits into lessons. In
            about four minutes, Meta&apos;s models write, draw and narrate a short lesson in the language of home, small enough
            to share in the parents&apos; WhatsApp group.
          </p>
          <ul aria-label="Meta models used" className="mt-7 flex flex-wrap gap-1.5">
            {MODELS.map((model) => (
              <li key={model} className="rounded-full border border-line bg-panel px-2.5 py-1 text-xs leading-none font-bold whitespace-nowrap text-chalk/90">
                {model}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/create" className={PRIMARY}>
              Create a lesson
            </Link>
            <Link href="/how-it-works" className={SECONDARY}>
              See how it works
            </Link>
          </div>
        </div>
        {hero && (
          <figure>
            <HeroVideo
              src={hero.videoUrl}
              poster={getImageProps({ src: hero.posterUrl, alt: "", width: 640, height: 360 }).props.src}
            />
            <figcaption className="mt-3 text-sm text-dust">
              Made by LessonCast from {hero.source}. {describeLesson(hero.language, hero.style)}.
            </figcaption>
          </figure>
        )}
      </section>

      <section className="grid gap-10 border-t border-line py-16 lg:grid-cols-[1fr_27rem] lg:gap-14">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Five Meta models make every lesson</h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-dust">
            Muse Spark reads the photographed pages and writes the lesson. Muse Image draws each scene with the same
            characters. MMS, Meta&apos;s open speech models, reads the lesson aloud and times every word for the karaoke
            subtitles. SAM 3.1 cuts out each object the voice names, so it lights up as the word is said. Remotion puts it
            all together into one small video.
          </p>
          <ul className="mt-8 space-y-4">
            {FACTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-lg">
                <Icon aria-hidden className="mt-0.5 size-6 shrink-0 text-spoken" />
                {text}
              </li>
            ))}
          </ul>
          <Link href="/how-it-works" className="mt-8 inline-block font-bold text-spoken underline underline-offset-4">
            Each model, step by step
          </Link>
        </div>
        <PipelineDemo />
      </section>

      <section className="border-t border-line py-16">
        <h2 className="text-3xl font-extrabold tracking-tight">Four ways to draw a lesson</h2>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-dust">
          The same scene, drawn by Muse Image in each style. In Automatic, Muse Spark picks the style from the level and the
          subject it reads on the page.
        </p>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ArtStyle.options.map((style) => (
            <li key={style}>
              <Image
                src={`/styles/${style}.jpg`}
                alt={`A biology lesson scene drawn in the ${STYLES[style].label.toLowerCase()} style`}
                width={960}
                height={540}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
                className="aspect-video w-full rounded-xl border border-line object-cover"
              />
              <p className="mt-3 font-extrabold">{STYLES[style].label}</p>
              <p className="mt-1 text-sm leading-snug text-dust">{STYLES[style].description}</p>
            </li>
          ))}
        </ul>
      </section>

      {examples.length > 0 && (
        <section className="border-t border-line py-16">
          <h2 className="text-3xl font-extrabold tracking-tight">Lessons made with LessonCast</h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-dust">
            Each one came from a single photographed page. Open one to watch it and see how each model worked on it.
          </p>
          <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {examples.map((lesson) => (
              <li key={lesson.id}>
                <LessonCard lesson={{ ...lesson, note: `${describeLesson(lesson.language, lesson.style)}, from ${lesson.source}.` }} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-10 border-t border-line py-16 lg:grid-cols-2 lg:gap-14">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Why LessonCast</h2>
          <p className="mt-4 text-lg leading-relaxed text-dust">
            In Cameroon, children learn in French or English, while many of them speak another language at home. Classes are
            crowded and textbooks are shared. A short video in the language of home, replayed with a parent in the evening,
            helps where a printed page doesn&apos;t.
          </p>
          <Link href="/why" className="mt-6 inline-block font-bold text-spoken underline underline-offset-4">
            Read why we built it
          </Link>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-8">
          <p className="text-2xl leading-snug font-extrabold">Try it with a page, or a whole textbook.</p>
          <p className="mt-3 text-dust">No account, works on a phone, ready in about four minutes.</p>
          <Link href="/create" className={`mt-6 ${PRIMARY}`}>
            Create a lesson
          </Link>
        </div>
      </section>
    </main>
  );
}
