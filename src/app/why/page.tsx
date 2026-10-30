import type { Metadata } from "next";
import Link from "next/link";
import { Mission } from "@/components/home/Mission";

export const metadata: Metadata = { title: "Why LessonCast" };

const POINTS = [
  {
    title: "Across Africa, school is taught in a language many children don't speak at home",
    body: "Cameroon teaches in French and English, Angola and Mozambique in Portuguese, Equatorial Guinea in Spanish. At home, families speak Pidgin, Hausa, Fulfulde or one of hundreds of other languages. A child who follows half of the lesson in class has no one to explain the page again in words they know.",
  },
  {
    title: "Knowledge in the language of home, with its culture kept",
    body: "Science, history and geography mostly reach children in an imported language. LessonCast explains the page in the language they think in, keeping the subject's own terms and explaining them, so a child can learn the science without leaving behind the language their family speaks, and the culture it carries.",
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
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:py-12">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Why LessonCast</h1>
      <p className="mt-3 max-w-3xl text-lg leading-relaxed text-dust">
        Education without borders: what school teaches in an imported language, explained in the language a child speaks at
        home. A printed page helps a child who reads the school language well. A short video in the language of home helps the
        others, and the parents who want to sit next to them.
      </p>

      <section className="mt-10 border-t border-line pt-10">
        <Mission />
      </section>

      <ul className="mt-12 grid gap-x-10 gap-y-8 border-t border-line pt-12 sm:grid-cols-2">
        {POINTS.map((point) => (
          <li key={point.title} className="border-l-4 border-spoken pl-5">
            <h2 className="text-xl font-extrabold">{point.title}</h2>
            <p className="mt-2 leading-relaxed text-dust">{point.body}</p>
          </li>
        ))}
      </ul>

      <section className="mt-14">
        <h2 className="text-2xl font-extrabold">Which languages, and why</h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-dust">
          Meta&apos;s MMS speech models cover over a thousand languages, 47 of them spoken in Cameroon. LessonCast narrates in
          French and English, Cameroon&apos;s official languages, and in six languages of home: Pidgin, read with the
          Nigerian Pidgin voice; Hausa and Fulfulde for northern Cameroon; Yoruba and Fon for Benin; Swahili for the DR
          Congo. Each one is a language Muse Spark can write and an MMS voice can read. Ewondo, Duala, Basaa, Bulu and
          Lingala have no voice yet: when one arrives, it is one more line in LessonCast&apos;s list of languages.
        </p>
      </section>

      <Link href="/create" className="mt-10 inline-flex rounded-lg bg-spoken px-6 py-3.5 text-lg font-extrabold text-board">
        Create a lesson
      </Link>
    </main>
  );
}
