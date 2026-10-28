// Default props for Remotion Studio: a 6-scene Pidgin lesson with voice-shaped timings, using the
// derisk images and narration served by the local "derisk-out" preview server (port 8765).
// The voice service task (Task 4) replaces them with a recorded lesson on Supabase Storage.

import { makeLesson } from "../lib/lesson/lesson.fixture";
import { narrationGroups } from "../lib/lesson/narration";
import { buildVideoProps } from "../lib/video/timeline";
import { timedWordsFor } from "../lib/video/words.fixture";

const MEDIA = "http://localhost:8765";
const lesson = makeLesson(6);
const { words, audioSeconds } = timedWordsFor(narrationGroups(lesson, "pcm"));

export const fixtureProps = buildVideoProps({
  lesson,
  language: "pcm",
  words,
  audioSeconds,
  audioUrl: `${MEDIA}/04/t4-pcm.wav`,
  sceneImageUrls: lesson.scenes.map((_, i) => `${MEDIA}/02/b-scene-${i + 1}.jpg`),
});
