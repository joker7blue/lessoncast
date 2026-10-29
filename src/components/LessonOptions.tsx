"use client";

// The choices every new lesson asks for, whatever its pages come from: the language of the voice, the
// video's length and the picture style, each style shown by the same scene drawn in it.

import { Check } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { LANGUAGE_CODES, LANGUAGES as LANGUAGE_INFO } from "@/lib/lesson/languages";
import { formatLength, LENGTHS, maxQuizQuestions, type VideoLength } from "@/lib/lesson/length";
import type { Language } from "@/lib/lesson/schema";
import { ArtStyle, AUTO_STYLE, STYLES, type StyleChoice } from "@/lib/lesson/styles";

const STYLE_CHOICES: { value: StyleChoice; label: string; description: string }[] = [
  { value: "auto", ...AUTO_STYLE },
  ...ArtStyle.options.map((value) => ({ value, label: STYLES[value].label, description: STYLES[value].description })),
];

/** One numbered step of the form: the order the teacher fills it in. */
export function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`} className="grid gap-x-4 sm:grid-cols-[2.25rem_1fr]">
      <span aria-hidden className="hidden size-9 place-items-center rounded-full bg-spoken font-extrabold text-board sm:grid">
        {n}
      </span>
      <div>
        <h2 id={`step-${n}`} className="text-xl font-extrabold sm:leading-9">
          {title}
        </h2>
        {hint && <p className="mt-1 text-dust">{hint}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </section>
  );
}

function StylePreview({ value }: { value: StyleChoice }) {
  const image = (style: ArtStyle, sizes: string) => (
    <Image key={style} src={`/styles/${style}.jpg`} alt="" width={480} height={270} sizes={sizes} className="size-full object-cover" />
  );
  // Automatic shows the four styles it picks from.
  if (value === "auto") {
    return <div className="grid aspect-video grid-cols-2 grid-rows-2">{ArtStyle.options.map((style) => image(style, "120px"))}</div>;
  }
  return <div className="aspect-video">{image(value, "(max-width: 640px) 50vw, 240px")}</div>;
}

export function LessonOptions({
  language,
  onLanguage,
  length,
  onLength,
  recommendedLength,
  quizQuestions,
  onQuizQuestions,
  style,
  onStyle,
  firstStep,
}: {
  language: Language;
  onLanguage(language: Language): void;
  length: VideoLength;
  onLength(length: VideoLength): void;
  /** The length that fits these pages, marked as recommended. */
  recommendedLength: VideoLength;
  quizQuestions: number;
  onQuizQuestions(questions: number): void;
  style: StyleChoice;
  onStyle(style: StyleChoice): void;
  /** The number of the language step; the length, quiz and style steps follow it. */
  firstStep: number;
}) {
  // A slower voice reads each question longer: fewer fit in the same length.
  const maxQuiz = maxQuizQuestions(length, LANGUAGE_INFO[language].wordsPerSecond);
  return (
    <>
      <Step n={firstStep} title="Video language" hint="The language the children speak at home. Each one has its own Meta MMS voice.">
        <div role="radiogroup" aria-label="Video language" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LANGUAGE_CODES.map((code) => {
            const info = LANGUAGE_INFO[code];
            const selected = language === code;
            return (
              <label
                key={code}
                className={`cursor-pointer rounded-lg border-2 px-3 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-spoken ${selected ? "border-spoken bg-panel" : "border-line hover:border-dust"}`}
              >
                <input type="radio" name="language" value={code} checked={selected} onChange={() => onLanguage(code)} className="sr-only" />
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-extrabold">{info.label}</span>
                  {info.native !== info.label && <span className="truncate text-sm font-semibold text-dust">{info.native}</span>}
                </span>
                <span className="block truncate text-xs text-dust">{info.where}</span>
              </label>
            );
          })}
        </div>
      </Step>

      <Step n={firstStep + 1} title="Video length" hint="Shorter videos have fewer scenes, and room for fewer quiz questions.">
        <div role="radiogroup" aria-label="Video length" className="flex flex-wrap gap-2">
          {LENGTHS.map((seconds) => {
            const selected = length === seconds;
            return (
              <label
                key={seconds}
                className={`cursor-pointer rounded-lg border-2 px-4 py-2 font-bold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-spoken ${selected ? "border-spoken bg-panel" : "border-line text-dust hover:border-dust hover:text-chalk"}`}
              >
                <input type="radio" name="length" value={seconds} checked={selected} onChange={() => onLength(seconds)} className="sr-only" />
                {formatLength(seconds)}
                {seconds === recommendedLength && <span className="ml-2 rounded bg-spoken px-1.5 py-0.5 text-xs font-extrabold text-board">Recommended</span>}
              </label>
            );
          })}
        </div>
      </Step>

      <Step n={firstStep + 2} title="Quiz at the end" hint="Questions the voice asks after the lesson, each with a countdown and the right answer.">
        {maxQuiz === 0 ? (
          <p className="text-dust">A video this short has no room for a quiz. Choose 1 minute or more.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-3 font-bold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-spoken">
              <input
                type="checkbox"
                checked={quizQuestions > 0}
                onChange={(e) => onQuizQuestions(e.target.checked ? Math.min(3, maxQuiz) : 0)}
                className="peer sr-only"
              />
              <span aria-hidden className="relative h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-spoken">
                <span className={`absolute top-0.5 size-5 rounded-full bg-chalk transition-[left] ${quizQuestions > 0 ? "left-[1.375rem]" : "left-0.5"}`} />
              </span>
              Add a quiz
            </label>
            {quizQuestions > 0 && (
              <div role="radiogroup" aria-label="Quiz questions" className="flex flex-wrap gap-2">
                {Array.from({ length: maxQuiz }, (_, i) => i + 1).map((n) => (
                  <label
                    key={n}
                    className={`cursor-pointer rounded-lg border-2 px-3 py-1.5 font-bold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-spoken ${quizQuestions === n ? "border-spoken bg-panel" : "border-line text-dust hover:border-dust hover:text-chalk"}`}
                  >
                    <input type="radio" name="quiz" value={n} checked={quizQuestions === n} onChange={() => onQuizQuestions(n)} className="sr-only" />
                    {n} {n === 1 ? "question" : "questions"}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </Step>

      <Step n={firstStep + 3} title="Picture style" hint="Each picture shows the same scene drawn in that style.">
        <div role="radiogroup" aria-label="Picture style" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {STYLE_CHOICES.map((option) => {
            const selected = style === option.value;
            return (
              <label
                key={option.value}
                className={`group relative cursor-pointer overflow-hidden rounded-xl border-2 bg-panel transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-spoken ${selected ? "border-spoken" : "border-line hover:border-dust"}`}
              >
                <input
                  type="radio"
                  name="style"
                  value={option.value}
                  checked={selected}
                  onChange={() => onStyle(option.value)}
                  className="sr-only"
                />
                <StylePreview value={option.value} />
                {selected && (
                  <span aria-hidden className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-spoken text-board">
                    <Check className="size-4" strokeWidth={3} />
                  </span>
                )}
                <span className="block px-3 pt-2.5 font-extrabold">{option.label}</span>
                <span className="block px-3 pt-0.5 pb-3 text-sm leading-snug text-dust">{option.description}</span>
              </label>
            );
          })}
        </div>
      </Step>
    </>
  );
}
