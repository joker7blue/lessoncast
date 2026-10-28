// Renders the LessonVideo composition inside the lessoncast-render image, then uploads the MP4.
// Usage: node modal/render.mjs <props.json> <uploadUrl>   (prints { bytes, renderSeconds } as JSON)
// The props are validated in TypeScript before they are sent, and again by the composition's schema.

import { readFile } from "node:fs/promises";
import { renderMedia, selectComposition } from "@remotion/renderer";

const SERVE_URL = "/app/build"; // the bundle built into the image
const OUTPUT = "/tmp/video.mp4";

const [propsFile, uploadUrl] = process.argv.slice(2);
if (!propsFile || !uploadUrl) throw new Error("usage: node modal/render.mjs <props.json> <uploadUrl>");

const inputProps = JSON.parse(await readFile(propsFile, "utf8"));
const composition = await selectComposition({ serveUrl: SERVE_URL, id: "LessonVideo", inputProps });

const start = performance.now();
await renderMedia({
  composition,
  serveUrl: SERVE_URL,
  inputProps,
  codec: "h264",
  outputLocation: OUTPUT,
  // Same settings as remotion.config.ts: 300 kbit/s keeps a 2.5-minute lesson near 6 MB (derisk test 6).
  videoBitrate: "300k",
  x264Preset: "slow",
  audioBitrate: "48k",
  concurrency: 8,
});
const renderSeconds = (performance.now() - start) / 1000;

const video = await readFile(OUTPUT);
const res = await fetch(uploadUrl, {
  method: "PUT",
  headers: { "Content-Type": "video/mp4", "x-upsert": "true" },
  body: video,
});
if (!res.ok) throw new Error(`MP4 upload failed: HTTP ${res.status} ${await res.text()}`);

console.log(JSON.stringify({ bytes: video.length, renderSeconds: Math.round(renderSeconds * 10) / 10 }));
