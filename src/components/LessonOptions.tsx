"use client";

// The choices every new lesson asks for, whatever its pages come from: the language of the voice and
// the picture style, each style shown by the same scene drawn in it.

import { Check } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import type { Language } from "@/lib/lesson/schema";
import { ArtStyle, AUTO_STYLE, STYLES, type StyleChoice } from "@/lib/lesson/styles";

const LANGUAGES: { value: Language; label: string; hint: string }[] = [
  { value: "fr", label: "French", hint: "Français" },
  { value: "pcm", label: "Pidgin", hint: "Kamtok" },
];

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
  style,
  onStyle,
  firstStep,
}: {
  language: Language;
  onLanguage(language: Language): void;
  style: StyleChoice;
  onStyle(style: StyleChoice): void;
  /** The number of the language step; the style step follows it. */
  firstStep: number;
}) {
  return (
    <>
      <Step n={firstStep} title="Video language" hint="The language the children speak at home.">
        <div role="radiogroup" aria-label="Video language" className="grid max-w-md grid-cols-2 gap-2 rounded-lg bg-panel p-1">
          {LANGUAGES.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-md py-2.5 text-center font-bold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-spoken ${language === option.value ? "bg-chalk text-board" : "text-dust hover:text-chalk"}`}
            >
              <input
                type="radio"
                name="language"
                value={option.value}
                checked={language === option.value}
                onChange={() => onLanguage(option.value)}
                className="sr-only"
              />
              {option.label}
              <span className="ml-1.5 text-sm font-semibold opacity-70">{option.hint}</span>
            </label>
          ))}
        </div>
      </Step>

      <Step n={firstStep + 1} title="Picture style" hint="Each picture shows the same scene drawn in that style.">
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
