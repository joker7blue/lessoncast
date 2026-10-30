// Why LessonCast exists, said the same way on the home page and on Why LessonCast: knowledge kept out of reach by
// a language, and the eight languages LessonCast speaks today.

import { LANGUAGE_CODES, LANGUAGES } from "@/lib/lesson/languages";

export function Mission({ children }: { children?: React.ReactNode }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
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
        {children}
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
    </div>
  );
}
