// What the teacher is about to make, in one sentence above the button, so nothing generated comes as a
// surprise.

import { LANGUAGES } from "./languages";
import { lengthPlan, type VideoLength } from "./length";
import type { Language } from "./schema";
import { STYLES, type StyleChoice } from "./styles";

export function describeVideo({
  language,
  length,
  style,
  quizQuestions,
}: {
  language: Language;
  length: VideoLength;
  style: StyleChoice;
  quizQuestions: number;
}): string {
  const { scenes } = lengthPlan(length, undefined, quizQuestions);
  const drawn = style === "auto" ? "drawn in the style that fits the pages" : `drawn in the ${STYLES[style].label.toLowerCase()} style`;
  const quiz = quizQuestions === 0 ? "" : quizQuestions === 1 ? ", then a one-question quiz" : `, then a ${quizQuestions}-question quiz`;
  const about = length < 60 ? `About ${length} seconds` : `About ${length / 60} minute${length > 60 ? "s" : ""}`;
  return `${about}: ${scenes} scene${scenes > 1 ? "s" : ""} ${drawn}, narrated in ${LANGUAGES[language].label}${quiz}.`;
}
