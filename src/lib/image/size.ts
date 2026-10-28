// The pixel size of a JPEG, read from its frame header, without decoding the image.

export function jpegSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 4 || view.getUint16(0) !== 0xffd8) throw new Error("Not a JPEG file");
  let offset = 2;
  while (offset + 9 <= bytes.length) {
    const marker = view.getUint16(offset);
    // SOF0 to SOF15 carry the frame size, except DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xffc0 && marker <= 0xffcf && ![0xffc4, 0xffc8, 0xffcc].includes(marker)) {
      return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) };
    }
    offset += 2 + view.getUint16(offset + 2);
  }
  throw new Error("JPEG file has no frame header");
}

// A JPEG's frame header comes right after its first segments, well inside the first 64 KB.
const HEAD_BYTES = 65_536;

async function download(url: string, fetchFn: typeof fetch, headers?: Record<string, string>): Promise<Uint8Array> {
  const res = await fetchFn(url, { headers, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Download of ${url} failed: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** The size of the JPEG at `url`, from the start of the file; the whole file only if its header comes later. */
export async function jpegSizeAt(url: string, fetchFn: typeof fetch = fetch): Promise<{ width: number; height: number }> {
  const head = await download(url, fetchFn, { Range: `bytes=0-${HEAD_BYTES - 1}` });
  try {
    return jpegSize(head);
  } catch {
    return jpegSize(await download(url, fetchFn));
  }
}
