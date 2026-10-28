// Derisk test 2: Muse Image draws every scene of the test 1 lesson. Does the style hold?
// Two strategies, compared side by side in out/02/contact-sheet.html:
//   A. one independent generation per scene, with the shared artStyle in the prompt;
//   B. scene 1 from A is passed as a reference image to /images/edits for the other scenes.
//
//   pnpm derisk:2
//
// Reads scripts/derisk/out/01/lesson.json; writes out/02/{a,b}-scene-N.jpg, contact-sheet.html, metrics.json.

import { copyFile, readFile } from "node:fs/promises";
import path from "node:path";
import { OUT_DIR, PRICE, bytesToDataUrl, imageSize, mapLimit, postJson, readJson, stopwatch, usd, writeOut } from "./lib.mts";
import type { Lesson } from "./lesson-schema.mts";

const MODEL = "muse-image-1.0";
// Sets the aspect ratio only (16:9); the API picks the exact pixel size.
const SIZE = "1280x720";

type ImageResponse = { data: { b64_json: string }[]; usage?: { total_tokens: number } };
type Shot = { file: string; seconds: number; width: number; height: number } | { error: string; seconds: number };

const lesson = await readJson<Lesson>(path.join(OUT_DIR, "01", "lesson.json"));

function scenePrompt(i: number): string {
  return `${lesson.artStyle}\n\nScene: ${lesson.scenes[i]?.imagePrompt}\n\nNo text, letters or numbers anywhere in the image.`;
}

async function save(name: string, res: Response, seconds: number): Promise<Shot> {
  const body = (await res.json()) as ImageResponse;
  const bytes = Buffer.from(body.data[0]?.b64_json ?? "", "base64");
  const file = await writeOut("02", name, bytes);
  return { file, seconds, ...imageSize(bytes) };
}

async function attempt(name: string, call: () => Promise<Response>): Promise<Shot> {
  const elapsed = stopwatch();
  try {
    return await save(name, await call(), elapsed());
  } catch (error) {
    return { error: String(error), seconds: elapsed() };
  }
}

const sceneIndexes = lesson.scenes.map((_, i) => i);

const elapsedA = stopwatch();
const shotsA = await mapLimit(sceneIndexes, 6, (i) =>
  attempt(`a-scene-${i + 1}.jpg`, () =>
    postJson("/images/generations", { model: MODEL, prompt: scenePrompt(i), size: SIZE, output_format: "jpeg" }),
  ),
);
const wallA = elapsedA();

const reference = shotsA[0];
let shotsB: Shot[] = [];
let wallB = 0;
if (reference && "file" in reference) {
  const referenceUrl = bytesToDataUrl(await readFile(reference.file), "image/jpeg");
  const elapsedB = stopwatch();
  const rest = await mapLimit(sceneIndexes.slice(1), 6, (i) =>
    attempt(`b-scene-${i + 1}.jpg`, () =>
      postJson("/images/edits", {
        model: MODEL,
        prompt: `Draw a new illustration in exactly the same art style, palette, line quality and character design as the reference image.\n\nNew scene: ${lesson.scenes[i]?.imagePrompt}\n\nNo text, letters or numbers anywhere in the image.`,
        images: [{ image_url: referenceUrl }],
        size: SIZE,
        output_format: "jpeg",
      }),
    ),
  );
  wallB = elapsedB();
  // Scene 1 of set B is the reference itself: save it under the B name too, for test 3.
  const referenceB = path.join(OUT_DIR, "02", "b-scene-1.jpg");
  await copyFile(reference.file, referenceB);
  shotsB = [{ ...reference, file: referenceB }, ...rest];
}

const ok = (shots: Shot[]) => shots.filter((s): s is Extract<Shot, { file: string }> => "file" in s);
const generated = ok(shotsA).length + Math.max(0, ok(shotsB).length - 1);

function row(label: string, shots: Shot[]): string {
  const cells = shots
    .map((s, i) =>
      "file" in s
        ? `<figure><img src="${path.basename(s.file)}"><figcaption>${i + 1} · ${s.seconds}s · ${s.width}×${s.height}</figcaption></figure>`
        : `<figure class="err"><figcaption>${i + 1} · ${s.error.slice(0, 160)}</figcaption></figure>`,
    )
    .join("");
  return `<h2>${label}</h2><div class="row">${cells}</div>`;
}

await writeOut(
  "02",
  "contact-sheet.html",
  `<!doctype html><meta charset="utf-8"><title>Muse Image style test</title>
<style>body{font:14px system-ui;margin:16px;background:#111;color:#eee}.row{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}
figure{margin:0}img{width:100%;border-radius:6px}.err{background:#400;padding:8px;border-radius:6px}figcaption{opacity:.7;font-size:12px}</style>
<h1>${lesson.title.fr}</h1><p>${lesson.artStyle}</p>
${row("A. Independent generations (shared style prompt)", shotsA)}
${row("B. Scene 1 as reference image (/images/edits)", shotsB)}`,
);

const metrics = {
  model: MODEL,
  size: SIZE,
  strategyA: { wallSeconds: wallA, shots: shotsA },
  strategyB: { wallSeconds: wallB, shots: shotsB },
  imagesGenerated: generated,
  costUsd: generated * PRICE.imagePerImage,
};
await writeOut("02", "metrics.json", JSON.stringify(metrics, null, 2));

const secs = (shots: Shot[]) => shots.map((s) => s.seconds).join(", ");
console.log(`A: ${ok(shotsA).length}/${shotsA.length} images in ${wallA}s wall (per image: ${secs(shotsA)})`);
console.log(`B: ${ok(shotsB).length}/${shotsB.length} images in ${wallB}s wall (per image: ${secs(shotsB)})`);
for (const s of [...shotsA, ...shotsB]) if ("error" in s) console.log(`error: ${s.error.slice(0, 300)}`);
console.log(`${generated} images billed, ${usd(metrics.costUsd)}. Open ${path.join(OUT_DIR, "02", "contact-sheet.html")}`);
