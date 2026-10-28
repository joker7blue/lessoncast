// Derisk test 3: SAM 3.1 finds the objects the lesson script names ("heart", "river") in
// the generated scene images, and turns each mask into an SVG path: the layer the video
// will animate and light up when the voice says the word.
//
//   pnpm derisk:3 [a|b]        (image set from test 2, default a)
//
// Reads out/01/lesson.json and out/02/<set>-scene-N.jpg; writes out/03/*.svg, index.html, metrics.json.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { decodeMaskToSVGPath, parseImageStream, recordsOfKind } from "@meta-sam/parser";
import type { ResponsesEvent } from "@meta-sam/parser";
import { OUT_DIR, PRICE, bytesToDataUrl, imageSize, mapLimit, postJson, readJson, sseEvents, stopwatch, usd, writeOut } from "./lib.mts";
import type { Lesson } from "./lesson-schema.mts";

const MODEL = "sam-3.1";
const set = process.argv[2] ?? "a";

type Job = { scene: number; prompt: string; word: string };
// The mask raster (maskSize) can be smaller than its box: it is stretched over `box` to land on the image.
type Match = {
  objectId: string;
  confidence: number | undefined;
  box: [number, number, number, number];
  maskSize: { width: number; height: number };
  svgPath: string;
};
type Outcome = Job & { seconds: number; matches: Match[]; error?: string; overlay?: string };

const lesson = await readJson<Lesson>(path.join(OUT_DIR, "01", "lesson.json"));
const jobs: Job[] = lesson.scenes.flatMap((scene, i) => scene.highlights.map((h) => ({ scene: i + 1, prompt: h.samPrompt, word: h.fr })));

async function segment(job: Job): Promise<Outcome> {
  const bytes = await readFile(path.join(OUT_DIR, "02", `${set}-scene-${job.scene}.jpg`));
  const { width, height } = imageSize(bytes);
  const imageUrl = bytesToDataUrl(bytes, "image/jpeg");
  const elapsed = stopwatch();
  try {
    const res = await postJson(
      "/responses",
      {
        model: MODEL,
        stream: true,
        metadata: { include_confidence: "true" },
        input: [
          {
            type: "message",
            role: "user",
            content: [
              { type: "input_text", text: job.prompt },
              { type: "input_image", image_url: imageUrl },
            ],
          },
        ],
      },
      "text/event-stream",
    );
    const result = await parseImageStream(sseEvents(res) as AsyncIterable<ResponsesEvent>).finalResult;
    const seconds = elapsed();
    const boxes = new Map(recordsOfKind(result.records, "box").map((b) => [b.objectId, b]));
    const matches: Match[] = recordsOfKind(result.records, "mask").map((m) => {
      return {
        objectId: m.objectId,
        confidence: m.confidence ?? boxes.get(m.objectId)?.confidence,
        box: [m.bounds.left, m.bounds.top, m.bounds.right, m.bounds.bottom],
        maskSize: { width: m.mask.width, height: m.mask.height },
        svgPath: decodeMaskToSVGPath(m.mask),
      };
    });
    const overlay = matches.length > 0 ? await writeOverlay(job, imageUrl, width, height, matches) : undefined;
    return { ...job, seconds, matches, overlay };
  } catch (error) {
    return { ...job, seconds: elapsed(), matches: [], error: String(error) };
  }
}

// One SVG per job: the scene, darkened, with the matched objects cut out on top and outlined,
// which is roughly how the video will highlight a word.
async function writeOverlay(job: Job, imageUrl: string, width: number, height: number, matches: Match[]): Promise<string> {
  const id = `s${job.scene}-${job.prompt.replace(/\W+/g, "-")}`;
  const paths = matches
    .map((m) => {
      const [left, top, right, bottom] = m.box;
      const scale = `${(right - left) / m.maskSize.width} ${(bottom - top) / m.maskSize.height}`;
      return `<path d="${m.svgPath}" transform="translate(${left} ${top}) scale(${scale})"/>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
<defs><clipPath id="${id}">${paths}</clipPath></defs>
<image href="${imageUrl}" width="${width}" height="${height}" opacity="0.35"/>
<image href="${imageUrl}" width="${width}" height="${height}" clip-path="url(#${id})"/>
<g fill="none" stroke="#ffd400" stroke-width="${Math.max(3, Math.round(width / 300))}">${paths}</g>
</svg>`;
  return writeOut("03", `${id}.svg`, svg);
}

const elapsed = stopwatch();
const outcomes = await mapLimit(jobs, 4, segment);
const wall = elapsed();

const found = outcomes.filter((o) => o.matches.length > 0);
const confidences = found.flatMap((o) => o.matches.map((m) => m.confidence ?? Number.NaN)).filter((c) => !Number.isNaN(c));
const metrics = {
  model: MODEL,
  imageSet: set,
  wallSeconds: wall,
  requests: outcomes.length,
  found: found.length,
  meanConfidence: confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : null,
  costUsd: outcomes.length * PRICE.samPerImage,
  outcomes: outcomes.map(({ matches, ...o }) => ({
    ...o,
    matches: matches.map(({ svgPath, ...m }) => ({ ...m, svgPathChars: svgPath.length })),
  })),
};
await writeOut("03", "metrics.json", JSON.stringify(metrics, null, 2));

const cards = outcomes
  .map((o) => {
    const status = o.error ? `error: ${o.error.slice(0, 200)}` : `${o.matches.length} match(es) · ${o.seconds}s · conf ${o.matches.map((m) => m.confidence?.toFixed(2)).join(", ") || "-"}`;
    const img = o.overlay ? `<img src="${path.basename(o.overlay)}">` : `<div class="none">not found</div>`;
    return `<figure>${img}<figcaption>Scene ${o.scene} · "${o.prompt}" (${o.word}) · ${status}</figcaption></figure>`;
  })
  .join("");
await writeOut(
  "03",
  "index.html",
  `<!doctype html><meta charset="utf-8"><title>SAM 3.1 highlight test</title>
<style>body{font:14px system-ui;margin:16px;background:#111;color:#eee}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}
figure{margin:0}img{width:100%;border-radius:6px}.none{aspect-ratio:16/9;display:grid;place-items:center;background:#300;border-radius:6px}figcaption{font-size:12px;opacity:.75}</style>
<h1>${lesson.title.fr} · image set ${set.toUpperCase()}</h1><main>${cards}</main>`,
);

for (const o of outcomes) {
  const conf = o.matches.map((m) => m.confidence?.toFixed(2)).join(", ");
  console.log(`scene ${o.scene} "${o.prompt}": ${o.error ? `ERROR ${o.error.slice(0, 200)}` : `${o.matches.length} match(es) [${conf}] in ${o.seconds}s`}`);
}
console.log(`${found.length}/${outcomes.length} objects found in ${wall}s wall, ${usd(metrics.costUsd)}. Open ${path.join(OUT_DIR, "03", "index.html")}`);
