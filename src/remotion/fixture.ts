// Default props for Remotion Studio: the recorded fixture lesson (scripts/record-fixture.ts), with its
// real Pidgin narration and word timings, the scene images stored in the lessons bucket, and what
// SAM 3.1 found in them (scripts/record-sam-fixture.ts).

import highlightsJson from "../lib/video/fixtures/highlights.json";
import lessonJson from "../lib/video/fixtures/lesson.json";
import media from "../lib/video/fixtures/media.json";
import recording from "../lib/video/fixtures/words-pcm.json";
import { Lesson } from "../lib/lesson/schema";
import { SceneHighlights } from "../lib/video/highlights";
import { buildVideoProps } from "../lib/video/timeline";
import { TimedWord } from "../lib/video/words";

export const fixtureProps = buildVideoProps({
  lesson: Lesson.parse(lessonJson),
  language: "pcm",
  words: TimedWord.array().parse(recording.words),
  audioSeconds: recording.audioSeconds,
  audioUrl: media.audioUrl,
  sceneImageUrls: media.sceneImageUrls,
  highlights: SceneHighlights.array().parse(highlightsJson),
});
