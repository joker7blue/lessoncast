// Records what SAM 3.1 answers on the fixture lesson's scenes, for the tests and Remotion Studio.
//   stream: one raw SSE stream (scene 1, its first object) → src/lib/meta/__tests__/fixtures/sam-stream.txt ($0.0025)
// Run: pnpm exec tsx --env-file=.env scripts/record-sam-fixture.ts stream

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Lesson } from "../src/lib/lesson/schema";
import { postJson } from "../src/lib/meta/client";
import { samRequestBody } from "../src/lib/meta/sam";

const FIXTURES = path.resolve("src/lib/video/fixtures");

async function readFixture(name: string) {
  return JSON.parse(await readFile(path.join(FIXTURES, name), "utf8"));
}

async function download(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download of ${url} failed: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

const dataUrl = (bytes: Uint8Array) => `data:image/jpeg;base64,${Buffer.from(bytes).toString("base64")}`;

async function recordStream(lesson: Lesson, sceneUrls: string[]) {
  const prompt = lesson.scenes[0]!.highlights[0]!.samPrompt;
  const res = await postJson("/responses", samRequestBody(dataUrl(await download(sceneUrls[0]!)), prompt), {
    timeoutMs: 60_000,
    accept: "text/event-stream",
  });
  const out = path.resolve("src/lib/meta/__tests__/fixtures/sam-stream.txt");
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, await res.text());
  console.log(`Recorded SAM's stream for "${prompt}" on scene 1 to ${out}`);
}

async function main() {
  const mode = process.argv[2];
  const lesson = Lesson.parse(await readFixture("lesson.json"));
  const { sceneImageUrls } = (await readFixture("media.json")) as { sceneImageUrls: string[] };
  if (mode === "stream") return recordStream(lesson, sceneImageUrls);
  throw new Error("usage: record-sam-fixture.ts stream");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
