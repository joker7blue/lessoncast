import { Clock, HardDrive, Languages, Wallet } from "lucide-react";
import { getImageProps } from "next/image";
import Image from "next/image";
import Link from "next/link";
import { HeroVideo } from "@/components/home/HeroVideo";
import { describeLesson, LessonCard } from "@/components/LessonCard";
import { PipelineDemo } from "@/components/pipeline/PipelineDemo";
import { LANGUAGE_CODES, LANGUAGES } from "@/lib/lesson/languages";
import { ArtStyle, STYLES } from "@/lib/lesson/styles";
import { heroLesson, textbookLessons } from "@/lib/lessons/examples";

const PRIMARY = "inline-flex items-center justify-center rounded-lg bg-spoken px-6 py-3.5 text-lg font-extrabold text-board";
const SECONDARY = "inline-flex items-center justify-center rounded-lg border border-line px-6 py-3.5 text-lg font-bold hover:bg-panel";
const LINK = "font-bold text-spoken underline underline-offset-4";

// The Meta models every lesson goes through, in pipeline order.
const MODELS = ["Muse Spark", "Muse Image", "MMS-TTS", "MMS alignment", "SAM 3.1"];

// Measured on the lessons made this week (How it works and the README give the details).
const FACTS = [
  { icon: Clock, text: "Two to five minutes from photo to video." },
  { icon: Wallet, text: "Five to eighteen cents of model calls per lesson." },
  { icon: HardDrive, text: "About two megabytes a minute: a three-minute lesson stays under ten." },
  { icon: Languages, text: "Eight languages today, from Hausa to Swahili; MMS speaks over a thousand." },
];

// What LessonCast needs to go from one teacher's phone to whole schools.
const NEXT = [
  {
    title: "Testing with teachers and parents",
    body: "First with teachers and parents in Cameroon, on their own textbooks and phones, to learn what makes a lesson worth replaying at home.",
  },
  {
    title: "Teacher accounts",
    body: "Each teacher keeps their books and lessons in one place, shares them with their classes, and can correct a script before its video is made.",
  },
  {
    title: "Subscriptions for schools and NGOs",
    body: "A lesson costs five to eighteen cents of model calls. A few free lessons for every teacher, then plans for schools, ministries and NGOs that pay for whole classes.",
  },
  {
    title: "More languages of home",
    body: "MMS speaks over a thousand languages: each new voice can join. Next come Ewondo, Duala and Basaa, which have no voice yet, and a voice note read by Omnilingual ASR in place of a photo.",
  },
  {
    title: "Ready for a whole country",
    body: "The voice on Modal GPUs, about six seconds of compute instead of a minute, more lessons made at once, and a lesson already made never made twice.",
  },
  {
    title: "Straight from WhatsApp",
    body: "A teacher sends a page to a WhatsApp number and gets the video back in the same chat, with no website to open.",
  },
];

export default async function Home() {
  const [hero, textbook] = await Promise.all([heroLesson(), textbookLessons()]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-8">
      <section className="grid items-center gap-10 py-12 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:py-20">
        <div>
          <h1 className="text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-5xl">
            A textbook or an ebook becomes video lessons in the language of home.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-dust">
            A teacher photographs a page, or uploads a whole textbook as a PDF that Muse Spark splits into lessons. A few
            minutes later, Meta&apos;s models have written, drawn and narrated a short lesson in the language of home, small
            enough to share in the parents&apos; WhatsApp group.
          </p>
          <ul aria-label="Meta models used" className="mt-7 flex flex-wrap gap-1.5">
            {MODELS.map((model) => (
              <li key={model} className="rounded-full border border-line bg-panel px-2.5 py-1 text-xs leading-none font-bold whitespace-nowrap text-chalk/90">
                {model}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-dust">The voice and the video run on Modal.</p>
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

      <section className="grid gap-10 border-t border-line py-16 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Science shouldn&apos;t stop at a language border</h2>
          <p className="mt-5 text-lg leading-relaxed text-dust">
            Across Africa, children learn science, history and geography in French, English, Portuguese or Spanish: languages
            many of them don&apos;t speak at home. The knowledge is in the textbook, and the language keeps it out of reach,
            while the language the child thinks in, and the culture it carries, stays outside the classroom.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-dust">
            LessonCast lifts that border. Meta&apos;s models, with partners like Modal that run them, turn the page a teacher
            already has into a lesson in the language of home, keeping the subject&apos;s own terms and explaining them.
            Education for all starts with a lesson a child understands.
          </p>
          <Link href="/why" className={`mt-6 inline-block ${LINK}`}>
            Why we built it
          </Link>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
          <p className="text-lg font-extrabold">Eight languages today</p>
          <ul className="mt-4 divide-y divide-line">
            {LANGUAGE_CODES.map((code) => (
              <li key={code} className="flex items-baseline justify-between gap-4 py-2.5">
                <span className="font-bold">
                  {LANGUAGES[code].label}
                  {LANGUAGES[code].native !== LANGUAGES[code].label && <span className="ml-2 font-normal text-dust">{LANGUAGES[code].native}</span>}
                </span>
                <span className="text-right text-sm text-dust">{LANGUAGES[code].where}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-dust">
            Each one is a language Muse Spark writes and an open MMS voice from Meta reads. MMS speaks over a thousand.
          </p>
        </div>
      </section>

      <section className="grid gap-10 border-t border-line py-16 lg:grid-cols-[1fr_27rem] lg:gap-14">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Five Meta models make every lesson</h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-dust">
            Muse Spark reads the pages and writes the lesson in the language picked. Muse Image draws each scene with the same
            characters. MMS, Meta&apos;s open speech models, reads the lesson aloud on Modal and times every word for the
            karaoke subtitles. SAM 3.1 cuts out each object the voice names, so it lights up as the word is said. Remotion, on
            Modal too, puts it all together into one small video, quiz included.
          </p>
          <ul className="mt-8 space-y-4">
            {FACTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-lg">
                <Icon aria-hidden className="mt-0.5 size-6 shrink-0 text-spoken" />
                {text}
              </li>
            ))}
          </ul>
          <Link href="/how-it-works" className={`mt-8 inline-block ${LINK}`}>
            Each model, step by step
          </Link>
        </div>
        <PipelineDemo />
      </section>

      {textbook.length > 0 && (
        <section className="border-t border-line py-16">
          <h2 className="text-3xl font-extrabold tracking-tight">One science textbook, {textbook.length === 8 ? "eight" : textbook.length} languages</h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-dust">
            A teacher uploaded a 39-page CM1 science textbook as a PDF. Muse Spark split it into eight lessons in 38 seconds,
            and each video below was made from one of them, in a different language. Open one to watch it and see how each
            model worked on it.
          </p>
          <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {textbook.map((lesson) => (
              <li key={lesson.id}>
                <LessonCard lesson={{ ...lesson, note: `${LANGUAGES[lesson.language].label}: ${lesson.source}.` }} />
              </li>
            ))}
          </ul>
        </section>
      )}

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

      <section className="border-t border-line py-16">
        <h2 className="text-3xl font-extrabold tracking-tight">What comes next</h2>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-dust">
          Today LessonCast serves one teacher with one phone. Next, it grows to serve whole schools.
        </p>
        <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {NEXT.map((step) => (
            <li key={step.title} className="border-l-4 border-spoken pl-5">
              <h3 className="text-lg font-extrabold">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-dust">{step.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-line py-16">
        <div className="grid items-center gap-8 rounded-2xl border border-line bg-panel p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-2xl leading-snug font-extrabold">Try it with a page, or a whole textbook.</p>
            <p className="mt-3 text-dust">No account, works on a phone, ready in a few minutes.</p>
            <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              <Link href="/how-it-works" className={LINK}>
                How it works
              </Link>
              <Link href="/why" className={LINK}>
                Why LessonCast
              </Link>
              <a href="https://github.com/joker7blue/lessoncast" className={LINK}>
                The code on GitHub
              </a>
            </p>
          </div>
          <Link href="/create" className={PRIMARY}>
            Create a lesson
          </Link>
        </div>
      </section>
    </main>
  );
}
