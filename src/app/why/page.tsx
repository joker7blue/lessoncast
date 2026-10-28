import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Why LessonCast" };

const POINTS = [
  {
    title: "School is taught in a language many children don't speak at home",
    body: "Cameroon teaches in French and English. At home, many families speak one of the country's local languages or Cameroonian Pidgin English. A child who follows half of the lesson in class has no one to explain the page again in words they know.",
  },
  {
    title: "Classes are crowded and textbooks are shared",
    body: "When one book serves several pupils, the page goes home rarely, and a lesson heard once in a full classroom is easily lost. A short video can go home every time.",
  },
  {
    title: "Parents want to help, on the phone they already have",
    body: "Parents' WhatsApp groups are already where teachers share news. A two-minute lesson under ten megabytes fits there, and a parent can replay it with the child in the evening, even without reading the school language well.",
  },
  {
    title: "Mobile data is expensive",
    body: "Every choice in LessonCast keeps the video small: 480p, a low bitrate tuned for drawings, photos shrunk on the phone before they are sent. No account, no app to install.",
  },
];

export default function WhyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8 lg:py-12">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Why LessonCast</h1>
      <p className="mt-3 text-lg leading-relaxed text-dust">
        A printed page helps a child who reads the school language well. A short video in the language of home helps the
        others, and the parents who want to sit next to them.
      </p>

      <ul className="mt-10 space-y-8">
        {POINTS.map((point) => (
          <li key={point.title} className="border-l-4 border-spoken pl-5">
            <h2 className="text-xl font-extrabold">{point.title}</h2>
            <p className="mt-2 leading-relaxed text-dust">{point.body}</p>
          </li>
        ))}
      </ul>

      <section className="mt-14">
        <h2 className="text-2xl font-extrabold">Why Pidgin first</h2>
        <p className="mt-3 leading-relaxed text-dust">
          Meta&apos;s MMS speech models cover over a thousand languages, 47 of them spoken in Cameroon. The most widely spoken
          ones, such as Ewondo, Duala, Basaa, Bulu, Fulfulde and Cameroonian Pidgin, don&apos;t have a voice yet. LessonCast
          starts with French and Pidgin, read with the closest available voice, Nigerian Pidgin. The lesson script already
          holds every narration as text, so a new language only needs a new voice.
        </p>
      </section>

      <Link href="/create" className="mt-10 inline-flex rounded-lg bg-spoken px-6 py-3.5 text-lg font-extrabold text-board">
        Create a lesson
      </Link>
    </main>
  );
}
