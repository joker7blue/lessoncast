import { expect, test, vi } from "vitest";
import { jpegSize, jpegSizeAt } from "../size";
import { jpegHeader } from "./jpeg.fixture";

test("jpegSize reads the frame size of a JPEG", () => {
  expect(jpegSize(jpegHeader(2048, 1152))).toEqual({ width: 2048, height: 1152 });
});

test("jpegSize throws on bytes that aren't a JPEG", () => {
  expect(() => jpegSize(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toThrow(/JPEG/);
});

test("jpegSizeAt reads the size from the start of the file only", async () => {
  const fetchFn = vi.fn<typeof fetch>(async () => new Response(jpegHeader(2048, 1152)));
  expect(await jpegSizeAt("https://x/scene.jpg", fetchFn)).toEqual({ width: 2048, height: 1152 });
  expect(fetchFn).toHaveBeenCalledOnce();
  expect(fetchFn.mock.calls[0]![1]).toMatchObject({ headers: { Range: "bytes=0-65535" } });
});

test("jpegSizeAt downloads the whole file when the frame header comes later", async () => {
  const full = jpegHeader(1280, 720);
  const fetchFn = vi.fn<typeof fetch>(async (_url, init) =>
    new Response((init?.headers as Record<string, string> | undefined)?.Range ? full.slice(0, 12) : full),
  );
  expect(await jpegSizeAt("https://x/scene.jpg", fetchFn)).toEqual({ width: 1280, height: 720 });
  expect(fetchFn).toHaveBeenCalledTimes(2);
});

test("jpegSizeAt throws on an HTTP error", async () => {
  const fetchFn = vi.fn<typeof fetch>(async () => new Response("missing", { status: 404 }));
  await expect(jpegSizeAt("https://x/scene.jpg", fetchFn)).rejects.toThrow(/404/);
});
