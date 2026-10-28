// End-to-end check of the running site: sends the pages to POST /api/lessons the way the form does,
// polls the lesson every 2 s, prints each status change, then each step's time and cost and the
// video's size. Exits with 1 if the lesson fails, takes over 10 minutes, or the video is over 10 MB.
// Needs the site (pnpm dev) and the Trigger.dev dev worker (pnpm trigger:dev).
// Run: pnpm smoke <fr|pcm> <style> <page.jpg> [page.jpg ...]
//  or: pnpm smoke --follow <lesson id>   to follow a lesson already started

import { readFile } from "node:fs/promises";
import path from "node:path";

const SITE = process.env.SMOKE_URL ?? "http://localhost:3000";
const POLL_MS = 2000;
const TIMEOUT_MS = 10 * 60 * 1000;
const MAX_VIDEO_BYTES = 10 * 1024 * 1024;
// A restarting dev server drops a few requests: give up only after a minute without an answer.
const MAX_MISSED_POLLS = 30;

type LessonView = {
  status: string;
  error: string | null;
  title: string | null;
  style: string;
  sceneImageUrls: string[];
  videoUrl: string | null;
  metrics: Record<string, { seconds: number; costUsd: number }>;
};

function fail(message: string): never {
  console.error(`FAILED: ${message}`);
  process.exit(1);
}

async function create(): Promise<string> {
  const [language, style, ...pages] = process.argv.slice(2);
  if (!language || !style || pages.length === 0) fail("usage: pnpm smoke <fr|pcm> <style> <page.jpg> [page.jpg ...]");

  const form = new FormData();
  for (const page of pages) form.append("photos", new Blob([await readFile(page)], { type: "image/jpeg" }), path.basename(page));
  form.append("language", language);
  form.append("style", style);
  const res = await fetch(`${SITE}/api/lessons`, { method: "POST", body: form });
  const created = (await res.json()) as { id?: string; error?: string };
  if (res.status !== 201 || !created.id) fail(`POST /api/lessons answered ${res.status}: ${created.error}`);
  return created.id;
}

async function main() {
  const [flag, followed] = process.argv.slice(2);
  const id = flag === "--follow" && followed ? followed : await create();
  console.log(`lesson ${SITE}/lessons/${id}`);

  const start = Date.now();
  let status = "";
  let missed = 0;
  for (;;) {
    let lesson: LessonView;
    try {
      lesson = (await (await fetch(`${SITE}/api/lessons/${id}`)).json()) as LessonView;
      missed = 0;
    } catch (error) {
      if (++missed >= MAX_MISSED_POLLS) throw error;
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      continue;
    }
    const line = lesson.status === "drawing" ? `drawing (${lesson.sceneImageUrls.length} scenes)` : lesson.status;
    if (line !== status) {
      status = line;
      console.log(`${String(Math.round((Date.now() - start) / 1000)).padStart(4)} s  ${status}`);
    }
    if (lesson.status === "failed") fail(lesson.error ?? "the lesson failed");
    if (lesson.status === "done") {
      for (const [step, m] of Object.entries(lesson.metrics)) {
        console.log(`        ${step.padEnd(13)} ${m.seconds.toFixed(1).padStart(6)} s  $${m.costUsd.toFixed(4)}`);
      }
      const cost = Object.values(lesson.metrics).reduce((sum, m) => sum + m.costUsd, 0);
      console.log(`        "${lesson.title}", ${lesson.style} style, about $${cost.toFixed(3)}`);
      if (!lesson.videoUrl) fail("done without a video");
      const bytes = Number((await fetch(lesson.videoUrl, { method: "HEAD" })).headers.get("content-length"));
      console.log(`video ${lesson.videoUrl} (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
      if (!(bytes > 0 && bytes < MAX_VIDEO_BYTES)) fail(`the video weighs ${bytes} bytes, not between 0 and 10 MB`);
      return;
    }
    if (Date.now() - start > TIMEOUT_MS) fail("no video after 10 minutes");
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
