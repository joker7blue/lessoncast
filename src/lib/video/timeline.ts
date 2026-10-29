// Turns the lesson, the voice's word timings and the scene images into VideoProps. The parts tile the
// audio exactly: the title card until scene 1, each scene from 0.25 s before its first word to the
// next scene, the last scene until the quiz (or until 0.5 s after the voice ends), the quiz until then,
// then a 2 s end card. A SAM cut-out is lit when the voice says the phrase that names it, within its scene.

import { asQuestion, quizGroups, quizScript } from "../lesson/quiz";
import { type Language, type Lesson, say } from "../lesson/schema";
import type { SceneHighlights } from "./highlights";
import { findPhrase } from "./phrase";
import { FPS, type Motion, type VideoProps } from "./props";
import type { TimedWord } from "./words";

/** The end card of scripts from before Muse Spark wrote it in the lesson's language (videoText). */
export const END_CARD_TEXT: Partial<Record<Language, string>> = {
  fr: "Revois cette leçon ce soir avec tes parents",
  pcm: "Watch dis lesson again tonight with your papa and mama",
  en: "Watch this lesson again tonight with your parents",
};

const MOTIONS: Motion[] = ["zoom-in", "pan-left", "zoom-out", "pan-right"];
const SCENE_LEAD_SECONDS = 0.25;
const TAIL_SECONDS = 0.5;
const END_CARD_FRAMES = 2 * FPS;
const MAX_CAPTION_WORDS = 10;
const LIT_LEAD_SECONDS = 0.15;
const LIT_TAIL_SECONDS = 1.2;
const LIT_MIN_SECONDS = 2;
const LIT_MIN_FRAMES = Math.round(0.5 * FPS);

const toFrame = (seconds: number) => Math.max(0, Math.round(seconds * FPS));
// The voice service's silence after every sentence (modal/voice.py): the countdown starts after it.
const SENTENCE_PAUSE_SECONDS = 0.35;

const tokenCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** The quiz in frames, from the words of its groups: as many questions as the voice read (a shorter video
 * asks fewer). Null when the narration has no quiz (it predates it, or the video is too short for one) or
 * its words don't match the quiz's text, which would mistime every choice. */
function quizFor(lesson: Lesson, language: Language, wordsOf: (group: number) => TimedWord[], endFrame: number): VideoProps["quiz"] {
  const g = quizGroups(lesson.scenes.length);
  const intro = wordsOf(g.intro)[0];
  if (!intro) return null;
  const script = quizScript(lesson, language);
  const startFrame = toFrame(intro.start - SCENE_LEAD_SECONDS);
  const questions: NonNullable<VideoProps["quiz"]>["questions"] = [];
  for (const [q, spoken] of script.questions.entries()) {
    const words = wordsOf(g.question(q));
    if (words.length === 0) break; // the video asks no more questions
    const answer = wordsOf(g.answer(q))[0];
    const counts = spoken.pieces.map(tokenCount);
    if (!answer || words.length !== counts.reduce((a, b) => a + b, 0)) return null;
    // pieces: the lead, the question, then the three choices.
    const choiceStarts = [0, 1, 2].map((c) => counts.slice(0, 2 + c).reduce((a, b) => a + b, 0));
    const quiz = lesson.quiz[q]!;
    questions.push({
      number: q + 1,
      text: asQuestion(say(quiz.question, language), language),
      choices: quiz.choices.map((choice, c) => ({ text: say(choice, language), startFrame: toFrame(words[choiceStarts[c]!]!.start) })),
      answerIndex: quiz.answerIndex,
      startFrame: Math.max(toFrame(words[0]!.start - SCENE_LEAD_SECONDS), (questions.at(-1)?.startFrame ?? startFrame) + 1),
      endFrame: 0, // set below, from the next question
      countdownStartFrame: toFrame(words.at(-1)!.end + SENTENCE_PAUSE_SECONDS),
      revealFrame: toFrame(answer.start),
    });
  }
  if (questions.length === 0) return null;
  questions.forEach((question, i) => (question.endFrame = questions[i + 1]?.startFrame ?? endFrame));
  return { title: script.title, subtitle: script.subtitle, startFrame, endFrame, questions };
}

type Scene = VideoProps["scenes"][number];

/** The scene's lit highlights, and how long each word that names one stays lit. */
function overlayFor(
  found: SceneHighlights | undefined,
  words: TimedWord[],
  language: Language,
  scene: { startFrame: number; endFrame: number },
  litUntil: Map<TimedWord, number>,
): Scene["overlay"] {
  if (!found) return null;
  const highlights = found.objects.flatMap((object) => {
    const match = findPhrase(words, object[language] ?? "");
    if (!match) return [];
    const start = words[match.first]!.start - LIT_LEAD_SECONDS;
    const end = Math.max(words[match.last]!.end + LIT_TAIL_SECONDS, start + LIT_MIN_SECONDS);
    const startFrame = Math.max(toFrame(start), scene.startFrame);
    const endFrame = Math.min(toFrame(end), scene.endFrame);
    if (endFrame - startFrame < LIT_MIN_FRAMES) return [];
    for (const word of words.slice(match.first, match.last + 1)) litUntil.set(word, Math.max(litUntil.get(word) ?? 0, endFrame));
    return [{ startFrame, endFrame, shapes: object.shapes }];
  });
  return highlights.length > 0 ? { width: found.imageWidth, height: found.imageHeight, highlights } : null;
}

/** Splits one scene's words into captions: at sentence ends and every 10 words. */
function captionsFor(words: TimedWord[], sceneEndFrame: number, litUntil: Map<TimedWord, number>): VideoProps["captions"] {
  const chunks: TimedWord[][] = [];
  let current: TimedWord[] = [];
  for (const word of words) {
    current.push(word);
    if (/[.!?]$/.test(word.word) || current.length === MAX_CAPTION_WORDS) {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length > 0) chunks.push(current);

  return chunks.map((chunk, i) => ({
    startFrame: toFrame(chunk[0]!.start),
    endFrame: i + 1 < chunks.length ? toFrame(chunks[i + 1]![0]!.start) : sceneEndFrame,
    words: chunk.map((w) => {
      const lit = litUntil.get(w);
      return { text: w.word, startFrame: toFrame(w.start), endFrame: toFrame(Math.max(w.end, w.start)), ...(lit === undefined ? {} : { litUntilFrame: lit }) };
    }),
  }));
}

export function buildVideoProps(input: {
  lesson: Lesson;
  language: Language;
  words: TimedWord[];
  audioUrl: string;
  audioSeconds: number;
  sceneImageUrls: string[];
  /** What find-highlights stored, one entry per scene; null or missing renders without highlights. */
  highlights?: SceneHighlights[] | null;
}): VideoProps {
  const { lesson, language, words, audioUrl, audioSeconds, sceneImageUrls, highlights } = input;
  if (sceneImageUrls.length !== lesson.scenes.length) {
    throw new Error(`Expected ${lesson.scenes.length} scene images, got ${sceneImageUrls.length}`);
  }
  const wordsOf = (group: number) => words.filter((w) => w.group === group);

  // Scene i is narration group i + 1. Starts only move forward, at least one frame apart.
  const starts: number[] = [];
  lesson.scenes.forEach((_, i) => {
    const first = wordsOf(i + 1)[0];
    if (!first) throw new Error(`Scene ${i + 1} has no timed words`);
    starts.push(Math.max(toFrame(first.start - SCENE_LEAD_SECONDS), (starts[i - 1] ?? 0) + 1));
  });
  const voiceEnd = Math.max(toFrame(audioSeconds + TAIL_SECONDS), starts.at(-1)! + 1);
  const quiz = quizFor(lesson, language, wordsOf, voiceEnd);
  const scenesEnd = quiz ? Math.max(quiz.startFrame, starts.at(-1)! + 1) : voiceEnd;

  const litUntil = new Map<TimedWord, number>();
  const scenes = lesson.scenes.map((_, i) => {
    const window = { startFrame: starts[i]!, endFrame: starts[i + 1] ?? scenesEnd };
    const overlay = overlayFor(highlights?.[i], wordsOf(i + 1), language, window, litUntil);
    return { imageUrl: sceneImageUrls[i]!, motion: MOTIONS[i % MOTIONS.length]!, ...window, overlay };
  });
  const endCardText = lesson.videoText?.endCard ?? END_CARD_TEXT[language] ?? END_CARD_TEXT.en!;
  const endCard = { text: endCardText, startFrame: voiceEnd, endFrame: voiceEnd + END_CARD_FRAMES };

  return {
    language,
    durationInFrames: endCard.endFrame,
    audioUrl,
    title: {
      text: say(lesson.title, language),
      subject: lesson.page.subject,
      level: lesson.page.level,
      backgroundUrl: sceneImageUrls[0]!,
      startFrame: 0,
      endFrame: starts[0]!,
    },
    scenes,
    captions: scenes.flatMap((scene, i) => captionsFor(wordsOf(i + 1), scene.endFrame, litUntil)),
    quiz,
    endCard,
  };
}
