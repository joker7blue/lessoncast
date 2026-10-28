// What the voice reads, as ordered groups: the title, then one group per scene. The voice service
// times every word with its group, which gives the title card and scene boundaries in the video.

import type { Language, Lesson } from "./schema";

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function narrationGroups(lesson: Lesson, language: Language): string[][] {
  return [[lesson.title[language]], ...lesson.scenes.map((scene) => splitSentences(scene.narration[language]))];
}
