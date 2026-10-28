// Records the fixture lesson that Remotion Studio and the render check use: the derisk lesson
// (Muse Spark, test 1), its six scene images (Muse Image, test 2) and its Pidgin narration read and
// timed by the deployed voice. Media go to fixture/ in the lessons bucket; the JSON to lib/video/fixtures/.
// Run: pnpm exec tsx --env-file=.env scripts/record-fixture.ts

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { narrationGroups } from "../lib/lesson/narration";
import { Lesson } from "../lib/lesson/schema";
import { narrate } from "../lib/modal/client";
import { publicUrl, signedUploadUrl, uploadFile } from "../lib/supabase/storage";

const DERISK = path.resolve("scripts/derisk/out");
const FIXTURES = path.resolve("lib/video/fixtures");
// The derisk images show these characters; the derisk schema had a free-form artStyle instead.
const VISUAL_NOTES =
  "Cameroonian pupils in green school uniforms and their teacher, in a bright classroom and the green countryside around the school";

async function writeJson(name: string, value: unknown) {
  await writeFile(path.join(FIXTURES, name), `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const raw = JSON.parse(await readFile(path.join(DERISK, "01", "lesson.json"), "utf8"));
  delete raw.artStyle;
  const lesson = Lesson.parse({ ...raw, page: { ...raw.page, isTextbookPage: true }, style: "illustrated", visualNotes: VISUAL_NOTES });
  await mkdir(FIXTURES, { recursive: true });
  await writeJson("lesson.json", lesson);

  const scenePaths = lesson.scenes.map((_, i) => `fixture/scenes/${i + 1}.jpg`);
  await Promise.all(
    scenePaths.map(async (file, i) => uploadFile(file, await readFile(path.join(DERISK, "02", `b-scene-${i + 1}.jpg`)), "image/jpeg")),
  );

  const voicePath = "fixture/voice.wav";
  const { words, audioSeconds, seconds } = await narrate({
    groups: narrationGroups(lesson, "pcm"),
    language: "pcm",
    uploadUrl: await signedUploadUrl(voicePath),
  });
  await writeJson("words-pcm.json", { words, audioSeconds });
  await writeJson("media.json", { audioUrl: publicUrl(voicePath), sceneImageUrls: scenePaths.map(publicUrl) });
  console.log(`narrated ${audioSeconds} s of Pidgin in ${seconds.toFixed(1)} s, ${words.length} words`);

  for (const file of [voicePath, ...scenePaths]) {
    const res = await fetch(publicUrl(file), { method: "HEAD" });
    console.log(`${res.status} ${file}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
