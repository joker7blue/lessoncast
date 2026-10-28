// Runs one lesson through Trigger.dev without the web layer: stores the pages, creates the row,
// triggers generate-lesson, then prints each status change until the video is ready.
// Needs the dev worker running (pnpm trigger:dev).
// Run: pnpm exec tsx --env-file=.env scripts/run-lesson.ts <fr|pcm> <style> <page.jpg> [page.jpg ...]

import { readFile } from "node:fs/promises";
import { tasks } from "@trigger.dev/sdk";
import { Language } from "../lib/lesson/schema";
import { StyleChoice } from "../lib/lesson/styles";
import { createLesson, getLesson } from "../lib/lessons/repo";
import { MAX_PAGES } from "../lib/meta/lesson";
import { lessonPaths, publicUrl, uploadFile } from "../lib/supabase/storage";
import type { generateLesson } from "../trigger/generate-lesson";

const POLL_MS = 2000;
const TIMEOUT_MS = 10 * 60 * 1000;

async function main() {
  const [languageArg, styleArg, ...pages] = process.argv.slice(2);
  const language = Language.parse(languageArg);
  const style = StyleChoice.parse(styleArg);
  if (pages.length < 1 || pages.length > MAX_PAGES) throw new Error(`Give 1 to ${MAX_PAGES} page photos (JPEG)`);

  const row = await createLesson({ language, ipHash: null, pageCount: pages.length, style });
  await Promise.all(pages.map(async (file, i) => uploadFile(lessonPaths.page(row.id, i + 1), await readFile(file), "image/jpeg")));
  const handle = await tasks.trigger<typeof generateLesson>("generate-lesson", { lessonId: row.id }, { idempotencyKey: row.id });
  console.log(`lesson ${row.id}, run ${handle.id}`);

  const start = Date.now();
  let status = "";
  for (;;) {
    const lesson = await getLesson(row.id);
    if (!lesson) throw new Error("The lesson row disappeared");
    if (lesson.status !== status) {
      status = lesson.status;
      console.log(`${((Date.now() - start) / 1000).toFixed(0).padStart(4)} s  ${status}`);
    }
    if (status === "done" || status === "failed") {
      if (lesson.error) console.log(`error: ${lesson.error}`);
      for (const [step, m] of Object.entries(lesson.metrics)) console.log(`  ${step.padEnd(13)} ${m.seconds.toFixed(1).padStart(6)} s  $${m.costUsd.toFixed(4)}`);
      const total = Object.values(lesson.metrics).reduce((sum, m) => sum + m.costUsd, 0);
      console.log(`  total cost ≈ $${total.toFixed(3)}, style ${lesson.script?.style ?? "?"}`);
      if (lesson.videoPath) console.log(`video: ${publicUrl(lesson.videoPath)}`);
      process.exit(status === "done" ? 0 : 1);
    }
    if (Date.now() - start > TIMEOUT_MS) throw new Error("No result after 10 minutes");
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
