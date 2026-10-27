// Shared helpers for the derisk scripts.
// Run them with Node 23+ (built-in type stripping) and the project .env, e.g.
//   pnpm derisk:1 scripts/derisk/input/page.jpg

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const OUT_DIR = path.resolve(import.meta.dirname, "out");
export const API_BASE = process.env.META_API_BASE_URL ?? "https://api.meta.ai/v1";

// Standard-mode prices in USD, from https://dev.meta.ai/docs/pricing-rate-limits (26 Oct 2026).
export const PRICE = {
  sparkInputPerMTok: 1.25,
  sparkCachedInputPerMTok: 0.15,
  sparkOutputPerMTok: 4.25,
  imagePerImage: 0.01,
  samPerImage: 2.5 / 1000,
} as const;

export class ApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`HTTP ${status}: ${body.slice(0, 600)}`);
    this.status = status;
    this.body = body;
  }
}

function apiKey(): string {
  const key = process.env.MODEL_API_KEY;
  if (!key) throw new Error("MODEL_API_KEY is missing: paste it in .env");
  return key;
}

/** POST a JSON body to the Meta Model API. Throws ApiError on a non-2xx status. */
export async function postJson(pathname: string, body: unknown, accept = "application/json"): Promise<Response> {
  const res = await fetch(`${API_BASE}${pathname}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      Accept: accept,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res;
}

export type SseEvent = { readonly type: string } & Record<string, unknown>;

/** Yields the JSON payload of each server-sent event of a streaming response. */
export async function* sseEvents(res: Response): AsyncIterable<SseEvent> {
  if (!res.body) throw new Error("Streaming response has no body");
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = block
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (data && data !== "[DONE]") yield JSON.parse(data) as SseEvent;
    }
  }
}

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function fileToDataUrl(file: string): Promise<string> {
  const ext = path.extname(file).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) throw new Error(`Unsupported image type ${ext} (use .jpg, .png or .webp; HEIC is not accepted by the API)`);
  return bytesToDataUrl(await readFile(file), mime);
}

export function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}

/** Width and height of a PNG or JPEG file, read from its header. */
export function imageSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0) === 0x89504e47) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (view.getUint16(0) === 0xffd8) {
    let offset = 2;
    while (offset < bytes.length) {
      const marker = view.getUint16(offset);
      const length = view.getUint16(offset + 2);
      // SOF0..SOF15 except DHT (C4), JPG (C8) and DAC (CC) carry the frame size.
      if (marker >= 0xffc0 && marker <= 0xffcf && ![0xffc4, 0xffc8, 0xffcc].includes(marker)) {
        return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) };
      }
      offset += 2 + length;
    }
  }
  throw new Error("Not a PNG or JPEG file");
}

export async function writeOut(subdir: string, name: string, data: string | Uint8Array): Promise<string> {
  const dir = path.join(OUT_DIR, subdir);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, name);
  await writeFile(file, data);
  return file;
}

export async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

/** Starts a stopwatch; the returned function gives the elapsed seconds. */
export function stopwatch(): () => number {
  const start = performance.now();
  return () => Math.round(performance.now() - start) / 1000;
}

/** Runs `task` over `items` with at most `limit` in flight, keeping the input order. */
export async function mapLimit<T, R>(items: readonly T[], limit: number, task: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index] as T, index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export function usd(amount: number): string {
  return `$${amount.toFixed(4)}`;
}
